/**
 * QUOI     — la liste « Qui y va » d'une fiche : le statut de chaque ami (Inscrit, Dossier
 *            envoyé) et l'ordre — les inscrits d'abord, puis par nom.
 * POURQUOI — maquette 2218:2 (variante sauge, Uriel, 11/10/2026) : ce qui est validé se dit en
 *            vert ; un dossier envoyé attend encore. Logique pure, testée (who-goes.test.ts).
 */

export interface GoerStatus {
  label: 'Inscrit' | 'Dossier envoyé'
  validated: boolean
}

/** Seuls les statuts « programmés » entrent dans la liste (ceux que compte la fiche). */
export function goerStatus(status: string | null): GoerStatus | null {
  if (status === 'inscrit' || status === 'confirme') return { label: 'Inscrit', validated: true }
  if (status === 'en_cours') return { label: 'Dossier envoyé', validated: false }
  return null
}

const NAME_ORDER = new Intl.Collator('fr', { sensitivity: 'base' })

export function sortGoers<T extends { name: string; status: string | null }>(goers: T[]): T[] {
  return [...goers].sort((a, b) => {
    const rank = (goer: T) => (goerStatus(goer.status)?.validated ? 0 : 1)
    return rank(a) - rank(b) || NAME_ORDER.compare(a.name, b.name)
  })
}
