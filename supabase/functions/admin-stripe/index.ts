// admin-stripe : ce que la fiche d'une enseigne lit et pose chez Stripe (administration V2, lot 2).
// Auth : verify_jwt = true, puis is_admin() sur le jeton de l'appelant — sinon 403.
// Actions : paiements (factures du client et son e-mail), coupons (ceux qui existent chez Stripe),
// remise (applique un coupon à l'abonnement ; le webhook remplit ensuite discount_label).
// Spec : docs/superpowers/specs/2026-10-15-v2-admin-lot-2-comptes-design.md.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { getStripe } from '../_shared/stripe.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'

type Body =
  | { action: 'paiements'; entityId: string }
  | { action: 'coupons' }
  | { action: 'remise'; entityId: string; couponId: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: isAdmin } = await userClient.rpc('is_admin')
  if (isAdmin !== true) return json({ error: 'forbidden' }, 403)

  const body = (await req.json().catch(() => ({}))) as Body
  const stripe = getStripe()
  try {
    if (body.action === 'coupons') {
      const list = await stripe.coupons.list({ limit: 100 })
      return json({
        coupons: list.data.filter((c) => c.valid).map((c) => ({
          id: c.id, name: c.name ?? c.id, percentOff: c.percent_off, amountOff: c.amount_off,
          duration: c.duration, months: c.duration_in_months,
        })),
      })
    }

    const { data: entity, error } = await getSupabaseAdmin().from('entities')
      .select('stripe_customer_id, stripe_subscription_id').eq('actor_id', body.entityId).maybeSingle()
    if (error) throw error
    if (!entity) return json({ error: 'not_found' }, 404)

    if (body.action === 'paiements') {
      if (!entity.stripe_customer_id) return json({ customerEmail: null, invoices: [] })
      const [customer, invoices] = await Promise.all([
        stripe.customers.retrieve(entity.stripe_customer_id),
        stripe.invoices.list({ customer: entity.stripe_customer_id, limit: 24 }),
      ])
      return json({
        customerEmail: 'deleted' in customer ? null : customer.email,
        invoices: invoices.data.map((i) => ({
          id: i.id,
          date: new Date(i.created * 1000).toISOString(),
          amountCents: i.subtotal_excluding_tax ?? i.subtotal,
          label: i.lines.data[0]?.description ?? '',
          status: i.status,
          url: i.hosted_invoice_url,
        })),
      })
    }

    if (body.action === 'remise') {
      if (!entity.stripe_subscription_id) return json({ error: 'no_subscription' }, 409)
      await stripe.subscriptions.update(entity.stripe_subscription_id, { discounts: [{ coupon: body.couponId }] })
      return json({ done: true })
    }
    return json({ error: 'invalid_action' }, 400)
  } catch (err) {
    console.error('[admin-stripe]', err)
    return json({ error: 'failed' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
