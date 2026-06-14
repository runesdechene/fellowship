import { describe, it, expect } from 'vitest'
import { countActiveDates, canAddDate, FREE_DATES_QUOTA } from './date-quota'
import type { ParticipationWithEvent } from '@/types/database'

const NOW = new Date('2026-05-15T12:00:00Z')

function part(id: string, end: string, status = 'interesse'): ParticipationWithEvent {
  return {
    id, event_id: 'e' + id, status, payment_status: null, visibility: 'amis',
    events: { id: 'e' + id, name: 'F' + id, start_date: end, end_date: end, city: 'Lyon', department: '69', image_url: null, tags: ['medieval'] },
  } as unknown as ParticipationWithEvent
}

describe('FREE_DATES_QUOTA', () => {
  it('vaut 10', () => expect(FREE_DATES_QUOTA).toBe(10))
})

describe('countActiveDates', () => {
  it('compte les dates à venir actives (end_date >= now)', () => {
    const parts = [part('1', '2026-06-01'), part('2', '2026-07-01')]
    expect(countActiveDates(parts, NOW)).toBe(2)
  })

  it('exclut les dates passées (end_date < now)', () => {
    const parts = [part('1', '2026-06-01'), part('2', '2026-01-01')]
    expect(countActiveDates(parts, NOW)).toBe(1)
  })

  it('exclut le statut refuse', () => {
    const parts = [part('1', '2026-06-01'), part('2', '2026-07-01', 'refuse')]
    expect(countActiveDates(parts, NOW)).toBe(1)
  })

  it('compte un événement en cours (start passé, end futur)', () => {
    expect(countActiveDates([part('1', '2026-05-20')], NOW)).toBe(1)
  })

  it('ignore les participations sans events', () => {
    const orphan = { id: 'x', event_id: 'ex', status: 'interesse', payment_status: null, visibility: 'amis', events: null } as unknown as ParticipationWithEvent
    expect(countActiveDates([orphan, part('1', '2026-06-01')], NOW)).toBe(1)
  })

  it('liste vide → 0', () => expect(countActiveDates([], NOW)).toBe(0))
})

describe('canAddDate', () => {
  it('entité gratuite sous le quota → true', () => expect(canAddDate('free', 'entity', 9)).toBe(true))
  it('entité gratuite pile au quota → false', () => expect(canAddDate('free', 'entity', 10)).toBe(false))
  it('entité gratuite au-delà → false', () => expect(canAddDate('free', 'entity', 11)).toBe(false))
  it('entité Pro → true quel que soit used', () => expect(canAddDate('pro', 'entity', 99)).toBe(true))
  it('personne → true quel que soit used', () => expect(canAddDate('free', 'person', 99)).toBe(true))
})
