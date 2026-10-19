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

  // Qui paie (administration V2) : écrit ici seulement, à part. Si le payeur a supprimé son compte
  // entre-temps, la clé étrangère refuse : on le journalise sans casser le reste du traitement.
  const paidByUser = session.metadata?.paid_by_user
  if (paidByUser) {
    const { error } = await getSupabaseAdmin()
      .from('entities')
      .update({ paid_by_user: paidByUser })
      .eq('actor_id', entityActorId)
    if (error) console.error('[webhook] paid_by_user not recorded', entityActorId, session.id, error)
  }

  // Raison sociale : collectée par Stripe au Checkout (customer_update[name]=auto). On la
  // recopie dans notre base pour garder entities.legal_name juste (la modale ne la demande
  // plus au checkout pour éviter la double saisie).
  const collectedName = session.customer_details?.name?.trim()
  if (collectedName) {
    await getSupabaseAdmin()
      .from('entities')
      .update({ legal_name: collectedName })
      .eq('actor_id', entityActorId)
  }

  // Cadeau filleul (essai 30j) consommé : on le verrouille pour ne pas le ré-octroyer
  // si le filleul résilie pendant l'essai puis se réabonne.
  await getSupabaseAdmin()
    .from('referrals')
    .update({ filleul_gift_granted: true })
    .eq('filleul_entity_id', entityActorId)
    .eq('status', 'attributed')
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
  if (await anotherSubscriptionRuns(entityActorId, sub.id)) return
  await getSupabaseAdmin()
    .from('entities')
    .update({
      subscription_status: 'canceled',
      plan: 'free',
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      discount_end: null,
      discount_label: null,
      cancel_at: null,
    })
    .eq('actor_id', entityActorId)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return
  const sub = await getStripe().subscriptions.retrieve(invoice.subscription as string)
  const entityActorId = await lookupEntityIdFromSubscription(sub)
  if (!entityActorId) return
  // L'état réel de l'abonnement, relu à l'instant, et non un « past_due » écrit d'office : au dernier
  // échec, Stripe envoie aussi customer.subscription.deleted, et l'ordre d'arrivée n'est pas garanti.
  // Pendant les relances, l'abonnement est past_due et garde le Pro.
  await syncSubscriptionToDB(entityActorId, sub)
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return
  const sub = await getStripe().subscriptions.retrieve(invoice.subscription as string)
  const entityActorId = await lookupEntityIdFromSubscription(sub)
  if (!entityActorId) return
  await syncSubscriptionToDB(entityActorId, sub)

  // Récompense parrain : déclenchée par la 1ʳᵉ facture RÉELLEMENT payée du filleul.
  await rewardReferrerIfAny(entityActorId, invoice)
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

const LIVE_STATUSES = ['active', 'trialing', 'past_due']

// Un ancien abonnement (résilié, impayé) ne remplace jamais celui qui court aujourd'hui : ses
// derniers événements arrivent parfois après le paiement d'un nouvel abonnement.
async function anotherSubscriptionRuns(entityActorId: string, subId: string): Promise<boolean> {
  const { data } = await getSupabaseAdmin()
    .from('entities')
    .select('stripe_subscription_id, subscription_status')
    .eq('actor_id', entityActorId)
    .maybeSingle()
  return Boolean(
    data?.stripe_subscription_id &&
      data.stripe_subscription_id !== subId &&
      LIVE_STATUSES.includes(data.subscription_status ?? ''),
  )
}

async function syncSubscriptionToDB(entityActorId: string, sub: Stripe.Subscription) {
  const status = sub.status
  if (!LIVE_STATUSES.includes(status) && (await anotherSubscriptionRuns(entityActorId, sub.id))) return
  // plan='pro' tant que la sub est active/trialing/past_due (grace), sinon 'free'.
  const plan = LIVE_STATUSES.includes(status) ? 'pro' : 'free'
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
  // Résiliation programmée dans l'espace Stripe : le Pro court jusqu'à cette date, puis s'arrête.
  const cancelAt = sub.cancel_at
    ? new Date(sub.cancel_at * 1000).toISOString()
    : sub.cancel_at_period_end ? periodEnd : null

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
      cancel_at: cancelAt,
      plan,
    })
    .eq('actor_id', entityActorId)
  if (error) throw error
}

// Récompense le parrain quand CE filleul paie sa 1ʳᵉ vraie facture (anti-fraude).
// Claim-first (transition attributed→rewarded atomique) → idempotent, jamais de double crédit.
async function rewardReferrerIfAny(filleulEntityId: string, invoice: Stripe.Invoice) {
  // amount_paid > 0 : ignore les factures à 0 (l'essai ne génère pas de paiement réel).
  if ((invoice.amount_paid ?? 0) <= 0) return
  const admin = getSupabaseAdmin()

  // Parrainage en attente où cette entité est le filleul ?
  const { data: ref } = await admin
    .from('referrals')
    .select('id, parrain_entity_id')
    .eq('filleul_entity_id', filleulEntityId)
    .eq('status', 'attributed')
    .maybeSingle()
  if (!ref) return

  // Claim atomique : on ne récompense que si on fait nous-mêmes la transition.
  const now = new Date().toISOString()
  const { data: claimed } = await admin
    .from('referrals')
    .update({ status: 'rewarded', filleul_first_paid_at: now, parrain_rewarded_at: now })
    .eq('id', ref.id)
    .eq('status', 'attributed')
    .select('id')
    .maybeSingle()
  if (!claimed) return // déjà récompensé par un autre passage

  // Charge le parrain (entité).
  const { data: parrain } = await admin
    .from('entities')
    .select('actor_id, plan, stripe_customer_id, stripe_subscription_id, comped_pro_until')
    .eq('actor_id', ref.parrain_entity_id)
    .maybeSingle()
  if (!parrain) return

  const parrainIsPro = parrain.plan === 'pro' && !!parrain.stripe_subscription_id
  if (parrainIsPro) {
    // Parrain Pro → crédit d'un mois de son plan sur son customer balance (négatif = crédit).
    const sub = await getStripe().subscriptions.retrieve(parrain.stripe_subscription_id as string)
    const price = sub.items.data[0]?.price
    const unit = price?.unit_amount ?? 0
    const interval = price?.recurring?.interval ?? 'month'
    // monthlyCreditCents (cf. src/lib/referral.ts, dupliqué ici : edge runtime isolé).
    const creditCents = unit <= 0 ? 0 : (interval === 'year' ? Math.round(unit / 12) : unit)
    if (creditCents > 0 && parrain.stripe_customer_id) {
      await getStripe().customers.createBalanceTransaction(parrain.stripe_customer_id, {
        amount: -creditCents,
        currency: price?.currency ?? 'eur',
        description: 'Parrainage Fellowship — 1 mois offert',
      })
    }
  } else {
    // Parrain gratuit → 1 mois de Pro offert (hors Stripe) via comped_pro_until.
    const base = parrain.comped_pro_until && new Date(parrain.comped_pro_until) > new Date()
      ? new Date(parrain.comped_pro_until)
      : new Date()
    base.setMonth(base.getMonth() + 1)
    await admin.from('entities')
      .update({ comped_pro_until: base.toISOString() })
      .eq('actor_id', parrain.actor_id)
  }

  // Badge Ambassadeur permanent (1er filleul payant).
  await admin.from('entities')
    .update({ is_ambassador: true })
    .eq('actor_id', parrain.actor_id)
}
