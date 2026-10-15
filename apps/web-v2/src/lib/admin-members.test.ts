/**
 * QUOI     — tests de lib/admin-members.ts : membres groupés par enseigne, résumé, rôle.
 * POURQUOI — une enseigne peut n'avoir plus aucun compte (Review Focus 3) : la ligne ne doit pas casser.
 */
import { describe, expect, it } from 'vitest'
import { groupMembers, membersSummary, roleLabel } from './admin-members'

describe('groupMembers', () => {
  it('garde l’ordre reçu dans chaque enseigne', () => {
    const map = groupMembers([
      { entity_id: 'a', actor_id: '1' },
      { entity_id: 'b', actor_id: '2' },
      { entity_id: 'a', actor_id: '3' },
    ])
    expect(map.get('a')?.map((m) => m.actor_id)).toEqual(['1', '3'])
    expect(map.get('b')?.length).toBe(1)
  })
})

describe('membersSummary', () => {
  it('dit le nombre de comptes en plus du premier', () => {
    expect(membersSummary(0)).toBe('aucun compte')
    expect(membersSummary(1)).toBe('seul compte')
    expect(membersSummary(2)).toBe('+ 1 membre')
    expect(membersSummary(4)).toBe('+ 3 membres')
  })
})

describe('roleLabel', () => {
  it('traduit les rôles de memberships', () => {
    expect(roleLabel('owner')).toBe('propriétaire')
    expect(roleLabel('admin')).toBe('admin')
    expect(roleLabel('member')).toBe('membre')
  })
})
