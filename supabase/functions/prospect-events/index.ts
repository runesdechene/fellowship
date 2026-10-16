// prospect-events : les signaux de livraison de Resend (délivré, rebond, plainte) sur nos e-mails de
// prospection. Public (verify_jwt = false) : la signature Svix du webhook fait foi, vérifiée avant
// toute écriture. Une plainte pour spam désinscrit le prospect. Le Message-ID réel (celui d'Amazon
// SES) remplace le nôtre.
// Spec : docs/superpowers/specs/2026-10-16-v2-admin-messagerie-prospection-design.md.

import { Webhook } from 'npm:svix@1.45.1'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'

type Event = { type: string; data: { email_id?: string; message_id?: string } }
const DELIVERY: Record<string, 'delivre' | 'rebond' | 'plainte'> = {
  'email.delivered': 'delivre',
  'email.bounced': 'rebond',
  'email.complained': 'plainte',
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 })
  const payload = await req.text()
  let event: Event
  try {
    event = new Webhook(Deno.env.get('RESEND_WEBHOOK_SECRET')!).verify(payload, {
      'svix-id': req.headers.get('svix-id') ?? '',
      'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
      'svix-signature': req.headers.get('svix-signature') ?? '',
    }) as Event
  } catch {
    return new Response('invalid_signature', { status: 400 })
  }
  const delivery = DELIVERY[event.type]
  const resendId = event.data.email_id
  if (!delivery || !resendId) return new Response('ignored')

  const admin = getSupabaseAdmin()
  // Amazon SES, qui envoie pour Resend, remplace notre Message-ID : on garde le sien, c'est lui que
  // les réponses citeront (In-Reply-To) et que nos e-mails suivants doivent reprendre.
  const fields = event.data.message_id ? { delivery, message_id: event.data.message_id } : { delivery }
  // Un « délivré » arrivé après un rebond ne l'efface pas.
  let update = admin.from('prospect_messages').update(fields).eq('resend_id', resendId)
  if (delivery === 'delivre') update = update.neq('delivery', 'rebond')
  const { data: message, error } = await update.select('prospect_id').maybeSingle()
  if (error) {
    console.error('[prospect-events]', error)
    return new Response('failed', { status: 500 })
  }
  if (message?.prospect_id && delivery !== 'delivre') {
    const patch = delivery === 'rebond'
      ? { email_status: 'rebond' }
      : { unsubscribed_at: new Date().toISOString() }
    const { error: pErr } = await admin.from('prospects').update(patch).eq('id', message.prospect_id)
    if (pErr) {
      console.error('[prospect-events]', pErr)
      return new Response('failed', { status: 500 })
    }
  }
  return new Response('ok')
})
