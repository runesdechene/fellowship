// app-update-email : l'e-mail d'une grosse mise à jour, à tous les exposants, une seule fois.
// Auth : verify_jwt = true, puis is_admin(). La note est « réclamée » (email_sent_at posé) en une
// écriture AVANT tout envoi : un second appel, un double clic, ne renvoie rien.
// Spec : docs/superpowers/specs/2026-10-19-v2-nouveautes-design.md.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { APP_URL } from '../_shared/app-url.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'
import { chunks, composeUpdateEmail, releaseClaim } from '../_shared/update-mail.ts'

const FROM = '"Fellowship" <nouveautes@flw.sh>'
// La limite de l'envoi groupé de Resend.
const LOT = 100

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ error: 'unauthorized' }, 401)
  const { data: isAdmin } = await userClient.rpc('is_admin')
  if (isAdmin !== true) return json({ error: 'forbidden' }, 403)

  const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const updateId = typeof raw?.updateId === 'string' ? raw.updateId : ''
  if (!updateId) return json({ error: 'invalid_body' }, 400)

  const admin = getSupabaseAdmin()
  try {
    const { data: note, error: cErr } = await admin.from('app_updates')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', updateId).eq('weight', 'big').is('email_sent_at', null)
      .select('id, title, body, image_url').maybeSingle()
    if (cErr) throw cErr
    if (!note) return json({ error: 'already_sent' }, 409)

    // Une panne avant tout envoi rend la note envoyable : sinon seul un SQL la rattraperait.
    const release = () => admin.from('app_updates').update({ email_sent_at: null }).eq('id', updateId)
    const { data: people, error: rErr } = await admin.rpc('app_update_email_recipients')
    if (rErr) {
      await release()
      throw rErr
    }
    const recipients = (people ?? []) as { email: string; token: string }[]

    let sent = 0
    for (const [index, lot] of chunks(recipients, LOT).entries()) {
      const emails = lot.map(({ email, token }) => {
        const unsubscribeUrl =
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/prospect-unsubscribe?t=${token}`
        const mail = composeUpdateEmail({
          title: note.title, body: note.body, imageUrl: note.image_url,
          url: `${APP_URL}/nouveautes`, unsubscribeUrl,
        })
        return {
          from: FROM, to: [email], subject: mail.subject, text: mail.text, html: mail.html,
          headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
        }
      })
      const response = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          'Content-Type': 'application/json',
          // Une répétition du même lot n'envoie pas deux fois.
          'Idempotency-Key': `${updateId}-${index}`,
        },
        body: JSON.stringify(emails),
      })
      // Un lot refusé se note dans les journaux et n'est jamais renvoyé : mieux vaut un manque qu'un doublon.
      if (response.ok) sent += lot.length
      else console.error('[app-update-email] lot', index, response.status, await response.text())
    }

    if (releaseClaim(sent, recipients.length)) {
      await release()
      return json({ error: 'send_failed' }, 502)
    }
    const { error: uErr } = await admin.from('app_updates').update({ email_count: sent }).eq('id', updateId)
    if (uErr) console.error('[app-update-email] compte', uErr)
    return json({ sent })
  } catch (err) {
    console.error('[app-update-email]', err)
    return json({ error: 'failed' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
