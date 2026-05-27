/** Nombre max de spécialités affichables sans casser le header. */
export const SPECIALTIES_CAP = 3

/** Ajoute https:// si l'URL n'a pas de schéma ; trim ; chaîne vide si rien. */
export function normalizeLinkUrl(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) return t
  return `https://${t}`
}

/** Ajoute un chip trimé : ignore le vide, dédoublonne (casse/espaces), respecte le cap. */
export function addChip(list: string[], raw: string): string[] {
  const t = raw.trim()
  if (!t) return list
  if (list.length >= SPECIALTIES_CAP) return list
  const norm = (s: string) => s.trim().toLowerCase()
  if (list.some(c => norm(c) === norm(t))) return list
  return [...list, t]
}

/** Mappe une liste ordonnée d'ids vers leurs positions séquentielles (0-based). */
export function reorderPositions(orderedIds: string[]): Array<{ id: string; position: number }> {
  return orderedIds.map((id, position) => ({ id, position }))
}

/**
 * Droit d'édition de la vitrine = la personne connectée est membre de l'entité.
 * Miroir frontend du RLS backend `can_act_as(actor_id)` : l'autorisation tient à
 * l'appartenance (memberships), pas à l'acteur actif. `memberEntityIds` = actor_id
 * des entités de la personne (via memberships).
 */
export function canEditVitrine(memberEntityIds: string[], entityActorId: string | null): boolean {
  return !!entityActorId && memberEntityIds.includes(entityActorId)
}
