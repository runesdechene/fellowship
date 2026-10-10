/**
 * QUOI     — le fil de la communauté : lire les lignes de community_feed, les trier par onglet,
 *            les dire (« Gautier va à … », « Un exposant a noté … »), et dire pourquoi suivre un
 *            compte (« suivi par Tom et 2 autres »).
 * POURQUOI — lot 9a. La base décide qui peut être nommé (identité protégée) ; ici, une ligne sans
 *            auteur se dit « Un exposant » ou « Quelqu’un », jamais autrement. Logique pure,
 *            testée seule (community.test.ts).
 */
import type { TextPart } from './notifications'

export type FeedKind = 'arrival' | 'going' | 'added' | 'review' | 'follow' | 'gathering'

export interface FeedPerson {
  id: string
  name: string
  avatarUrl: string | null
  /** L'adresse de sa vitrine, s'il en a une. */
  slug: string | null
}

export interface FeedEvent {
  id: string
  name: string
  city: string | null
  department: string | null
  startDate: string
  endDate: string
  imageUrl: string | null
}

export interface FeedLine {
  id: string
  kind: FeedKind
  at: Date
  /** null : un auteur d'avis que la base ne nomme pas, ou un créateur inconnu. */
  who: FeedPerson | null
  /** Le compte suivi, pour « suit maintenant ». */
  target: FeedPerson | null
  event: FeedEvent | null
  stars: number | null
  comment: string | null
  /** « maroquinerie, Nantes » pour une arrivée ; le nombre de compagnons pour un rassemblement. */
  detail: string | null
  companions: FeedPerson[]
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

const KINDS: readonly FeedKind[] = ['arrival', 'going', 'added', 'review', 'follow', 'gathering']

function isKind(value: unknown): value is FeedKind {
  return KINDS.some((kind) => kind === value)
}

function person(id: unknown, name: unknown, avatar: unknown, slug: unknown): FeedPerson | null {
  const personId = word(id)
  const personName = word(name)
  if (!personId || !personName) return null
  return { id: personId, name: personName, avatarUrl: word(avatar), slug: word(slug) }
}

function readEvent(row: Raw): FeedEvent | null {
  const id = word(row.event_id)
  const name = word(row.event_name)
  const startDate = word(row.event_start)
  const endDate = word(row.event_end)
  if (!id || !name || !startDate || !endDate) return null
  return {
    id,
    name,
    city: word(row.event_city),
    department: word(row.event_department),
    startDate,
    endDate,
    imageUrl: word(row.event_image),
  }
}

function readCompanions(raw: unknown): FeedPerson[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const companion = record(item)
      return companion ? person(companion.id, companion.name, companion.avatar, null) : null
    })
    .filter((companion): companion is FeedPerson => companion !== null)
}

/** Les lignes qui ont besoin d'un festival, et celles qui ont besoin d'un nom. */
const NEEDS_EVENT: readonly FeedKind[] = ['going', 'added', 'review', 'gathering']
const NEEDS_WHO: readonly FeedKind[] = ['arrival', 'going', 'follow']

function readLine(raw: unknown): FeedLine | null {
  const row = record(raw)
  if (!row) return null
  const id = word(row.id)
  const at = word(row.occurred_at)
  if (!id || !at || !isKind(row.kind)) return null
  const kind = row.kind
  const who = person(row.who_id, row.who_name, row.who_avatar, row.who_slug)
  const target = person(row.target_id, row.target_name, null, row.target_slug)
  const event = readEvent(row)
  if (NEEDS_EVENT.includes(kind) && !event) return null
  if (NEEDS_WHO.includes(kind) && !who) return null
  if (kind === 'follow' && !target) return null
  return {
    id,
    kind,
    at: new Date(at),
    who,
    target,
    event,
    stars: typeof row.stars === 'number' ? row.stars : null,
    comment: word(row.comment),
    detail: word(row.detail),
    companions: readCompanions(row.companions),
  }
}

