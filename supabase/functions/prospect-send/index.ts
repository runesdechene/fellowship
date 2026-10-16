// prospect-send : envoyer un e-mail de prospection depuis l'adresse @equipe.flw.sh de l'admin appelant.
// Auth : verify_jwt = true, puis is_admin(). Seul le suiveur du prospect envoie (ou celui qui lui
// écrit en premier, qui en devient le suiveur). Le fil : In-Reply-To / References du dernier message.
// Spec : docs/superpowers/specs/2026-10-16-v2-admin-messagerie-prospection-design.md.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { composeEmail, sendRefusal } from '../_shared/prospect-mail.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'

const DOMAIN = 'equipe.flw.sh'

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
  const prospectId = typeof raw?.prospectId === 'string' ? raw.prospectId : ''
  const templateId = typeof raw?.templateId === 'string' ? raw.templateId : null
  const subject = typeof raw?.subject === 'string' ? raw.subject : ''
  const body = typeof raw?.body === 'string' ? raw.body : ''
  if (!prospectId) return json({ error: 'invalid_body' }, 400)

  const admin = getSupabaseAdmin()
  try {
    const { data: prospect, error: pErr } = await admin.from('prospects')
      .select('id, name, email, owner_id, unsubscribed_at, unsubscribe_token, email_status')
      .eq('id', prospectId).maybeSingle()
    if (pErr) throw pErr
    if (!prospect) return json({ error: 'invalid_body' }, 400)
    const { data: sender, error: sErr } = await admin.from('prospect_senders')
      .select('id, alias, display_name, signature, active')
      .eq('user_id', user.id).eq('active', true).order('created_at').limit(1).maybeSingle()
    if (sErr) throw sErr

    const refusal = sendRefusal({
      email: prospect.email, unsubscribedAt: prospect.unsubscribed_at, ownerId: prospect.owner_id,
      callerId: user.id, senderActive: Boolean(sender), subject, body,
    })
    if (refusal || !sender) return json({ error: refusal ?? 'no_sender' }, 400)

    const { data: last, error: lErr } = await admin.from('prospect_messages')
      .select('message_id, references_ids')
      .eq('prospect_id', prospectId)
      .order('created_at', { ascending: false }).order('id', { ascending: false })
      .limit(1).maybeSingle()
    if (lErr) throw lErr
    const inReplyTo = last?.message_id ?? null
    const references = inReplyTo ? [...(last?.references_ids ?? []), inReplyTo] : []

    const { data: me, error: meErr } = await admin.from('users').select('email').eq('actor_id', user.id).maybeSingle()
    if (meErr) throw meErr
    const from = `${sender.alias}@${DOMAIN}`
    const replyTo = me?.email ?? from
    const messageId = `<${crypto.randomUUID()}@${DOMAIN}>`
    const unsubscribeUrl =
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/prospect-unsubscribe?t=${prospect.unsubscribe_token}`
    const mail = composeEmail({ body, signature: sender.signature, unsubscribeUrl })
    const headers: Record<string, string> = {
      'Message-ID': messageId,
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    }
    if (inReplyTo) {
      headers['In-Reply-To'] = inReplyTo
      headers['References'] = references.join(' ')
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Lot 3b : les réponses vont à la boîte personnelle de l'expéditeur ; le lot 3c les recevra ici.
        from: `${sender.display_name} <${from}>`, to: [prospect.email], reply_to: replyTo,
        subject: subject.trim(), text: mail.text, html: mail.html, headers,
        tags: [{ name: 'prospect', value: prospectId }],
      }),
    })
    const sent = (await response.json().catch(() => null)) as { id?: string } | null
    if (!response.ok || !sent?.id) {
      console.error('[prospect-send] resend', response.status, sent)
      return json({ error: 'send_failed' }, 502)
    }

    const now = new Date().toISOString()
    const { error: mErr } = await admin.from('prospect_messages').insert({
      prospect_id: prospectId, direction: 'out', sender_id: sender.id, from_email: from,
      to_email: prospect.email, subject: subject.trim(), body_text: mail.text, message_id: messageId,
      in_reply_to: inReplyTo, references_ids: references, resend_id: sent.id, template_id: templateId,
      delivery: 'envoye', sent_at: now,
    })
    if (mErr) throw mErr
    const { error: uErr } = await admin.from('prospects').update({
      owner_id: prospect.owner_id ?? user.id,
      email_status: prospect.email_status === 'repondu' ? 'repondu' : 'envoye',
      contact_channel: 'mail', contacted_on: now.slice(0, 10), a_relancer: false,
    }).eq('id', prospectId)
    if (uErr) throw uErr
    return json({ done: true })
  } catch (err) {
    console.error('[prospect-send]', err)
    return json({ error: 'failed' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
