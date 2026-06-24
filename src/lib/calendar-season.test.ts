import { describe, it, expect } from 'vitest'
import { seasonSummary } from './calendar-season'
import type { CalendarMonth } from '@/hooks/use-calendar'

const ev = (name: string, start: string, isFriend = false) => ({
  id: name, name, startDate: new Date(start), endDate: new Date(start),
  primaryTag: 'autre', status: 'confirme', paymentStatus: null,
  visibility: 'public', city: '', department: '', imageUrl: null, slug: null,
  isFriend,
})
const month = (events: ReturnType<typeof ev>[]): CalendarMonth =>
  ({ month: 0, label: 'Janvier', year: 2026, events } as unknown as CalendarMonth)

describe('seasonSummary', () => {
  const now = new Date('2026-06-10T12:00:00')

  it('compte mes dates, ignore les dates amies', () => {
    const months = [month([ev('A', '2026-06-20'), ev('Ami', '2026-06-25', true), ev('B', '2026-07-05')])]
    expect(seasonSummary(months, now).total).toBe(2)
  })
  it('prochaine date = 1re à venir (mienne), en jours pleins', () => {
    const months = [month([ev('Passé', '2026-06-01'), ev('Avalon', '2026-06-17')])]
    expect(seasonSummary(months, now).next).toEqual({ name: 'Avalon', daysUntil: 7 })
  })
  it('aucune date à venir → next null', () => {
    const months = [month([ev('Passé', '2026-06-01')])]
    expect(seasonSummary(months, now).next).toBeNull()
  })
  it('saison vide → total 0, next null', () => {
    expect(seasonSummary([month([])], now)).toEqual({ total: 0, next: null })
  })
})
