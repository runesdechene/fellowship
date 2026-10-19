// update-mail : composer l'e-mail d'une grosse mise à jour (texte et HTML) et couper les envois en lots.
// Pur, sans Deno : testé par vitest depuis la V2 (apps/web-v2/src/lib/update-mail.test.ts).
// Spec : docs/superpowers/specs/2026-10-19-v2-nouveautes-design.md.

import { toHtml } from './prospect-mail.ts'

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }
const escape = (text: string) => text.replace(/[&<>"]/g, (c) => ESCAPES[c] ?? c)

// L'e-mail donne envie et renvoie vers la page : les deux premiers paragraphes suffisent.
const PARAGRAPHS = 2

export function composeUpdateEmail(o: {
  title: string
  body: string
  imageUrl: string | null
  url: string
  unsubscribeUrl: string
}) {
  const subject = o.title.trim().replace(/[\r\n]+/g, ' ')
  const lead = o.body.trim().split(/\n{2,}/).slice(0, PARAGRAPHS).join('\n\n')
  const text =
    `${subject}\n\n${lead}\n\nVoir la nouveauté : ${o.url}\n\n—\n` +
    `Tu ne veux plus recevoir ces e-mails ? Se désinscrire : ${o.unsubscribeUrl}`
  const image = o.imageUrl
    ? `<img src="${escape(o.imageUrl)}" alt="" width="560" style="width:100%;max-width:560px;border-radius:12px">`
    : ''
  const html =
    image +
    `<h1 style="font-family:Georgia,serif;font-weight:400;font-size:30px">${escape(subject)}</h1>` +
    toHtml(lead) +
    `<p><a href="${escape(o.url)}" style="display:inline-block;padding:10px 16px;border-radius:10px;` +
    `background:#1f1d1b;color:#ffffff;text-decoration:none">Voir la nouveauté</a></p>` +
    `<p style="color:#8a857f;font-size:12px">— <br>Tu ne veux plus recevoir ces e-mails ? ` +
    `<a href="${escape(o.unsubscribeUrl)}">Se désinscrire</a></p>`
  return { subject, text, html }
}

export function chunks<T>(list: T[], size: number): T[][] {
  const lots: T[][] = []
  for (let i = 0; i < list.length; i += size) lots.push(list.slice(i, i + size))
  return lots
}
