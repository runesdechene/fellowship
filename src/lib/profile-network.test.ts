import { describe, it, expect } from 'vitest'
import {
  getRecentPreview,
  shouldShowFollowBack,
  networkListItemDisplay,
  AVATAR_GRADIENTS,
  type NetworkMember,
} from './profile-network'

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

describe('networkListItemDisplay', () => {
  const base: NetworkMember = {
    id: 'u1',
    display_name: 'Alice',
    brand_name: null,
    avatar_url: null,
    public_slug: 'alice',
    craft_type: 'Forgeron',
    city: 'Paris',
    joinedAt: '2026-05-01T00:00:00Z',
  }

  it('prefers brand_name over display_name', () => {
    const d = networkListItemDisplay({ ...base, brand_name: 'Atelier du Chêne' })
    expect(d.name).toBe('Atelier du Chêne')
  })

  it('falls back to display_name when brand_name is null', () => {
    expect(networkListItemDisplay(base).name).toBe('Alice')
  })

  it('falls back to "Utilisateur" when both names are null', () => {
    expect(networkListItemDisplay({ ...base, display_name: null }).name).toBe('Utilisateur')
  })

  it('builds target from public_slug when present', () => {
    expect(networkListItemDisplay(base).target).toBe('/@alice')
  })

  it('falls back to id when public_slug is null', () => {
    expect(networkListItemDisplay({ ...base, public_slug: null }).target).toBe('/@u1')
  })

  it('passes avatarUrl through unchanged (the bug fix — was always null in old code)', () => {
    const d = networkListItemDisplay({ ...base, avatar_url: 'https://example.com/a.jpg' })
    expect(d.avatarUrl).toBe('https://example.com/a.jpg')
    expect(networkListItemDisplay({ ...base, avatar_url: null }).avatarUrl).toBeNull()
  })

  it('returns the uppercase first letter as fallback initial', () => {
    expect(networkListItemDisplay({ ...base, display_name: 'alice' }).fallbackInitial).toBe('A')
    expect(networkListItemDisplay({ ...base, brand_name: 'Étoile' }).fallbackInitial).toBe('É')
  })

  it('returns "?" when both names resolve to empty string', () => {
    // ?? only catches null/undefined, so empty string passes through; a name with no
    // chars has no first letter, hence the '?' fallback for the avatar initial.
    expect(networkListItemDisplay({ ...base, display_name: '', brand_name: null }).fallbackInitial).toBe('?')
  })

  it('picks a gradient deterministically from the resolved name', () => {
    const d1 = networkListItemDisplay(base)
    const d2 = networkListItemDisplay({ ...base, public_slug: 'different' })
    expect([d1.gradientFrom, d1.gradientTo]).toEqual([d2.gradientFrom, d2.gradientTo])
    expect(AVATAR_GRADIENTS.flat()).toContain(d1.gradientFrom)
  })

  it('passes craftType through unchanged', () => {
    expect(networkListItemDisplay(base).craftType).toBe('Forgeron')
    expect(networkListItemDisplay({ ...base, craft_type: null }).craftType).toBeNull()
  })
})
