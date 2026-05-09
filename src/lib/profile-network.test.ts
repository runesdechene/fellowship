import { describe, it, expect } from 'vitest'
import { getRecentPreview, shouldShowFollowBack, type NetworkMember } from './profile-network'

const make = (id: string, joinedAt: string): NetworkMember => ({
  id,
  display_name: id,
  brand_name: null,
  avatar_url: null,
  public_slug: null,
  craft_type: null,
  city: null,
  joinedAt,
})

describe('getRecentPreview', () => {
  it('returns the N most recent members sorted desc by joinedAt', () => {
    const a = make('a', '2026-01-01T00:00:00Z')
    const b = make('b', '2026-03-01T00:00:00Z')
    const c = make('c', '2026-02-01T00:00:00Z')
    const d = make('d', '2026-04-01T00:00:00Z')
    const result = getRecentPreview([a, b, c, d], 3)
    expect(result.map(m => m.id)).toEqual(['d', 'b', 'c'])
  })

  it('returns all members when N >= length', () => {
    const a = make('a', '2026-01-01T00:00:00Z')
    expect(getRecentPreview([a], 3).map(m => m.id)).toEqual(['a'])
  })

  it('returns an empty array for empty input', () => {
    expect(getRecentPreview([], 3)).toEqual([])
  })

  it('does not mutate the input array', () => {
    const a = make('a', '2026-01-01T00:00:00Z')
    const b = make('b', '2026-03-01T00:00:00Z')
    const input = [a, b]
    getRecentPreview(input, 3)
    expect(input.map(m => m.id)).toEqual(['a', 'b'])
  })
})

describe('shouldShowFollowBack', () => {
  it('returns true for owner viewing a non-friend follower', () => {
    expect(shouldShowFollowBack('x', new Set(['a', 'b']), true)).toBe(true)
  })

  it('returns false when the follower is already a friend', () => {
    expect(shouldShowFollowBack('a', new Set(['a', 'b']), true)).toBe(false)
  })

  it('returns false when not the owner (visiting another profile)', () => {
    expect(shouldShowFollowBack('x', new Set(['a']), false)).toBe(false)
  })
})