export function readFeed(rows: unknown): FeedLine[] {
  if (!Array.isArray(rows)) return []
  return rows.map(readLine).filter((line): line is FeedLine => line !== null)
}

export type CommunityTab = 'tout' | 'ou' | 'avis' | 'reseau'

const TAB_KINDS: Record<CommunityTab, readonly FeedKind[]> = {
  tout: ['arrival', 'going', 'added', 'review', 'follow'],
  ou: ['going', 'added'],
  avis: ['review'],
  reseau: ['arrival', 'follow'],
}

export function readTab(value: string | null): CommunityTab {
  return value === 'ou' || value === 'avis' || value === 'reseau' ? value : 'tout'
}

export function feedFor(lines: FeedLine[], tab: CommunityTab): FeedLine[] {
  return lines.filter((line) => TAB_KINDS[tab].includes(line.kind))
}

export function gatheringOf(lines: FeedLine[]): FeedLine | null {
  return lines.find((line) => line.kind === 'gathering') ?? null
}

export function feedPhrase(line: FeedLine): TextPart[] {
  const who = line.who?.name
  const event = line.event?.name ?? ''
  switch (line.kind) {
    case 'arrival':
      return [
        { strong: who ?? '' },
        line.detail
          ? ` vient de rejoindre Fellowship — ${line.detail}.`
          : ' vient de rejoindre Fellowship.',
      ]
    case 'going':
      return [{ strong: who ?? '' }, ' va à ', { strong: event }, '.']
    case 'added':
      return [{ strong: who ?? 'Quelqu’un' }, ' a ajouté un festival sur Fellowship.']
    case 'review':
      return [{ strong: who ?? 'Un exposant' }, ' a noté ', { strong: event }, '.']
    case 'follow':
      return [{ strong: who ?? '' }, ' suit maintenant ', { strong: line.target?.name ?? '' }, '.']
    case 'gathering':
      return [{ strong: event }]
  }
}

/** Ce qui suit le nom dans « Activité du réseau » ; null : la ligne n'y va pas. */
export function activityText(line: FeedLine): string | null {
  if (!line.who) return null
  switch (line.kind) {
    case 'arrival':
      return 'vient de rejoindre Fellowship'
    case 'going':
      return line.event ? `va à ${line.event.name}` : null
    case 'added':
      return line.event ? `a ajouté ${line.event.name}` : null
    case 'follow':
      return line.target ? `suit ${line.target.name}` : null
    case 'review':
    case 'gathering':
      return null
  }
}

export type FollowReason =
  | { kind: 'followed_by'; name: string; others: number }
  | { kind: 'shared_dates'; count: number }
  | { kind: 'nearby' }

export function readFollowReason(raw: unknown): FollowReason | null {
  const reason = record(raw)
  if (!reason) return null
  if (reason.kind === 'nearby') return { kind: 'nearby' }
  if (reason.kind === 'shared_dates') {
    return typeof reason.count === 'number' ? { kind: 'shared_dates', count: reason.count } : null
  }
  if (reason.kind === 'followed_by') {
    const name = word(reason.name)
    const others = typeof reason.others === 'number' ? reason.others : 0
    return name ? { kind: 'followed_by', name, others } : null
  }
  return null
}

export function followReason(reason: FollowReason): string {
  switch (reason.kind) {
    case 'followed_by':
      if (reason.others === 0) return `suivi par ${reason.name}`
      return `suivi par ${reason.name} et ${String(reason.others)} ${reason.others === 1 ? 'autre' : 'autres'}`
    case 'shared_dates':
      return `${String(reason.count)} ${reason.count === 1 ? 'date' : 'dates'} en commun`
    case 'nearby':
      return 'nouveau sur Fellowship'
  }
}

/** Un bouton Suivre n'a de sens ni sur un compte déjà suivi, ni sur un des siens. */
export function canFollow(
  id: string,
  followed: ReadonlySet<string>,
  own: ReadonlySet<string>,
): boolean {
  return !followed.has(id) && !own.has(id)
}
