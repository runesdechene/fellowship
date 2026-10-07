/**
 * Acteurs visibles dans la recherche globale : uniquement les **entités** (exposants).
 * Les festivaliers (`kind = 'person'`) n'ont pas de vitrine publique accessible → on les
 * exclut des résultats. La recherche ne renvoie donc que des événements + des exposants.
 */
export function isSearchableActor(kind: string | null | undefined): boolean {
  return kind === 'entity'
}
