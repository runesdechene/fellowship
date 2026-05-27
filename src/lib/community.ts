export type FeedKind = 'review' | 'participation' | 'follow'
export type Segment = 'tout' | 'ou-ils-vont' | 'avis' | 'reseau'

export interface FeedActor {
  actorId: string
  label: string
  avatarUrl: string | null
  slug: string | null
}

export interface FeedEventRef {
  id: string
  name: string
  city: string | null
  startDate: string
  endDate: string
  imageUrl: string | null
}

export interface FeedItem {
  id: string
  kind: FeedKind
  occurredAt: string
  actor: FeedActor
  event?: FeedEventRef
  stars?: number
  comment?: string | null
  status?: string
  target?: FeedActor
}

export interface Convergence {
  event: FeedEventRef
  count: number
  sample: FeedActor[]
}

export interface Suggestion {
  actor: FeedActor
  sharedFollowers: number
  sharedEvents: number
  reason: string
}

const PALETTE = ['#3d9970', '#f0a060', '#6c5ce7', '#e84393', '#f39c12', '#00b894', '#e07a5f']

export function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return PALETTE[Math.abs(h) % PALETTE.length]
}

export function reviewStars(r: { affluence: number; organisation: number; rentabilite: number }): number {
  return Math.round((r.affluence + r.organisation + r.rentabilite) / 3)
}

export function sortFeed(items: FeedItem[]): FeedItem[] {
  return [...items].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  )
}

export function filterBySegment(items: FeedItem[], seg: Segment): FeedItem[] {
  if (seg === 'tout') return items
  if (seg === 'avis') return items.filter(i => i.kind === 'review')
  if (seg === 'ou-ils-vont') return items.filter(i => i.kind === 'participation')
  return items.filter(i => i.kind === 'follow')
}

export function rankConvergences(
  parts: Array<{ eventId: string; actor: FeedActor }>,
  events: Record<string, FeedEventRef>,
): Convergence[] {
  const byEvent = new Map<string, Map<string, FeedActor>>()
  for (const p of parts) {
    if (!events[p.eventId]) continue
    let m = byEvent.get(p.eventId)
    if (!m) { m = new Map(); byEvent.set(p.eventId, m) }
    if (!m.has(p.actor.actorId)) m.set(p.actor.actorId, p.actor)
  }
  const out: Convergence[] = []
  for (const [eventId, actors] of byEvent) {
    if (actors.size < 2) continue
    const list = [...actors.values()]
    out.push({ event: events[eventId], count: list.length, sample: list.slice(0, 5) })
  }
  return out.sort((a, b) =>
    b.count - a.count ||
    new Date(a.event.startDate).getTime() - new Date(b.event.startDate).getTime()
  )
}

export function rankSuggestions(
  candidates: Array<{ actor: FeedActor; sharedFollowers: number; sharedEvents: number }>,
): Suggestion[] {
  const score = (c: { sharedFollowers: number; sharedEvents: number }) =>
    c.sharedFollowers * 2 + c.sharedEvents
  return [...candidates]
    .sort((a, b) => score(b) - score(a))
    .map(c => ({
      ...c,
      reason:
        c.sharedFollowers > 0
          ? `Suivi par ${c.sharedFollowers} compagnon${c.sharedFollowers > 1 ? 's' : ''}`
          : `Va à ${c.sharedEvents} festival${c.sharedEvents > 1 ? 's' : ''} que tu suis`,
    }))
}
