import { describe, it, expect } from 'vitest'
import {
  deriveAudience, visibleChannels, canAsk, canReply, canEdit, canDelete,
  canMarkBest, isSolved, sortReplies, sortThreads, filterByChannels, channelLabel,
} from './event-threads'

describe('deriveAudience', () => {
  it('personne -> festivalier', () => {
    expect(deriveAudience({ id: 'p', kind: 'person' })).toBe('festivalier')
  })
  it('entité exposant -> exposant', () => {
    expect(deriveAudience({ id: 'e', kind: 'entity', entityType: 'exposant' })).toBe('exposant')
  })
  it('entité festival -> organisateur', () => {
    expect(deriveAudience({ id: 'e', kind: 'entity', entityType: 'festival' })).toBe('organisateur')
  })
  it('entité entreprise -> null (ne peut pas poster)', () => {
    expect(deriveAudience({ id: 'e', kind: 'entity', entityType: 'entreprise' })).toBeNull()
  })
  it('non connecté -> null', () => {
    expect(deriveAudience(null)).toBeNull()
  })
})

describe('visibleChannels', () => {
  it('festivalier pur : un seul canal', () => {
    expect(visibleChannels({ hasPerson: true, entityTypes: [] })).toEqual(['festivalier'])
  })
  it('exposant : les deux canaux (a toujours un compte perso)', () => {
    expect(visibleChannels({ hasPerson: true, entityTypes: ['exposant'] })).toEqual(['festivalier', 'exposant'])
  })
  it('festival : festivalier + organisateur', () => {
    expect(visibleChannels({ hasPerson: true, entityTypes: ['festival'] })).toEqual(['festivalier', 'organisateur'])
  })
})

describe('canAsk / canReply', () => {
  it('canAsk vrai pour une personne', () => {
    expect(canAsk({ id: 'p', kind: 'person' })).toBe(true)
  })
  it('canAsk faux pour une entreprise', () => {
    expect(canAsk({ id: 'e', kind: 'entity', entityType: 'entreprise' })).toBe(false)
  })
  it('canReply vrai pour tout acteur connecté (cross-canal)', () => {
    expect(canReply({ id: 'p', kind: 'person' })).toBe(true)
    expect(canReply(null)).toBe(false)
  })
})

describe('canEdit / canDelete / canMarkBest', () => {
  const me = { id: 'a1', kind: 'person' as const }
  it('canEdit seulement son propre contenu', () => {
    expect(canEdit(me, { actor_id: 'a1' })).toBe(true)
    expect(canEdit(me, { actor_id: 'a2' })).toBe(false)
  })
  it('canDelete son contenu ou si admin', () => {
    expect(canDelete(me, { actor_id: 'a2' }, false)).toBe(false)
    expect(canDelete(me, { actor_id: 'a2' }, true)).toBe(true)
    expect(canDelete(me, { actor_id: 'a1' }, false)).toBe(true)
  })
  it('canMarkBest seulement pour l\'auteur du thread', () => {
    expect(canMarkBest(me, { actor_id: 'a1' })).toBe(true)
    expect(canMarkBest(me, { actor_id: 'a2' })).toBe(false)
  })
})

describe('isSolved', () => {
  it('résolu si best_reply_id non nul', () => {
    expect(isSolved({ best_reply_id: 'r1' })).toBe(true)
    expect(isSolved({ best_reply_id: null })).toBe(false)
  })
})

describe('sortReplies', () => {
  it('meilleure réponse en tête, puis chrono', () => {
    const rows = [
      { id: 'r1', created_at: '2026-01-01T10:00:00Z' },
      { id: 'r2', created_at: '2026-01-01T09:00:00Z' },
      { id: 'r3', created_at: '2026-01-01T11:00:00Z' },
    ]
    expect(sortReplies(rows, 'r3').map(r => r.id)).toEqual(['r3', 'r2', 'r1'])
  })
  it('sans meilleure réponse : chrono ascendant', () => {
    const rows = [
      { id: 'r1', created_at: '2026-01-01T10:00:00Z' },
      { id: 'r2', created_at: '2026-01-01T09:00:00Z' },
    ]
    expect(sortReplies(rows, null).map(r => r.id)).toEqual(['r2', 'r1'])
  })
})

describe('sortThreads', () => {
  it('plus récent d\'abord', () => {
    const rows = [
      { created_at: '2026-01-01T09:00:00Z' },
      { created_at: '2026-01-01T11:00:00Z' },
    ]
    expect(sortThreads(rows)[0].created_at).toBe('2026-01-01T11:00:00Z')
  })
})

describe('filterByChannels', () => {
  it('ne garde que les canaux actifs', () => {
    const rows = [
      { audience: 'festivalier' as const },
      { audience: 'exposant' as const },
    ]
    expect(filterByChannels(rows, ['festivalier'])).toEqual([{ audience: 'festivalier' }])
  })
})

describe('channelLabel', () => {
  it('libellés FR', () => {
    expect(channelLabel('festivalier')).toBe('Festivaliers')
    expect(channelLabel('exposant')).toBe('Exposants')
    expect(channelLabel('organisateur')).toBe('Organisateurs')
  })
})
