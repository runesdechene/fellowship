// stripe-update-billing : persiste raison sociale + SIREN sur l'entité et, si un Customer
// Stripe existe déjà, synchronise son name + custom_field SIREN. Couvre l'édition hors
// checkout (abonnés existants qui se mettent en règle).
//
// Auth : verify_jwt = true côté config.toml → la gateway Supabase valide déjà le JWT.
// Authz : vérification côté DB via can_act_as(target_actor) (owner ou admin only).
// Spec : docs/superpowers/specs/2026-06-22-siren-facturation-design.md.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { getStripe } from '../_shared/stripe.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'
import { syncCustomerBilling } from '../_shared/billing.ts'
import { corsHeaders } from '../_shared/cors.ts'

interface Body { entityId: string; legalName: string; siren?: string | null; noSiren?: boolean }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  try {
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
    if (!body.entityId || !body.legalName?.trim()) return json({ error: 'invalid_body' }, 400)

    // Vérif owner via RPC Postgres. ⚠️ param target_actor (pas target_actor_id) — sinon PGRST202.
    const { data: canAct, error: canActErr } = await userClient
      .rpc('can_act_as', { target_actor: body.entityId })
    if (canActErr) {
      console.error('[update-billing] can_act_as error', canActErr)
      return json({ error: 'authz_failed' }, 500)
    }
    if (!canAct) return json({ error: 'forbidden' }, 403)

    const noSiren = body.noSiren === true
    const siren = noSiren ? null : ((body.siren ?? '').replace(/\D/g, '') || null)
    const legalName = body.legalName.trim()

    const admin = getSupabaseAdmin()
    const { data: entity, error: entityErr } = await admin
      .from('entities')
      .select('actor_id, stripe_customer_id')
      .eq('actor_id', body.entityId)
      .maybeSingle()
    if (entityErr || !entity) {
      console.error('[update-billing] entity lookup error', entityErr)
      return json({ error: 'entity_not_found' }, 404)
    }

    const { error: updErr } = await admin
      .from('entities')
      .update({ legal_name: legalName, siren, billing_no_siren: noSiren })
      .eq('actor_id', entity.actor_id)
    if (updErr) {
      console.error('[update-billing] entity update error', updErr)
      return json({ error: 'persist_failed' }, 500)
    }

    // Si un Customer Stripe existe déjà, on répercute immédiatement.
    if (entity.stripe_customer_id) {
      const stripe = getStripe()
      await syncCustomerBilling(stripe, entity.stripe_customer_id, { legalName, siren, noSiren })
    }

    return json({ ok: true })
  } catch (err) {
    console.error('[update-billing] internal error', err)
    return json({ error: 'internal_error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
