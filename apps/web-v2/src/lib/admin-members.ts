/**
 * QUOI     — les membres d'enseignes vus par l'administration : groupés, résumés, rôle en français.
 * POURQUOI — la liste charge les membres de 50 enseignes en une requête (admin_membres) et les
 *            range ensuite ; la fiche dit le rôle avec les mêmes mots.
 */
export function groupMembers<T extends { entity_id: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const row of rows) map.set(row.entity_id, [...(map.get(row.entity_id) ?? []), row])
  return map
}

export function membersSummary(count: number): string {
  if (count === 0) return 'aucun compte'
  if (count === 1) return 'seul compte'
  return count === 2 ? '+ 1 membre' : `+ ${count - 1} membres`
}

const ROLES: Record<string, string> = {
  owner: 'propriétaire',
  admin: 'administrateur',
  member: 'membre',
}

export function roleLabel(role: string): string {
  return ROLES[role] ?? role
}
