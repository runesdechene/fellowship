// reporting-suivi : ce que l'administration a répondu sur les déclarations d'une enseigne.
// Lu à SuperPDP à chaque affichage, jamais copié : il reste la source de vérité.
// Auth : verify_jwt = true, puis can_act_as : les membres de l'enseigne.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { lireDeclarations, obtenirJeton } from '../_shared/reporting-superpdp.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ error: 'unauthorized' }, 401)

  const body = (await req.json().catch(() => null)) as { entite?: string } | null
  if (!body?.entite) return json({ error: 'invalid_body' }, 400)
  const { data: membre } = await userClient.rpc('can_act_as', { target_actor: body.entite })
  if (membre !== true) return json({ error: 'forbidden' }, 403)

  try {
    const { data: e, error } = await getSupabaseAdmin().from('reporting_entreprises')
      .select('environnement').eq('entity_actor_id', body.entite).maybeSingle()
    if (error) throw error
    if (!e) return json({ error: 'not_found' }, 404)
    return json({ declarations: await lireDeclarations(await obtenirJeton(body.entite, e.environnement)) })
  } catch (err) {
    console.error('[reporting-suivi]', err)
    return json({ error: 'failed' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
