/**
 * QUOI     — les trois rôles d'un compte (Utilisateur, V2, Admin) et leur libellé.
 * POURQUOI — une seule liste pour l'en-tête et le sélecteur de rôle, qu'elles ne divergent pas.
 */
export const ROLES = [
  { value: 'user', label: 'Utilisateur' },
  { value: 'v2', label: 'V2' },
  { value: 'admin', label: 'Admin' },
]

// Rôle posé par l'admin V1 (à retirer avec elle) : il se lit, mais n'est pas une option du sélecteur.
export function personRoleLabel(role: string): string {
  if (role === 'suspended') return 'Suspendu par la V1'
  return ROLES.find((entry) => entry.value === role)?.label ?? role
}
