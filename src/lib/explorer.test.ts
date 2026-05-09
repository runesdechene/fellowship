import { describe, it, expect } from 'vitest'
import { applyViewMode } from './explorer'
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
