import { describe, it, expect } from 'vitest'
import { applyViewMode, deckCardStyle, periodToRange, composeFilter } from './explorer'
import type { EventWithScore } from '@/types/database'

const NOW = new Date('2026-05-09T12:00:00Z')

const past = {
  id: '1',
  name: 'Past',
  start_date: '2026-01-01',
  created_at: '2026-04-01T00:00:00Z',
} as unknown as EventWithScore

const future = {
  id: '2',
  name: 'Future',
  start_date: '2026-08-01',
  created_at: '2026-04-15T00:00:00Z',
} as unknown as EventWithScore

const futureLater = {
  id: '3',
  name: 'Future Later',
  start_date: '2026-12-01',
  created_at: '2026-05-01T00:00:00Z',
} as unknown as EventWithScore

describe('applyViewMode', () => {
  it('mode=upcoming filters out past events and preserves caller order', () => {
    const result = applyViewMode([past, future, futureLater], 'upcoming', NOW)
    expect(result.map(e => e.id)).toEqual(['2', '3'])
  })

  it('mode=recent returns all events sorted by created_at descending', () => {
    const result = applyViewMode([past, future, futureLater], 'recent', NOW)
    expect(result.map(e => e.id)).toEqual(['3', '2', '1'])
  })

  it('mode=all returns events untouched (caller-provided order preserved)', () => {
    const result = applyViewMode([past, future, futureLater], 'all', NOW)
    expect(result.map(e => e.id)).toEqual(['1', '2', '3'])
  })

  it('returns an empty array for empty input regardless of mode', () => {
    expect(applyViewMode([], 'upcoming', NOW)).toEqual([])
    expect(applyViewMode([], 'recent', NOW)).toEqual([])
    expect(applyViewMode([], 'all', NOW)).toEqual([])
  })
})

const ev = (p: Partial<EventWithScore>): EventWithScore => ({
  id: p.id ?? crypto.randomUUID(), name: p.name ?? 'E', description: null, image_url: null,
  city: p.city ?? 'Lyon', department: p.department ?? '69',
  start_date: p.start_date ?? '2026-07-01', end_date: p.end_date ?? '2026-07-02',
  tags: p.tags ?? [], created_at: p.created_at ?? '2026-01-01',
  avg_overall: null, review_count: null, registration_deadline: null,
  registration_url: null, external_url: null, contact_email: null, registration_note: null,
} as EventWithScore)

describe('deckCardStyle', () => {
  it('centre (offset 0)', () => {
    const s = deckCardStyle(0)
    expect(s.isCenter).toBe(true)
    expect(s.transform).toContain('rotateY(0deg)')
    expect(s.transform).toContain('scale(1)')
    expect(s.opacity).toBe(1)
  })
  it('voisin droit (offset +1)', () => {
    const s = deckCardStyle(1)
    expect(s.isCenter).toBe(false)
    expect(s.transform).toContain('translateX(120%)')
    expect(s.transform).toContain('rotateY(-18deg)')
    expect(s.filter).toBe('brightness(.45)')
  })
  it('hors fenêtre (offset 3)', () => {
    const s = deckCardStyle(3)
    expect(s.opacity).toBe(0)
    expect(s.pointerEvents).toBe('none')
  })
})

describe('periodToRange', () => {
  const now = new Date('2026-06-15T12:00:00')
  it('next-3', () => {
    const r = periodToRange('next-3', now)
    expect(r.from?.getTime()).toBe(now.getTime())
    expect(r.to?.getMonth()).toBe(8)
    expect(r.past).toBeFalsy()
  })
  it('past', () => { expect(periodToRange('past', now).past).toBe(true) })
  it('recent', () => { expect(periodToRange('recent', now).recent).toBe(true) })
})

describe('composeFilter', () => {
  const now = new Date('2026-06-15')
  const events = [
    ev({ id: 'a', tags: ['medieval'], department: '69', start_date: '2026-07-10', end_date: '2026-07-11' }),
    ev({ id: 'b', tags: ['musique'], department: '75', start_date: '2026-07-10', end_date: '2026-07-11' }),
    ev({ id: 'c', tags: ['medieval'], department: '69', start_date: '2026-01-10', end_date: '2026-01-11' }),
  ]
  it('filtre par tag + période exclut le passé', () => {
    const r = composeFilter(events, { tags: new Set(['medieval']), zone: 'france', period: 'next-12' }, { department: '69', now })
    expect(r.map(e => e.id)).toEqual(['a'])
  })
  it('filtre par zone (dept utilisateur)', () => {
    const r = composeFilter(events, { tags: new Set(), zone: 'mine', period: 'next-12' }, { department: '69', now })
    expect(r.every(e => e.department === '69')).toBe(true)
    expect(r.find(e => e.id === 'b')).toBeUndefined()
  })
  it('past ne garde que les terminés', () => {
    const r = composeFilter(events, { tags: new Set(), zone: 'france', period: 'past' }, { department: '69', now })
    expect(r.map(e => e.id)).toEqual(['c'])
  })
})
