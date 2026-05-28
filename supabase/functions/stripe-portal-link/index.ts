// stripe-portal-link : génère une session Stripe Customer Portal pour qu'un owner
// d'entité gère son abonnement (factures, CB, annulation, changement de plan).
//
// Auth : verify_jwt = true. Authz : can_act_as(entityId).
// Spec : docs/superpowers/specs/2026-05-28-stripe-mvp-design.md §3.2.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { getStripe } from '../_shared/stripe.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'
import { corsHeaders } from '../_shared/cors.ts'

interface Body { entityId: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  try {
    const origin = req.headers.get('Origin') ?? req.headers.get('Referer')?.replace(/\/$/, '') ?? 'https://flwsh.netlify.app'
    const appUrl = origin.replace(/\/$/, '')

    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'unauthorized' }, 401)

    const body = (await req.json()) as Body
    if (!body.entityId) return json({ error: 'invalid_body' }, 400)

    const { data: canAct, error: canActErr } = await userClient
      .rpc('can_act_as', { target_actor_id: body.entityId })
    if (canActErr) return json({ error: 'authz_failed' }, 500)
    if (!canAct) return json({ error: 'forbidden' }, 403)

    const { data: entity } = await getSupabaseAdmin()
      .from('entities')
      .select('stripe_customer_id')
      .eq('actor_id', body.entityId)
      .maybeSingle()
    if (!entity?.stripe_customer_id) {
      return json({ error: 'no_customer', message: 'Aucun abonnement à gérer pour cette entité.' }, 404)
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: entity.stripe_customer_id,
      return_url: `${appUrl}/abonnement`,
    })

    return json({ url: session.url })
  } catch (err) {
    console.error('[portal-link] internal error', err)
    return json({ error: 'internal_error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
