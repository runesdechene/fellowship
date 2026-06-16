// stripe-checkout-session : crée une session Stripe Checkout pour souscrire au plan Pro
// d'une entité, avec trial 14j (30j si filleul parrainé) et Stripe Tax. Retourne l'URL Checkout à laquelle
// rediriger l'utilisateur.
//
// Auth : verify_jwt = true côté config.toml → la gateway Supabase valide déjà le JWT.
// Authz : vérification côté DB via can_act_as(entity_actor_id) (owner ou admin only).
// Spec : docs/superpowers/specs/2026-05-28-stripe-mvp-design.md §3.2.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { getStripe } from '../_shared/stripe.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'
import { corsHeaders } from '../_shared/cors.ts'

const STRIPE_PRICE_MONTHLY = Deno.env.get('STRIPE_PRICE_MONTHLY')!
const STRIPE_PRICE_YEARLY = Deno.env.get('STRIPE_PRICE_YEARLY')!

interface Body {
  entityId: string
  billingInterval: 'month' | 'year'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  try {
    // App URL pour les redirects : on prend l'Origin de la requête (= URL d'où vient
    // le clic, marche en local et en prod sans secret). Fallback hardcodé sinon.
    const origin = req.headers.get('Origin') ?? req.headers.get('Referer')?.replace(/\/$/, '') ?? 'https://flwsh.netlify.app'
    const appUrl = origin.replace(/\/$/, '')

    // User context via JWT (verify_jwt déjà passé par la gateway).
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'unauthorized' }, 401)

    const body = (await req.json()) as Body
    if (!body.entityId || !['month', 'year'].includes(body.billingInterval)) {
      return json({ error: 'invalid_body' }, 400)
    }

    // Vérif owner via RPC Postgres (utilise auth.uid() de la session courante).
    // ⚠️ Le param SQL s'appelle target_actor (pas target_actor_id) — sinon PGRST202.
    const { data: canAct, error: canActErr } = await userClient
      .rpc('can_act_as', { target_actor: body.entityId })
    if (canActErr) {
      console.error('[checkout-session] can_act_as error', canActErr)
      return json({ error: 'authz_failed' }, 500)
    }
    if (!canAct) return json({ error: 'forbidden' }, 403)

    // Lecture entité via admin (bypass RLS pour lire stripe_customer_id même si plan='free').
    const admin = getSupabaseAdmin()
    const { data: entity, error: entityErr } = await admin
      .from('entities')
      .select('actor_id, stripe_customer_id, brand_name, subscription_status')
      .eq('actor_id', body.entityId)
      .maybeSingle()
    if (entityErr || !entity) {
      console.error('[checkout-session] entity lookup error', entityErr)
      return json({ error: 'entity_not_found' }, 404)
    }

    // Si déjà un sub actif/trialing/past_due, on signale au client de rediriger
    // vers le portail. 200 (pas 409) pour que supabase.functions.invoke laisse
    // passer le body au lieu de throw une FunctionsHttpError.
    if (entity.subscription_status && ['active', 'trialing', 'past_due'].includes(entity.subscription_status)) {
      return json({ portal: true, reason: 'already_subscribed' }, 200)
    }

    const stripe = getStripe()

    // Récupère ou crée le Customer Stripe pour cette entité.
    let customerId = entity.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: entity.brand_name ?? undefined,
        metadata: { entity_actor_id: entity.actor_id },
      })
      customerId = customer.id
      await admin
        .from('entities')
        .update({ stripe_customer_id: customerId })
        .eq('actor_id', entity.actor_id)
    }

    // Parrainage : le filleul parrainé (rattachement en attente, cadeau non encore consommé)
    // bénéficie d'un essai de 30 jours au lieu de 14. Pas de coupon (qui buggerait sur l'annuel).
    const { data: pendingRef } = await admin
      .from('referrals')
      .select('id')
      .eq('filleul_entity_id', entity.actor_id)
      .eq('status', 'attributed')
      .eq('filleul_gift_granted', false)
      .maybeSingle()
    const trialDays = pendingRef ? 30 : 14

    const price = body.billingInterval === 'month' ? STRIPE_PRICE_MONTHLY : STRIPE_PRICE_YEARLY

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      subscription_data: {
        trial_period_days: trialDays,
        metadata: { entity_actor_id: entity.actor_id },
      },
      automatic_tax: { enabled: true },
      customer_update: { name: 'auto', address: 'auto' },
      tax_id_collection: { enabled: true },
      // Programme Founder Friends (v0.7.174) : autorise la saisie d'un code promo
      // au Checkout (ex: RUNE-2026 = 100% off pendant 2 mois). CB requise quand même.
      allow_promotion_codes: true,
      success_url: `${appUrl}/abonnement?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/boutique?status=cancel`,
      metadata: { entity_actor_id: entity.actor_id },
    })

    return json({ url: session.url })
  } catch (err) {
    console.error('[checkout-session] internal error', err)
    return json({ error: 'internal_error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
