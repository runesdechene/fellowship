import type { EventWithScore } from '@/types/database'

export const VIEW_MODES = ['upcoming', 'recent', 'all'] as const
export type ViewMode = (typeof VIEW_MODES)[number]

export function applyViewMode(
  events: EventWithScore[],
  mode: ViewMode,
  now: Date,
): EventWithScore[] {
  if (mode === 'upcoming') {
    return events.filter(ev => new Date(ev.start_date) >= now)
  }
  if (mode === 'recent') {
    return [...events].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }
  return events
}

export interface DeckStyle {
  transform: string; opacity: number; filter: string; zIndex: number;
  pointerEvents: 'auto' | 'none'; isCenter: boolean
}

/** Coverflow : style d'une carte selon son décalage à la carte active (porté du layout() maquette). */
export function deckCardStyle(offset: number): DeckStyle {
  const ao = Math.abs(offset)
  if (ao > 2) {
    return {
      transform: `translate(-50%,-50%) translateX(${offset > 0 ? 170 : -170}%) scale(.5)`,
      opacity: 0, filter: 'none', zIndex: 0, pointerEvents: 'none', isCenter: false,
    }
  }
  const tx = offset === 0 ? 0 : (offset < 0 ? -1 : 1) * (ao === 1 ? 120 : 172)
  const rot = offset === 0 ? 0 : (offset < 0 ? 18 : -18)
  const sc = offset === 0 ? 1 : (ao === 1 ? 0.74 : 0.62)
  return {
    transform: `translate(-50%,-50%) translateX(${tx}%) rotateY(${rot}deg) scale(${sc})`,
    opacity: 1,
    filter: offset === 0 ? 'none' : (ao === 1 ? 'brightness(.45)' : 'brightness(.3)'),
    zIndex: 10 - ao, pointerEvents: 'auto', isCenter: offset === 0,
  }
}

export type Period = 'all' | 'this-month' | 'next-3' | 'next-6' | 'next-12' | 'recent' | 'past'
export const PERIODS: { value: Period; label: string }[] = [
  { value: 'all', label: "Jusqu'à la fin des temps" },
  { value: 'this-month', label: 'Ce mois-ci' },
  { value: 'next-3', label: '3 prochains mois' },
  { value: 'next-6', label: '6 prochains mois' },
  { value: 'next-12', label: '12 prochains mois' },
  { value: 'recent', label: '🆕 Ajoutés récemment' },
  { value: 'past', label: '✅ Terminés' },
]

export interface PeriodRange { from: Date | null; to: Date | null; past?: boolean; recent?: boolean }

export function periodToRange(period: Period, now: Date): PeriodRange {
  const addMonths = (n: number) => { const d = new Date(now); d.setMonth(d.getMonth() + n); return d }
  switch (period) {
    case 'all': return { from: now, to: null }
    case 'this-month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      return { from, to }
    }
    case 'next-3': return { from: now, to: addMonths(3) }
    case 'next-6': return { from: now, to: addMonths(6) }
    case 'next-12': return { from: now, to: addMonths(12) }
    case 'recent': return { from: now, to: addMonths(12), recent: true }
    case 'past': return { from: null, to: now, past: true }
  }
}

export type Zone = 'mine' | 'france'
export interface ExplorerFilters { tags: Set<string>; zone: Zone; period: Period }

/** Compose tags ∩ zone ∩ période, puis tri (chronologique ; created_at desc si 'recent'). */
export function composeFilter(
  events: EventWithScore[],
  filters: ExplorerFilters,
  ctx: { department: string | null; now: Date },
): EventWithScore[] {
  const range = periodToRange(filters.period, ctx.now)
  let result = events.filter(ev => {
    if (filters.tags.size > 0 && !ev.tags?.some(t => filters.tags.has(t))) return false
    if (filters.zone === 'mine' && ctx.department && ev.department !== ctx.department) return false
    const end = new Date(ev.end_date)
    const start = new Date(ev.start_date)
    if (range.past) return end < ctx.now
    if (range.from && start < range.from && end < ctx.now) return false
    if (range.to && start >= range.to) return false
    return true
  })
  result = [...result].sort(filters.period === 'recent'
    ? (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    : (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
  return result
}
