import { describe, it, expect, beforeEach } from 'vitest'
import { seenKey, getLastSeen, markSeenNow } from './community-seen'

beforeEach(() => localStorage.clear())

describe('community-seen', () => {
  it('seenKey est scopé par acteur', () => {
    expect(seenKey('abc')).toBe('fellowship-communaute-seen-abc')
  })
  it("getLastSeen renvoie l'epoch 0 ISO si rien", () => {
    expect(getLastSeen('abc')).toBe(new Date(0).toISOString())
  })
  it('markSeenNow puis getLastSeen renvoie la valeur écrite', () => {
    markSeenNow('abc', '2026-06-11T10:00:00.000Z')
    expect(getLastSeen('abc')).toBe('2026-06-11T10:00:00.000Z')
  })
})
