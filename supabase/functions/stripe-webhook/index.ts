// stripe-webhook : reçoit les events Stripe et synchronise entities.subscription_*
// + entities.plan. Trois gardes : signature Stripe vérifiée, idempotence via la
// table stripe_events_processed, retries autorisés (suppression du marker en cas
// d'erreur de handler pour permettre à Stripe de redélivrer).
//
// Auth : verify_jwt = false côté config.toml (la signature Stripe REMPLACE le JWT).
// Spec : docs/superpowers/specs/2026-05-28-stripe-mvp-design.md §3.2-3.5.

import type Stripe from 'npm:stripe@18.0.0'
import { getStripe } from '../_shared/stripe.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  // ── 1) Vérif signature ──────────────────────────────────────────────────
  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('Missing signature', { status: 400 })

  const rawBody = await req.text()
  let event: Stripe.Event
  try {
    event = await getStripe().webhooks.constructEventAsync(rawBody, signature, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[webhook] signature verification failed', err)
    return new Response('Invalid signature', { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // ── 2) Idempotence : INSERT ON CONFLICT DO NOTHING ──────────────────────
  const { data: inserted, error: insertErr } = await admin
    .from('stripe_events_processed')
    .insert({ event_id: event.id, event_type: event.type })
    .select('event_id')
    .maybeSingle()
  if (insertErr && insertErr.code !== '23505') { // 23505 = unique violation
    console.error('[webhook] idempotence insert error', insertErr)
    return new Response('DB error', { status: 500 })
  }
  if (!inserted) {
    console.log(`[webhook] event ${event.id} already processed, skipping`)
    return new Response('ok', { status: 200 })
  }

  // ── 3) Dispatch par type ────────────────────────────────────────────────
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      default:
        console.log(`[webhook] unhandled event type: ${event.type}`)
    }
    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error(`[webhook] handler error for ${event.type}`, err)
    // Supprime le marker d'idempotence pour autoriser Stripe à retry.
    await admin.from('stripe_events_processed').delete().eq('event_id', event.id)
    return new Response('handler error', { status: 500 })
  }
})

// ── Handlers ─────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const entityActorId = session.metadata?.entity_actor_id
  if (!entityActorId) {
    console.error('[webhook] checkout.session.completed without entity_actor_id metadata', session.id)
    return
  }
  if (!session.subscription) return // pas un abonnement, on ignore

  const sub = await getStripe().subscriptions.retrieve(session.subscription as string)
  await syncSubscriptionToDB(entityActorId, sub)
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const entityActorId = await lookupEntityIdFromSubscription(sub)
  if (!entityActorId) {
    console.error('[webhook] subscription.updated : entity not found', sub.id)
    return
  }
  await syncSubscriptionToDB(entityActorId, sub)
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const entityActorId = await lookupEntityIdFromSubscription(sub)
  if (!entityActorId) return
  await getSupabaseAdmin()
    .from('entities')
    .update({
      subscription_status: 'canceled',
      plan: 'free',
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      discount_end: null,
      discount_label: null,
    })
    .eq('actor_id', entityActorId)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return
  const sub = await getStripe().subscriptions.retrieve(invoice.subscription as string)
  const entityActorId = await lookupEntityIdFromSubscription(sub)
  if (!entityActorId) return
  // Garde plan='pro' pendant la grace period (Stripe retry auto pendant ~3 semaines).
  // Si après les retries Stripe abandonne, on recevra customer.subscription.deleted.
  await getSupabaseAdmin()
    .from('entities')
    .update({ subscription_status: 'past_due' })
    .eq('actor_id', entityActorId)
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return
  const sub = await getStripe().subscriptions.retrieve(invoice.subscription as string)
  const entityActorId = await lookupEntityIdFromSubscription(sub)
  if (!entityActorId) return
  await syncSubscriptionToDB(entityActorId, sub)
}

// ── Helpers ──────────────────────────────────────────────────────────────

async function lookupEntityIdFromSubscription(sub: Stripe.Subscription): Promise<string | null> {
  // 1) metadata posée à la création (le plus fiable).
  if (sub.metadata?.entity_actor_id) return sub.metadata.entity_actor_id

  // 2) fallback : lookup par stripe_subscription_id si déjà persisté.
  const admin = getSupabaseAdmin()
  const { data: bySub } = await admin
    .from('entities')
    .select('actor_id')
    .eq('stripe_subscription_id', sub.id)
    .maybeSingle()
  if (bySub) return bySub.actor_id

  // 3) fallback ultime : lookup par customer_id (cas d'un sub créé hors metadata).
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  const { data: byCustomer } = await admin
    .from('entities')
    .select('actor_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  return byCustomer?.actor_id ?? null
}

async function syncSubscriptionToDB(entityActorId: string, sub: Stripe.Subscription) {
  const status = sub.status
  // plan='pro' tant que la sub est active/trialing/past_due (grace), sinon 'free'.
  const plan = ['active', 'trialing', 'past_due'].includes(status) ? 'pro' : 'free'
  const interval = sub.items.data[0]?.price.recurring?.interval ?? null
  const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null
  const periodEnd = new Date(sub.current_period_end * 1000).toISOString()

  // Coupon/discount éventuel (programme Founder Friends, etc.). On lit `discounts`
  // (array, API moderne) en priorité, fallback sur `discount` (legacy singular).
  // Discount avec `end` → on a une vraie date de fin du coupon, à afficher en UI.
  type DiscountLike = { end?: number | null; coupon?: { name?: string | null; id?: string | null } | null } | null
  const discounts = (sub as unknown as { discounts?: DiscountLike[] }).discounts
  const legacyDiscount = (sub as unknown as { discount?: DiscountLike }).discount
  const activeDiscount: DiscountLike = (discounts && discounts[0]) || legacyDiscount || null
  const discountEnd = activeDiscount?.end ? new Date(activeDiscount.end * 1000).toISOString() : null
  const discountLabel = activeDiscount?.coupon?.name ?? activeDiscount?.coupon?.id ?? null

  const { error } = await getSupabaseAdmin()
    .from('entities')
    .update({
      stripe_subscription_id: sub.id,
      subscription_status: status,
      billing_interval: interval,
      trial_end: trialEnd,
      current_period_end: periodEnd,
      discount_end: discountEnd,
      discount_label: discountLabel,
      plan,
    })
    .eq('actor_id', entityActorId)
  if (error) throw error
}
