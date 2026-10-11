/**
 * QUOI     — tests du plan de suppression d'un compte : quelles enseignes partent avec, lesquelles
 *            restent, et qui en hérite.
 * POURQUOI — lot 9b : une enseigne partagée ne disparaît jamais avec un seul de ses membres, et ne
 *            reste jamais sans propriétaire. Ce plan est aussi l'aperçu montré avant de confirmer.
 */
import { describe, expect, test } from 'vitest'
import { deletionPlan, type Membership } from './deletion-plan'

const me = 'moi'
function m(entity: string, user: string, role: Membership['role'], createdAt: string): Membership {
  return {
    userActorId: user,
    entityActorId: entity,
    role,
    createdAt,
    brandName: `Enseigne ${entity}`,
  }
}

describe('deletionPlan', () => {
  test('seul membre : l’enseigne part avec', () => {
    expect(deletionPlan(me, [m('a', me, 'owner', '2026-01-01')])).toEqual({
      deleted: [{ entityActorId: 'a', brandName: 'Enseigne a' }],
      kept: [],
    })
  })

  test('partagée avec un autre propriétaire : elle reste, personne à promouvoir', () => {
    const plan = deletionPlan(me, [
      m('a', me, 'owner', '2026-01-01'),
      m('a', 'lui', 'owner', '2026-02-01'),
    ])
    expect(plan.kept).toEqual([{ entityActorId: 'a', brandName: 'Enseigne a', heirActorId: null }])
    expect(plan.deleted).toEqual([])
  })

  test('seul propriétaire d’une enseigne partagée : le membre le plus ancien hérite', () => {
    const plan = deletionPlan(me, [
      m('a', me, 'owner', '2026-01-01'),
      m('a', 'recent', 'member', '2026-05-01'),
      m('a', 'ancien', 'admin', '2026-03-01'),
    ])
    expect(plan.kept).toEqual([
      { entityActorId: 'a', brandName: 'Enseigne a', heirActorId: 'ancien' },
    ])
  })

  test('simple membre d’une enseigne : elle reste, sans héritier', () => {
    const plan = deletionPlan(me, [
      m('a', 'patron', 'owner', '2026-01-01'),
      m('a', me, 'member', '2026-02-01'),
    ])
    expect(plan.kept).toEqual([{ entityActorId: 'a', brandName: 'Enseigne a', heirActorId: null }])
  })

  test('plusieurs enseignes, chacune son sort, dans l’ordre des noms', () => {
    const plan = deletionPlan(me, [
      m('b', me, 'owner', '2026-01-01'),
      m('a', me, 'owner', '2026-01-01'),
      m('c', me, 'owner', '2026-01-01'),
      m('c', 'autre', 'member', '2026-02-01'),
    ])
    expect(plan.deleted.map((entity) => entity.entityActorId)).toEqual(['a', 'b'])
    expect(plan.kept.map((entity) => entity.heirActorId)).toEqual(['autre'])
  })
})
