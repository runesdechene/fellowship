import type { CalendarMonth, CalendarEvent } from '@/hooks/use-calendar'

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

export interface SeasonSummary {
  /** Mes dates restant à faire (date de fin >= maintenant). */
  remaining: number
  /** Total de mes dates de l'année (passées + à venir). */
  total: number
  next: { name: string; daysUntil: number } | null
}

export function seasonSummary(months: CalendarMonth[], now: Date): SeasonSummary {
  const mine: CalendarEvent[] = months.flatMap(m => m.events).filter(e => !e.isFriend)
  const today = startOfDay(now)
  const past = mine.filter(e => e.endDate.getTime() < now.getTime()).length
  const remaining = mine.length - past
  const upcoming = mine
    .filter(e => startOfDay(e.startDate).getTime() >= today.getTime())
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  const next = upcoming[0]
    ? {
        name: upcoming[0].name,
        daysUntil: Math.round((startOfDay(upcoming[0].startDate).getTime() - today.getTime()) / 86400000),
      }
    : null
  return { remaining, total: mine.length, next }
}
