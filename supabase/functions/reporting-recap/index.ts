// reporting-recap : l'aperçu du récap d'un mois (page Récap) — destinataire, date d'envoi, objet, texte et
// pièces jointes, fabriqués exactement comme l'e-mail du 11 (_shared/reporting-recap.ts). N'envoie rien.
// Auth : verify_jwt = true, puis can_act_as : les membres de l'enseigne.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { destinataireRecap, envoiDuRecap, preparerRecap } from '../_shared/reporting-recap.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'

const MOIS = /^\d{4}-(0[1-9]|1[0-2])$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ error: 'unauthorized' }, 401)

  const body = (await req.json().catch(() => null)) as { entite?: string; mois?: string } | null
  if (!body?.entite || !body.mois || !MOIS.test(body.mois)) return json({ error: 'invalid_body' }, 400)
  const { data: membre } = await userClient.rpc('can_act_as', { target_actor: body.entite })
  if (membre !== true) return json({ error: 'forbidden' }, 403)

  try {
    const { data: e, error } = await getSupabaseAdmin().from('reporting_entreprises')
      .select('entity_actor_id, environnement, alerte_email, recap_comptable, recap_comptable_email')
      .eq('entity_actor_id', body.entite).maybeSingle()
    if (error) throw error
    if (!e) return json({ error: 'not_found' }, 404)
    const recap = await preparerRecap(e.entity_actor_id, e.environnement, body.mois)
    return json({
      ...recap,
      sujet: e.environnement === 'production' ? recap.sujet : `[bac à sable] ${recap.sujet}`,
      destinataire: await destinataireRecap(e),
      envoiLe: envoiDuRecap(body.mois),
      actif: e.recap_comptable,
      environnement: e.environnement,
    })
  } catch (err) {
    console.error('[reporting-recap]', err)
    return json({ error: 'failed' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
