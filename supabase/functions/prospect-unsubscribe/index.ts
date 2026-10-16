// prospect-unsubscribe : la désinscription d'un prospect, par le jeton de son lien.
// Public (verify_jwt = false) : le jeton fait foi. GET montre un bouton (un lien seul serait suivi
// par les antivirus des messageries) ; POST désinscrit — y compris le « List-Unsubscribe-Post » des
// messageries (désinscription en un clic). Aucune information sur le prospect n'est affichée.
// Spec : docs/superpowers/specs/2026-10-16-v2-admin-messagerie-prospection-design.md.

import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get('t') ?? ''
  if (!/^[0-9a-f]{64}$/.test(token)) return page('Ce lien de désinscription n’est pas valable.')
  if (req.method === 'GET') {
    return page(
      'Tu ne veux plus recevoir nos e-mails ?',
      `<form method="post"><button type="submit">Me désinscrire</button></form>`,
    )
  }
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 })
  const { error } = await getSupabaseAdmin().from('prospects')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('unsubscribe_token', token).is('unsubscribed_at', null)
  if (error) {
    console.error('[prospect-unsubscribe]', error)
    return page('La désinscription n’a pas abouti. Réessaie dans un instant.')
  }
  return page('C’est fait : tu ne recevras plus nos e-mails.')
})

function page(title: string, extra = '') {
  const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fellowship</title><body style="font-family:system-ui,sans-serif;max-width:480px;margin:15vh auto;padding:0 16px;color:#1f1d1b"><p style="font-size:18px">${title}</p>${extra}</body></html>`
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
