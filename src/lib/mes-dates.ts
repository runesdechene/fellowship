import type { ParticipationWithEvent } from '@/types/database'

export interface MonthBucket {
  year: number
  month: number   // 0-11
  label: string   // "Septembre 2026"
  events: ParticipationWithEvent[]
}

export type Direction = 'upcoming' | 'past'

function monthLabel(year: number, month: number): string {
  const s = new Date(year, month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Groupe les participations en buckets mois (année+mois), triés.
 * - 'upcoming' : end_date >= now, buckets et events en ordre croissant.
 * - 'past'     : end_date <  now, buckets en ordre décroissant (events croissants dans le mois).
 * Rattachement au mois de start_date uniquement (pas de duplication). Mois vides exclus.
 */
export function groupParticipationsByMonth(
  participations: ParticipationWithEvent[],
  opts: { now: Date; direction: Direction },
): MonthBucket[] {
  const { now, direction } = opts
  const map = new Map<string, MonthBucket>()

  for (const p of participations) {
    if (!p.events) continue
    const start = new Date(p.events.start_date)
    const end = new Date(p.events.end_date)
    const isUpcoming = end.getTime() >= now.getTime()
    if (direction === 'upcoming' ? !isUpcoming : isUpcoming) continue

    const y = start.getFullYear()
    const m = start.getMonth()
    const key = `${y}-${m}`
    let bucket = map.get(key)
    if (!bucket) {
      bucket = { year: y, month: m, label: monthLabel(y, m), events: [] }
      map.set(key, bucket)
    }
    bucket.events.push(p)
  }

  const buckets = [...map.values()]
  for (const b of buckets) {
    b.events.sort((a, z) => new Date(a.events.start_date).getTime() - new Date(z.events.start_date).getTime())
  }
  buckets.sort((a, z) => {
    const cmp = (a.year - z.year) || (a.month - z.month)
    return direction === 'past' ? -cmp : cmp
  })
  return buckets
}

/**
 * Découpe « fenêtre gratuite » pour l'exposant free : mois courant + 2 mois suivants.
 * `visible` = buckets dans la fenêtre ; `beyond` = au-delà ; `beyondCount` = total d'events au-delà.
 */
export function freeWindowSplit(buckets: MonthBucket[], now: Date): {
  visible: MonthBucket[]
  beyond: MonthBucket[]
  beyondCount: number
} {
  // Borne haute incluse : mois courant + 2 (ex. mai → juillet).
  const limit = new Date(now.getFullYear(), now.getMonth() + 2, 1)
  const limitKey = limit.getFullYear() * 12 + limit.getMonth()
  const visible: MonthBucket[] = []
  const beyond: MonthBucket[] = []
  for (const b of buckets) {
    if (b.year * 12 + b.month <= limitKey) visible.push(b)
    else beyond.push(b)
  }
  const beyondCount = beyond.reduce((n, b) => n + b.events.length, 0)
  return { visible, beyond, beyondCount }
}
