/**
 * QUOI     — le plan de suppression d'un compte : les enseignes qui partent avec la personne, celles
 *            qui restent, et le membre qui hérite de la propriété quand elle était seule à l'avoir.
 * POURQUOI — lot 9b (Uriel, 11/10/2026) : les enseignes dont on est le seul membre partent avec le
 *            compte ; les partagées restent aux autres. Ce même plan est l'aperçu de la confirmation
 *            et ce que la fonction delete-account exécute.
 * ATTENTION — recopié dans supabase/functions/delete-account/ par scripts/sync-push-phrases.mjs :
 *            il ne dépend de rien.
 */

export interface Membership {
  userActorId: string
  entityActorId: string
  role: 'owner' | 'admin' | 'member'
  createdAt: string
  brandName: string
}

export interface DeletionPlan {
  deleted: { entityActorId: string; brandName: string }[]
  kept: { entityActorId: string; brandName: string; heirActorId: string | null }[]
}

export function deletionPlan(personId: string, memberships: Membership[]): DeletionPlan {
  const mine = memberships
    .filter((membership) => membership.userActorId === personId)
    .sort((a, b) => a.brandName.localeCompare(b.brandName, 'fr'))
  const plan: DeletionPlan = { deleted: [], kept: [] }
  for (const own of mine) {
    const others = memberships
      .filter((m) => m.entityActorId === own.entityActorId && m.userActorId !== personId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    const entity = { entityActorId: own.entityActorId, brandName: own.brandName }
    if (others.length === 0) {
      plan.deleted.push(entity)
      continue
    }
    const anotherOwner = others.some((m) => m.role === 'owner')
    const heir = own.role === 'owner' && !anotherOwner ? (others[0]?.userActorId ?? null) : null
    plan.kept.push({ ...entity, heirActorId: heir })
  }
  return plan
}
