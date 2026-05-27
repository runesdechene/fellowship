import { describe, it, expect } from 'vitest'
import { groupParticipationsByMonth } from './mes-dates'
import type { ParticipationWithEvent } from '@/types/database'

const NOW = new Date('2026-05-15T12:00:00Z')

// Fabrique une participation minimale (seuls les champs lus sont renseignés).
function part(id: string, start: string, end: string, status = 'interesse'): ParticipationWithEvent {
  return {
    id,
    event_id: 'e' + id,
    status,
    payment_status: null,
    visibility: 'amis',
    events: { id: 'e' + id, name: 'Festival ' + id, start_date: start, end_date: end, city: 'Lyon', department: '69', image_url: null, tags: ['medieval'] },
  } as unknown as ParticipationWithEvent
}

describe('groupParticipationsByMonth', () => {
  it('upcoming : ne garde que end_date >= now, tri croissant, bucket sur le mois de start_date', () => {
    const parts = [
      part('1', '2026-06-05', '2026-06-06'),
      part('2', '2026-05-20', '2026-05-21'),
      part('3', '2026-01-10', '2026-01-11'), // passé → exclu
    ]
    const out = groupParticipationsByMonth(parts, { now: NOW, direction: 'upcoming' })
    expect(out.map(b => `${b.year}-${b.month}`)).toEqual(['2026-4', '2026-5'])
    expect(out[0].label).toBe('Mai 2026')
    expect(out[0].events[0].id).toBe('2')
    expect(out[1].events[0].id).toBe('1')
  })

  it('upcoming : un événement en cours (start passé, end futur) reste visible', () => {
    const out = groupParticipationsByMonth([part('1', '2026-05-14', '2026-05-16')], { now: NOW, direction: 'upcoming' })
    expect(out).toHaveLength(1)
    expect(out[0].events[0].id).toBe('1')
  })

  it('upcoming : traverse le changement d\'année', () => {
    const parts = [part('1', '2027-01-10', '2027-01-11'), part('2', '2026-12-20', '2026-12-21')]
    const out = groupParticipationsByMonth(parts, { now: NOW, direction: 'upcoming' })
    expect(out.map(b => `${b.year}-${b.month}`)).toEqual(['2026-11', '2027-0'])
  })

  it('upcoming : tri intra-mois croissant', () => {
    const parts = [part('1', '2026-06-25', '2026-06-26'), part('2', '2026-06-03', '2026-06-04')]
    const out = groupParticipationsByMonth(parts, { now: NOW, direction: 'upcoming' })
    expect(out[0].events.map(e => e.id)).toEqual(['2', '1'])
  })

  it('past : ne garde que end_date < now, buckets en ordre décroissant (plus récent d\'abord)', () => {
    const parts = [part('1', '2026-01-10', '2026-01-11'), part('2', '2026-03-10', '2026-03-11'), part('3', '2026-06-01', '2026-06-02')]
    const out = groupParticipationsByMonth(parts, { now: NOW, direction: 'past' })
    expect(out.map(b => `${b.year}-${b.month}`)).toEqual(['2026-2', '2026-0'])
  })

  it('exclut les mois vides et les participations sans events', () => {
    const orphan = { id: 'x', event_id: 'ex', status: 'interesse', payment_status: null, visibility: 'amis', events: null } as unknown as ParticipationWithEvent
    const out = groupParticipationsByMonth([orphan, part('1', '2026-06-05', '2026-06-06')], { now: NOW, direction: 'upcoming' })
    expect(out).toHaveLength(1)
  })
})
