// prospect-inbound : les réponses reçues sur @equipe.flw.sh. Public (verify_jwt = false) : la
// signature Svix du webhook « email.received » fait foi, vérifiée avant toute écriture. Le message
// complet se lit par l'API de réception de Resend (clé de lecture), se rattache à son fil (en-têtes,
// sinon adresse de l'expéditeur, sinon « Non classés »), s'enregistre une seule fois (resend_id
// unique : Svix réessaie), et part en copie au suiveur.
// Spec : docs/superpowers/specs/2026-10-16-v2-admin-messagerie-prospection-design.md.

import { Webhook } from 'npm:svix@1.45.1'
import { bodyText, emailAddress, threadKeys } from '../_shared/prospect-inbound.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'

type Received = { type: string; data: { email_id?: string } }
type Email = {
  from: string; to: string[]; subject: string | null; text: string | null; html: string | null
  headers: Record<string, string>; message_id: string | null; created_at: string
  attachments?: unknown[]
}
const PAGE = 'https://flw.sh/v2/admin/prospects'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 })
  const payload = await req.text()
  let event: Received
  try {
    event = new Webhook(Deno.env.get('RESEND_INBOUND_SECRET')!).verify(payload, {
      'svix-id': req.headers.get('svix-id') ?? '',
      'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
      'svix-signature': req.headers.get('svix-signature') ?? '',
    }) as Received
  } catch {
    return new Response('invalid_signature', { status: 400 })
  }
  const emailId = event.data.email_id
  if (event.type !== 'email.received' || !emailId) return new Response('ignored')

  const admin = getSupabaseAdmin()
  try {
    const { data: already } = await admin.from('prospect_messages').select('id').eq('resend_id', emailId).maybeSingle()
    if (already) return new Response('ok')

    const response = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
      headers: { Authorization: `Bearer ${Deno.env.get('RESEND_READ_KEY')}` },
    })
    if (!response.ok) throw new Error(`resend ${response.status}`)
    const email = (await response.json()) as Email

    const from = emailAddress(email.from)
    const to = emailAddress(email.to[0] ?? '')
    const keys = threadKeys(email.headers ?? {})

    // Le fil : un de nos messages cité dans les en-têtes, sinon un prospect à cette adresse.
    let prospectId: string | null = null
    if (keys.length) {
      const { data: known } = await admin.from('prospect_messages').select('prospect_id')
        .in('message_id', keys).not('prospect_id', 'is', null)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      prospectId = known?.prospect_id ?? null
    }
    if (!prospectId) {
      const { data: byEmail } = await admin.from('prospects').select('id').eq('email', from).maybeSingle()
      prospectId = byEmail?.id ?? null
    }

    const text = bodyText({ text: email.text, html: email.html })
    const { error: insErr } = await admin.from('prospect_messages').insert({
      prospect_id: prospectId, direction: 'in', from_email: from, to_email: to,
      subject: email.subject ?? '', body_text: text, message_id: email.message_id,
      in_reply_to: keys[0] ?? null, references_ids: keys, resend_id: emailId,
      has_attachments: (email.attachments?.length ?? 0) > 0, received_at: email.created_at,
    })
    // 23505 : déjà reçu (deux signaux presque simultanés) — rien à refaire.
    if (insErr?.code === '23505') return new Response('ok')
    if (insErr) throw insErr

    let prospectName: string | null = null
    let ownerId: string | null = null
    if (prospectId) {
      const { data: p, error } = await admin.from('prospects')
        .update({ email_status: 'repondu', a_relancer: false }).eq('id', prospectId)
        .select('name, brand, owner_id').single()
      if (error) throw error
      prospectName = p.name ?? p.brand
      ownerId = p.owner_id
    }

    // La copie : au suiveur, sinon au compte dont l'adresse a reçu l'e-mail.
    if (!ownerId) {
      const alias = to.split('@')[0] ?? ''
      const { data: sender } = await admin.from('prospect_senders').select('user_id').eq('alias', alias).maybeSingle()
      ownerId = sender?.user_id ?? null
    }
    const { data: owner } = ownerId
      ? await admin.from('users').select('email').eq('actor_id', ownerId).maybeSingle()
      : { data: null }
    if (owner?.email) {
      const who = prospectName ?? from
      const link = prospectId ? `${PAGE}/${prospectId}` : `${PAGE}/non-classes`
      const copy = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: '"Fellowship" <notifications@equipe.flw.sh>', to: [owner.email],
          subject: `${who} t’a répondu`,
          text: `${who} t’a répondu :\n\n${text}\n\n—\nRépondre depuis Fellowship : ${link}`,
        }),
      })
      if (!copy.ok) console.error('[prospect-inbound] copie', copy.status)
    }
    return new Response('ok')
  } catch (err) {
    console.error('[prospect-inbound]', err)
    // 500 : Svix réessaiera plus tard.
    return new Response('failed', { status: 500 })
  }
})
