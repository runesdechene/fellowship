import { describe, it, expect } from 'vitest'
import { sortReplies, canReply, canEditReply, canDeleteReply } from './review-replies'

describe('sortReplies', () => {
  it('trie du plus ancien au plus récent', () => {
    const rows = [
      { id: 'b', created_at: '2026-07-02T10:00:00Z' },
      { id: 'a', created_at: '2026-07-01T10:00:00Z' },
    ]
    expect(sortReplies(rows).map(r => r.id)).toEqual(['a', 'b'])
  })
  it('ne mute pas le tableau source', () => {
    const rows = [
      { id: 'b', created_at: '2026-07-02T10:00:00Z' },
      { id: 'a', created_at: '2026-07-01T10:00:00Z' },
    ]
    sortReplies(rows)
    expect(rows.map(r => r.id)).toEqual(['b', 'a'])
  })
})

describe('canReply', () => {
  it('true pour une entité', () => expect(canReply({ id: 'e1', kind: 'entity' })).toBe(true))
  it('false pour une personne', () => expect(canReply({ id: 'p1', kind: 'person' })).toBe(false))
  it('false si non connecté', () => expect(canReply(null)).toBe(false))
})

describe('canEditReply', () => {
  it('true si auteur', () => expect(canEditReply({ id: 'e1', kind: 'entity' }, { actor_id: 'e1' })).toBe(true))
  it('false si autre acteur', () => expect(canEditReply({ id: 'e2', kind: 'entity' }, { actor_id: 'e1' })).toBe(false))
  it('false si non connecté', () => expect(canEditReply(null, { actor_id: 'e1' })).toBe(false))
})

describe('canDeleteReply', () => {
  it('true si auteur', () => expect(canDeleteReply({ id: 'e1', kind: 'entity' }, { actor_id: 'e1' }, false)).toBe(true))
  it('true si admin même non-auteur', () => expect(canDeleteReply({ id: 'e2', kind: 'entity' }, { actor_id: 'e1' }, true)).toBe(true))
  it('false si ni auteur ni admin', () => expect(canDeleteReply({ id: 'e2', kind: 'entity' }, { actor_id: 'e1' }, false)).toBe(false))
  it('false si non connecté', () => expect(canDeleteReply(null, { actor_id: 'e1' }, true)).toBe(false))
})
