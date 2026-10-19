// prospect-unsubscribe : la désinscription d'un prospect, par le jeton de son lien.
// Public (verify_jwt = false) : le jeton fait foi. Supabase sert le HTML de ses fonctions en texte
// brut (protection contre l'hameçonnage) : la page est donc celle de la V2, publique.
// GET (le lien de l'e-mail) redirige vers flw.sh/desinscription ; POST désinscrit — depuis le
// bouton de cette page (jeton dans le corps JSON) ou depuis une messagerie (« List-Unsubscribe-Post »,
// jeton dans l'adresse). Aucune information sur le prospect n'est rendue.
// Spec : docs/superpowers/specs/2026-10-16-v2-admin-messagerie-prospection-design.md.

import { APP_URL } from '../_shared/app-url.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'

const PAGE = `${APP_URL}/desinscription`
const TOKEN = /^[0-9a-f]{64}$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const fromUrl = new URL(req.url).searchParams.get('t') ?? ''

  if (req.method === 'GET') {
    return new Response(null, { status: 302, headers: { Location: `${PAGE}?t=${encodeURIComponent(fromUrl)}` } })
  }
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const body = (await req.json().catch(() => null)) as { token?: unknown } | null
  const token = typeof body?.token === 'string' ? body.token : fromUrl
  if (!TOKEN.test(token)) return json({ error: 'invalid_token' }, 400)

  const { error } = await getSupabaseAdmin().from('prospects')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('unsubscribe_token', token).is('unsubscribed_at', null)
  if (error) {
    console.error('[prospect-unsubscribe]', error)
    return json({ error: 'failed' }, 500)
  }
  return json({ done: true })
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
