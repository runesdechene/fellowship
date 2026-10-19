/**
 * QUOI     — tests de lib/app-updates.ts : le fil des commentaires, la signature, les cœurs, la
 *            pastille, l'enseigne qui signe.
 * POURQUOI — la logique pure des Nouveautés se teste ici, sans navigateur.
 */
import { describe, expect, it } from 'vitest'
import {
  isUnread,
  likersLabel,
  signature,
  signingEntity,
  threadOf,
  type UpdateComment,
} from './app-updates'

function c(id: string, parentId: string | null, time: string): UpdateComment {
  return {
    id,
    parentId,
    actorId: 'p',
    entityActorId: null,
    body: id,
    createdAt: `2026-10-19T${time}:00Z`,
  }
}

describe('threadOf', () => {
  it('range une réponse à une réponse sous la racine', () => {
    const t = threadOf([
      c('a', null, '10:00'),
      c('b', 'a', '10:05'),
      c('d', 'b', '10:07'),
      c('e', null, '10:06'),
    ])
    expect(t.map((x) => x.root.id)).toEqual(['a', 'e'])
    expect(t[0]?.replies.map((r) => r.id)).toEqual(['b', 'd'])
  })

  it('remet dans l’ordre ce qui arrive en désordre', () => {
    const t = threadOf([c('b', 'a', '10:05'), c('e', null, '10:06'), c('a', null, '10:00')])
    expect(t.map((x) => x.root.id)).toEqual(['a', 'e'])
    expect(t[0]?.replies.map((r) => r.id)).toEqual(['b'])
  })
})

describe('signature', () => {
  it('signe « Prénom (Enseigne) »', () => {
    expect(signature('Uriel', 'Runes de Chêne')).toBe('Uriel (Runes de Chêne)')
  })
  it('signe du prénom seul sans enseigne', () => {
    expect(signature('Uriel', null)).toBe('Uriel')
  })
})

describe('likersLabel', () => {
  it('compte les autres', () => {
    expect(likersLabel(['Gautier', 'Lina'], 24)).toBe('Gautier, Lina et 22 autres')
    expect(likersLabel(['Gautier', 'Lina'], 3)).toBe('Gautier, Lina et 1 autre')
    expect(likersLabel(['Gautier', 'Lina'], 2)).toBe('Gautier et Lina')
    expect(likersLabel(['Gautier'], 1)).toBe('Gautier')
    expect(likersLabel([], 0)).toBe('')
  })
})

describe('isUnread', () => {
  it('allume la pastille seulement pour une note plus récente', () => {
    expect(isUnread('2026-10-19T10:00:00Z', '2026-10-19T09:00:00Z')).toBe(true)
    expect(isUnread('2026-10-19T10:00:00Z', '2026-10-19T11:00:00Z')).toBe(false)
    expect(isUnread(null, '2026-10-19T11:00:00Z')).toBe(false)
  })
})

describe('signingEntity', () => {
  const entities = [{ actor_id: 'rdc' }, { actor_id: 'atelier' }]
  it('signe au nom de l’enseigne incarnée', () => {
    expect(signingEntity({ id: 'atelier', kind: 'entity' }, entities)).toBe('atelier')
  })
  it('signe au nom de la première enseigne depuis la personne', () => {
    expect(signingEntity({ id: 'p', kind: 'person' }, entities)).toBe('rdc')
    expect(signingEntity({ id: 'p', kind: 'person' }, [])).toBeNull()
  })
})
