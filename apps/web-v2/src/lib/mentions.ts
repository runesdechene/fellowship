/**
 * QUOI     — les @ d'un sujet : repérer le nom qu'on tape après « @ », l'insérer, garder les
 *            mentions encore présentes dans le texte, et découper un message pour les afficher.
 * POURQUOI — on tague un exposant dans un sujet et ses messages (maquette Story 2844:1023,
 *            Uriel, 18/11/2026). Le texte garde un simple « @Nom » ; la base range à côté qui est
 *            tagué (`messages.mentions`). Logique pure, testée seule.
 */

export interface Mention {
  id: string
  name: string
  /** L'adresse de sa vitrine : le @Nom y mène. */
  slug: string
}

/** Au-delà, ce n'est plus un nom qu'on tape : la liste se ferme. */
const QUERY_MAX = 40

/**
 * Le nom tapé après le dernier « @ » avant le curseur, ou null. Le « @ » ouvre un nom en début de
 * texte ou après une espace (une adresse e-mail n'ouvre rien) ; un retour à la ligne le ferme.
 */
export function mentionQuery(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret)
  const start = before.lastIndexOf('@')
  if (start < 0) return null
  const opener = start === 0 ? ' ' : before.charAt(start - 1)
  const query = before.slice(start + 1)
  if (!/\s/.test(opener) || query.includes('\n') || query.length > QUERY_MAX) return null
  return { start, query }
}

/** Remplace le nom en cours par « @Nom » suivi d'une espace ; rend le texte et le curseur. */
export function insertMention(
  text: string,
  start: number,
  caret: number,
  name: string,
): { text: string; caret: number } {
  const inserted = `@${name} `
  return {
    text: text.slice(0, start) + inserted + text.slice(caret),
    caret: start + inserted.length,
  }
}

/** Les mentions dont le « @Nom » figure encore dans le texte, sans doublon. */
export function keptMentions(text: string, mentions: Mention[]): Mention[] {
  const seen = new Set<string>()
  return mentions.filter((mention) => {
    if (seen.has(mention.id) || !text.includes(`@${mention.name}`)) return false
    seen.add(mention.id)
    return true
  })
}

/** Le texte découpé : du texte simple, et chaque « @Nom » tagué rendu par sa mention. */
export function splitMentions(body: string, mentions: Mention[]): (string | Mention)[] {
  // Le plus long d'abord : « @Lia Céramique » ne doit pas être pris pour « @Lia ».
  const sorted = [...mentions].sort((a, b) => b.name.length - a.name.length)
  const parts: (string | Mention)[] = []
  let plain = ''
  let index = 0
  while (index < body.length) {
    const found =
      body.charAt(index) === '@' && sorted.find((m) => body.startsWith(`@${m.name}`, index))
    if (found) {
      if (plain) parts.push(plain)
      plain = ''
      parts.push(found)
      index += found.name.length + 1
    } else {
      plain += body.charAt(index)
      index += 1
    }
  }
  if (plain) parts.push(plain)
  return parts
}

/** Lit la colonne `mentions` telle que la base la rend ; ignore ce qui n'a pas la bonne forme. */
export function toMentions(value: unknown): Mention[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item: unknown) => {
    if (typeof item !== 'object' || item === null) return []
    const { id, name, slug } = item as Record<string, unknown>
    return typeof id === 'string' && typeof name === 'string' && typeof slug === 'string'
      ? [{ id, name, slug }]
      : []
  })
}
