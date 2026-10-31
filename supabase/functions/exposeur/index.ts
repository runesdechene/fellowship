// exposeur : les chiffres d'une enseigne Pro pour un agent ou un tableau de bord, par une clé personnelle.
// GET ?debut=AAAA-MM-JJ&fin=AAAA-MM-JJ, en-tête « Authorization: Bearer <clé> ». Lecture seule.
// Public (verify_jwt = false) : la clé fait foi ; seul son hash est en base (table api_keys).
// Le calcul vit dans exposeur_chiffres (migration 20261031130000), réservée au service role.
// Spec : docs/superpowers/specs/2026-10-31-exposeur-design.md.

import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'

const DATE = /^\d{4}-\d{2}-\d{2}$/

Deno.serve(async (req) => {
  if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, 405)
  const cle = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!cle) return json({ error: 'unauthorized' }, 401)

  const url = new URL(req.url)
  const debut = url.searchParams.get('debut') ?? ''
  const fin = url.searchParams.get('fin') ?? ''
  if (!DATE.test(debut) || !DATE.test(fin)) return json({ error: 'dates_attendues_AAAA-MM-JJ' }, 400)

  const empreinte = await sha256(cle)
  const { data, error } = await getSupabaseAdmin().rpc('exposeur_chiffres', { p_hash: empreinte, p_debut: debut, p_fin: fin })
  if (error) {
    console.error('[exposeur]', error)
    return json({ error: 'failed' }, 500)
  }
  // Clé inconnue ou révoquée : un 401 qui ne dit pas laquelle des deux.
  if (data === null) return json({ error: 'unauthorized' }, 401)
  if (data.error === 'pro') return json({ error: 'pro_requis' }, 403)
  return json({ debut, fin, ...data })
})

async function sha256(texte: string): Promise<string> {
  const octets = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte))
  return Array.from(new Uint8Array(octets), (o) => o.toString(16).padStart(2, '0')).join('')
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
}
