import { describe, it, expect } from 'vitest'
import { reviewerDisplay, canReview } from './review-visibility'

const base = { author_label: 'Rune de Chêne', author_avatar_url: 'a.jpg', author_slug: 'rune' }

describe('reviewerDisplay', () => {
  it('self → mode self avec le nom', () => {
    expect(reviewerDisplay({ ...base, is_self: true, identity_visible: true }).mode).toBe('self')
  })
  it('ami (identity_visible) → named', () => {
    const d = reviewerDisplay({ ...base, is_self: false, identity_visible: true })
    expect(d.mode).toBe('named'); expect(d.label).toBe('Rune de Chêne'); expect(d.slug).toBe('rune')
  })
  it('non-ami (identity masquée) → anonymous, pas de slug/avatar', () => {
    const d = reviewerDisplay({ author_label: null, author_avatar_url: null, author_slug: null, is_self: false, identity_visible: false })
    expect(d.mode).toBe('anonymous'); expect(d.label).toBe('Un exposant vérifié')
    expect(d.slug).toBeNull(); expect(d.avatarUrl).toBeNull()
  })
  it('anonLabel personnalisable (réponses)', () => {
    const d = reviewerDisplay({ author_label: null, author_avatar_url: null, author_slug: null, is_self: false, identity_visible: false }, { anonLabel: 'Un exposant' })
    expect(d.label).toBe('Un exposant')
  })
})

describe('canReview', () => {
  it('vrai seulement si inscrit', () => {
    expect(canReview('inscrit')).toBe(true)
    expect(canReview('interesse')).toBe(false)
    expect(canReview(null)).toBe(false)
    expect(canReview(undefined)).toBe(false)
  })
})
