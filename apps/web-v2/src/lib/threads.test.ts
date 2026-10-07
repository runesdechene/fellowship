import { describe, expect, it } from 'vitest'
import {
  askBlocker,
  canAsk,
  canDelete,
  canMarkBest,
  deriveAudience,
  filterByChannels,
  sortReplies,
  sortThreads,
  visibleChannels,
} from './threads'

describe('le canal d’une question', () => {
  it('se déduit du type de l’acteur, il ne se choisit pas', () => {
    expect(deriveAudience({ id: 'a', kind: 'person' })).toBeNull()
    expect(deriveAudience({ id: 'a', kind: 'entity', entityType: 'exposant' })).toBe('exposant')
    expect(deriveAudience({ id: 'a', kind: 'entity', entityType: 'festival' })).toBe(
      'organisateur',
    )
  })

  // Une entité sans canal serait rejetée par la base : mieux vaut ne pas lui
  // proposer le bouton que de la laisser se heurter à une erreur.
  it('refuse une entité qui n’est ni exposant ni festival', () => {
    const autre = { id: 'a', kind: 'entity' as const, entityType: 'entreprise' }
    expect(deriveAudience(autre)).toBeNull()
    expect(canAsk(autre)).toBe(false)
  })

  it('refuse un visiteur non connecté', () => {
    expect(canAsk(null)).toBe(false)
  })

  // Fellowship ne fournit plus rien aux festivaliers (19 août 2026). Un compte
  // PERSONNEL n’a donc plus de canal et ne peut plus poser de question. Ce
  // test épingle la décision : sans lui, rien n’empêche de la défaire par
  // mégarde en rebranchant 'festivalier' dans deriveAudience.
  it('refuse un compte personnel — le canal festivalier est retiré', () => {
    const perso = { id: 'a', kind: 'person' as const }
    expect(deriveAudience(perso)).toBeNull()
    expect(canAsk(perso)).toBe(false)
    expect(visibleChannels([])).not.toContain('festivalier')
  })
})

describe('les canaux proposés au filtrage', () => {
  it('suit les casquettes possédées, dans un ordre stable', () => {
    expect(visibleChannels(['exposant', 'festival'])).toEqual([
      'exposant',
      'organisateur',
    ])
  })

  it('n’en propose aucun sans casquette', () => {
    expect(visibleChannels([])).toEqual([])
  })
})

describe('les droits', () => {
  const moi = { id: 'moi', kind: 'person' as const }

  it('laisse l’auteur de la question élire la meilleure réponse, personne d’autre', () => {
    expect(canMarkBest(moi, { actorId: 'moi' })).toBe(true)
    expect(canMarkBest(moi, { actorId: 'autre' })).toBe(false)
  })

  it('laisse un admin supprimer ce qu’il n’a pas écrit', () => {
    expect(canDelete(moi, { actorId: 'autre' }, false)).toBe(false)
    expect(canDelete(moi, { actorId: 'autre' }, true)).toBe(true)
  })
})

describe('les tris', () => {
  const replies = [
    { id: 'r1', createdAt: '2026-08-01T10:00:00Z' },
    { id: 'r2', createdAt: '2026-08-02T10:00:00Z' },
    { id: 'r3', createdAt: '2026-08-03T10:00:00Z' },
  ]

  it('met la meilleure réponse en tête, puis suit la chronologie', () => {
    expect(sortReplies(replies, 'r3').map((r) => r.id)).toEqual(['r3', 'r1', 'r2'])
  })

  it('reste chronologique quand aucune réponse n’est élue', () => {
    expect(sortReplies(replies, null).map((r) => r.id)).toEqual(['r1', 'r2', 'r3'])
  })

  // Un tri en place casserait l'état React qui a fourni le tableau.
  it('ne modifie pas le tableau d’origine', () => {
    const avant = [...replies]
    sortReplies(replies, 'r3')
    expect(replies).toEqual(avant)
  })

  it('montre les questions les plus récentes d’abord', () => {
    const threads = [
      { createdAt: '2026-08-01T10:00:00Z' },
      { createdAt: '2026-08-05T10:00:00Z' },
    ]
    expect(sortThreads(threads)[0].createdAt).toBe('2026-08-05T10:00:00Z')
  })
})

describe('le filtrage par canal', () => {
  it('ne garde que les canaux actifs', () => {
    const rows = [
      { audience: 'exposant' as const },
      { audience: 'festivalier' as const },
    ]
    expect(filterByChannels(rows, ['exposant'])).toHaveLength(1)
  })
})

describe('ce qui empêche de poster', () => {
  it('rend la raison, pas un simple refus', () => {
    expect(askBlocker('ok', '')).toContain('trois caractères')
    expect(askBlocker('a'.repeat(141), '')).toContain('140')
    expect(askBlocker('Une vraie question', 'x'.repeat(2001))).toContain('2000')
  })

  it('laisse passer une question valable', () => {
    expect(askBlocker('  Y a-t-il l’électricité ?  ', 'Sur la rue haute.')).toBeNull()
  })
})
