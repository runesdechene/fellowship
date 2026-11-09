// reporting-vente-pro : marquer une vente comme facturée à un pro (ou annuler), puis recalculer sa
// journée à partir des ventes qu'elle a gardées, sans relire les sources.
// Auth : verify_jwt = true, puis is_entity_owner : le propriétaire seul.
// Une journée partie ou en cours d'envoi ne bouge plus. Une journée validée perd sa validation :
// son contenu vient de changer.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { lireFacturees } from '../_shared/reporting-facturees.ts'
import { cleVente, journee, REECRIVABLES, ventesDuDetail } from '../_shared/reporting-ventes.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'

interface Body { journee: string; source: 'shopify' | 'sumup'; reference: string; facturee: boolean }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ error: 'unauthorized' }, 401)

  const body = (await req.json().catch(() => null)) as Body | null
  if (!body?.journee || !body.reference || !['shopify', 'sumup'].includes(body.source)) {
    return json({ error: 'invalid_body' }, 400)
  }

  const admin = getSupabaseAdmin()
  try {
    const { data: jour, error } = await admin.from('reporting_journees')
      .select('entity_actor_id, jour, statut, detail').eq('id', body.journee).maybeSingle()
    if (error) throw error
    if (!jour) return json({ error: 'not_found' }, 404)
    const { data: isOwner } = await userClient.rpc('is_entity_owner', { target_entity: jour.entity_actor_id })
    if (isOwner !== true) return json({ error: 'forbidden' }, 403)
    if (!REECRIVABLES.includes(jour.statut)) return json({ error: 'journee_figee' }, 409)

    const facturees = await lireFacturees(jour.entity_actor_id)
    const cle = cleVente(body.source, body.reference)
    if (body.facturee) facturees.add(cle)
    else facturees.delete(cle)

    // La journée d'abord, sous condition de statut : un envoi parti entre-temps gagne.
    const { jour: _jour, ...calcul } = journee(jour.jour, ventesDuDetail(jour.detail), facturees)
    const { data: ecrites, error: ecritureErreur } = await admin.from('reporting_journees')
      .update({ ...calcul, validee_par: null, validee_le: null, updated_at: new Date().toISOString() })
      .eq('id', body.journee).in('statut', REECRIVABLES).select('id')
    if (ecritureErreur) throw ecritureErreur
    if (ecrites.length === 0) return json({ error: 'journee_figee' }, 409)

    const marque = { entity_actor_id: jour.entity_actor_id, source: body.source, reference: body.reference }
    const { error: marqueErreur } = body.facturee
      ? await admin.from('reporting_ventes_pro').upsert({ ...marque, marquee_par: user.id })
      : await admin.from('reporting_ventes_pro').delete().match(marque)
    if (marqueErreur) throw marqueErreur
    return json({ ok: true })
  } catch (err) {
    console.error('[reporting-vente-pro]', err)
    return json({ error: 'failed' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
