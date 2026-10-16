// prospect-inbound (règles) : lire un e-mail reçu — l'adresse de l'expéditeur, les identifiants du
// fil, le texte. Pur, sans Deno : testé par vitest (apps/web-v2/src/lib/prospect-inbound.test.ts).
// Spec : docs/superpowers/specs/2026-10-16-v2-admin-messagerie-prospection-design.md.

export function emailAddress(from: string): string {
  const inBrackets = /<([^>]+)>/.exec(from)
  return (inBrackets?.[1] ?? from).trim().toLowerCase()
}

function header(headers: Record<string, string>, name: string): string {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name)
  return key ? (headers[key] ?? '') : ''
}

export function threadKeys(headers: Record<string, string>): string[] {
  const ids = `${header(headers, 'in-reply-to')} ${header(headers, 'references')}`.match(/<[^>]+>/g) ?? []
  return [...new Set(ids)]
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ',
}

function decodeDataUri(html: string): string {
  const match = /^data:[^,]*;base64,(.*)$/s.exec(html)
  if (!match) return html
  const bytes = Uint8Array.from(atob(match[1] ?? ''), (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function bodyText(o: { text: string | null; html: string | null }): string {
  if (o.text?.trim()) return o.text.trim()
  return decodeDataUri(o.html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (e) => ENTITIES[e] ?? e)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
