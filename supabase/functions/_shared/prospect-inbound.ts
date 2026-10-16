// prospect-inbound (règles) : lire un e-mail reçu — l'adresse de l'expéditeur, les identifiants du
// fil, le texte, la confiance qu'on peut avoir dans l'expéditeur, les réponses automatiques.
// Pur, sans Deno : testé par vitest (apps/web-v2/src/lib/prospect-inbound.test.ts).
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

/**
 * On ne range un e-mail par l'adresse de son expéditeur que si cette adresse est prouvée (DMARC) :
 * sinon n'importe qui pourrait écrire « depuis » un prospect. Les en-têtes de fil, eux, citent nos
 * Message-ID, que seuls les destinataires connaissent.
 */
export function trustedSender(auth: { spf?: string; dkim?: string; dmarc?: string } | undefined): boolean {
  return auth?.dmarc === 'pass'
}

/** Un « absent du bureau », une réponse de robot : il reste dans le fil, sans compter comme réponse. */
export function isAutoReply(headers: Record<string, string>): boolean {
  const submitted = header(headers, 'auto-submitted').toLowerCase()
  const precedence = header(headers, 'precedence').toLowerCase()
  return (
    (submitted !== '' && submitted !== 'no') ||
    header(headers, 'x-autoreply') !== '' ||
    header(headers, 'x-autorespond') !== '' ||
    ['auto_reply', 'bulk', 'junk'].includes(precedence)
  )
}

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', ndash: '–', mdash: '—',
  eacute: 'é', egrave: 'è', ecirc: 'ê', agrave: 'à', acirc: 'â', ccedil: 'ç', ugrave: 'ù',
  ocirc: 'ô', icirc: 'î', euml: 'ë', iuml: 'ï', Eacute: 'É', Agrave: 'À', Ccedil: 'Ç',
}

function decodeEntity(entity: string, body: string): string {
  if (body.startsWith('#x')) return String.fromCodePoint(Number.parseInt(body.slice(2), 16))
  if (body.startsWith('#')) return String.fromCodePoint(Number.parseInt(body.slice(1), 10))
  return ENTITIES[body] ?? entity
}

/** Un HTML en `data:…;base64,` se décode ; un base64 invalide ne doit jamais faire échouer la réception. */
function decodeDataUri(html: string): string {
  const match = /^data:[^,]*;base64,(.*)$/s.exec(html)
  if (!match) return html
  try {
    const bytes = Uint8Array.from(atob(match[1] ?? ''), (c) => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return ''
  }
}

export function bodyText(o: { text: string | null; html: string | null }): string {
  if (o.text?.trim()) return o.text.trim()
  return decodeDataUri(o.html ?? '')
    .replace(/<(style|script|head)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, body: string) => decodeEntity(entity, body))
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
