/**
 * QUOI     — un montant masqué : un faux chiffre, flouté, à la place de recettes chiffrées et
 *            verrouillées (et de tout ce qui en dépend : CA, bénéfice, totaux).
 * POURQUOI — plus joli que « •••• € » (Uriel, 01/11/2026). Le chiffre flouté est faux et toujours le
 *            même : rien du vrai montant ne passe dans la page, pas même sa longueur.
 */
const FAKE = '4 860 €'

export function MaskedAmount() {
  return (
    <span className="masked-amount" role="img" aria-label="Montant masqué">
      <span aria-hidden="true">{FAKE}</span>
    </span>
  )
}
