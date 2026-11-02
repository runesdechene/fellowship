// app-update-email : l'e-mail d'une grosse mise à jour, à tous les exposants, une seule fois.
// Auth : verify_jwt = true, puis is_admin(). La note est « réclamée » (email_sent_at posé) en une
// écriture AVANT tout envoi : un second appel, un double clic, ne renvoie rien.
// Spec : docs/superpowers/specs/2026-10-19-v2-nouveautes-design.md.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { APP_URL } from '../_shared/app-url.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'
import { chunks, composeUpdateEmail, releaseClaim } from '../_shared/update-mail.ts'

// equipe.flw.sh : le seul domaine que la clé Resend a le droit d'envoyer (flw.sh renvoie 403, 02/11/2026).
const FROM = '"Fellowship" <nouveautes@equipe.flw.sh>'
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
  // Le test : la même note, à l'admin qui le demande seulement ; rien n'est réclamé ni compté.
  if (raw?.test === true) return await sendTest(admin, updateId, user.id)
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

async function sendTest(admin: ReturnType<typeof getSupabaseAdmin>, updateId: string, actorId: string) {
  const [{ data: note }, { data: me }] = await Promise.all([
    admin.from('app_updates').select('title, body, image_url').eq('id', updateId).maybeSingle(),
    admin.from('users').select('email, email_token').eq('actor_id', actorId).maybeSingle(),
  ])
  if (!note) return json({ error: 'not_found' }, 404)
  if (!me?.email) return json({ error: 'no_email' }, 400)
  const mail = composeUpdateEmail({
    title: note.title, body: note.body, imageUrl: note.image_url,
    url: `${APP_URL}/nouveautes`,
    unsubscribeUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/prospect-unsubscribe?t=${me.email_token}`,
  })
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [me.email], subject: `[Test] ${mail.subject}`, text: mail.text, html: mail.html }),
  })
  if (!response.ok) {
    console.error('[app-update-email] test', response.status, await response.text())
    return json({ error: 'send_failed' }, 502)
  }
  return json({ test: me.email })
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
