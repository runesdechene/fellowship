/**
 * QUOI     — les suggestions « Pour toi » : lire la réponse de suggestions_for, et dire la raison
 *            d'une suggestion (« Gautier y va », « Proche des Aventuriales »).
 * POURQUOI — lot 8d. Le tableau de bord et la notification disent la même raison ; la fonction
 *            send-push recopie ce fichier (scripts/sync-push-phrases.mjs) : il ne dépend de rien.
 */

export type SuggestionReason =
  | { kind: 'friends'; friendName: string; others: number }
  | { kind: 'similar'; refName: string }
  | { kind: 'near' }

export interface Suggestion {
  eventId: string
  name: string
  city: string | null
  startDate: string
  endDate: string
  imageUrl: string | null
  reason: SuggestionReason
}

export interface Suggestions {
  /** Tout ce qui a été trouvé : le gratuit ne voit que ce nombre. */
  count: number
  /** Les 3 meilleures, vides en gratuit. */
  items: Suggestion[]
}

type Raw = Record<string, unknown>

function record(value: unknown): Raw | null {
  return typeof value === 'object' && value !== null ? (value as Raw) : null
}

/** Un texte non vide, sans les espaces saisies autour. */
function word(value: unknown): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  return trimmed === '' ? null : trimmed
}

export function readReason(raw: unknown): SuggestionReason | null {
  const reason = record(raw)
  if (!reason) return null
  if (reason.kind === 'near') return { kind: 'near' }
  if (reason.kind === 'similar') {
    const refName = word(reason.ref_name)
    return refName ? { kind: 'similar', refName } : null
  }
  if (reason.kind === 'friends') {
    const friendName = word(reason.friend_name)
    const others = typeof reason.others === 'number' ? reason.others : 0
    return friendName ? { kind: 'friends', friendName, others } : null
  }
  return null
}

function readItem(raw: unknown): Suggestion | null {
  const item = record(raw)
  if (!item) return null
  const eventId = word(item.event_id)
  const name = word(item.name)
  const startDate = word(item.start_date)
  const endDate = word(item.end_date)
  const reason = readReason(item.reason)
  if (!eventId || !name || !startDate || !endDate || !reason) return null
  return {
    eventId,
    name,
    city: word(item.city),
    startDate,
    endDate,
    imageUrl: word(item.image_url),
    reason,
  }
}

export function readSuggestions(raw: unknown): Suggestions {
  const answer = record(raw)
  const count = typeof answer?.count === 'number' ? answer.count : 0
  const items = Array.isArray(answer?.items) ? answer.items : []
  return {
    count,
    items: items.map(readItem).filter((item): item is Suggestion => item !== null),
  }
}

/** « de » devant un nom de festival : des, du, de la, de l’, d’, de. */
export function withDe(name: string): string {
  if (name.startsWith('Les ')) return `des ${name.slice(4)}`
  if (name.startsWith('Le ')) return `du ${name.slice(3)}`
  if (name.startsWith('La ')) return `de la ${name.slice(3)}`
  if (name.startsWith('L’') || name.startsWith("L'")) return `de l’${name.slice(2)}`
  if (/^[AEIOUYÉÈÊÂÎÔÛaeiouyéèêâîôû]/.test(name)) return `d’${name}`
  return `de ${name}`
}

export function reasonText(reason: SuggestionReason): string {
  switch (reason.kind) {
    case 'friends':
      if (reason.others === 0) return `${reason.friendName} y va`
      return `${reason.friendName} et ${String(reason.others)} ${reason.others === 1 ? 'ami' : 'amis'} y vont`
    case 'similar':
      return `Proche ${withDe(reason.refName)}`
    case 'near':
      return 'Près de chez toi'
  }
}

/** Après « pourrait t’intéresser : » — un prénom garde sa majuscule, le reste la perd. */
export function reasonInSentence(reason: SuggestionReason): string {
  const said = reasonText(reason)
  return reason.kind === 'friends' ? said : said.charAt(0).toLowerCase() + said.slice(1)
}

export function foundLabel(count: number): string {
  return count === 1
    ? 'J’ai trouvé 1 festival fait pour toi'
    : `J’ai trouvé ${String(count)} festivals faits pour toi`
}
