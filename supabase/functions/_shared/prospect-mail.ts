// prospect-mail : composer un e-mail de prospection (texte et HTML) et décider si l'envoi est permis.
// Pur, sans Deno : testé par vitest depuis la V2 (apps/web-v2/src/lib/prospect-mail.test.ts).
// Spec : docs/superpowers/specs/2026-10-16-v2-admin-messagerie-prospection-design.md.

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }

function escape(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ESCAPES[c] ?? c)
}

function linkify(escaped: string): string {
  return escaped.replace(/https?:\/\/[^\s<]+/g, (url) => `<a href="${url}">${url}</a>`)
}

export function toHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${linkify(escape(paragraph)).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

const FOOTER = 'Tu ne veux plus recevoir nos e-mails ? Se désinscrire'

export function composeEmail(o: { body: string; signature: string; unsubscribeUrl: string }) {
  const main = [o.body.trim(), o.signature.trim()].filter(Boolean).join('\n\n')
  const text = `${main}\n\n—\n${FOOTER} : ${o.unsubscribeUrl}`
  const html =
    toHtml(main) +
    `<p style="color:#8a857f;font-size:12px">— <br>Tu ne veux plus recevoir nos e-mails ? ` +
    `<a href="${escape(o.unsubscribeUrl)}">Se désinscrire</a></p>`
  return { text, html }
}

export type Refusal = 'no_email' | 'unsubscribed' | 'not_owner' | 'no_sender' | 'empty'

export function sendRefusal(o: {
  email: string | null
  unsubscribedAt: string | null
  ownerId: string | null
  callerId: string
  senderActive: boolean
  subject: string
  body: string
}): Refusal | null {
  if (!o.email) return 'no_email'
  if (o.unsubscribedAt) return 'unsubscribed'
  if (o.ownerId && o.ownerId !== o.callerId) return 'not_owner'
  if (!o.senderActive) return 'no_sender'
  if (!o.subject.trim() || !o.body.trim()) return 'empty'
  return null
}
