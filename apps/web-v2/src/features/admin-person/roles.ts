/**
 * QUOI     — les trois rôles d'un compte (Utilisateur, V2, Admin) et leur libellé.
 * POURQUOI — une seule liste pour l'en-tête et le sélecteur de rôle, qu'elles ne divergent pas.
 */
export const ROLES = [
  { value: 'user', label: 'Utilisateur' },
  { value: 'v2', label: 'V2' },
  { value: 'admin', label: 'Admin' },
]

export function personRoleLabel(role: string): string {
  return ROLES.find((entry) => entry.value === role)?.label ?? role
}
