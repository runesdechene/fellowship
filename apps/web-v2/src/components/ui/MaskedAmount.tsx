/**
 * QUOI     — un montant masqué : une mosaïque de carrés dans la couleur du texte, à la place de
 *            recettes chiffrées et verrouillées (et de tout ce qui en dépend : CA, bénéfice, totaux).
 * POURQUOI — plus joli que « •••• € », et un faux chiffre flouté se reconnaissait d'un montant à
 *            l'autre (Uriel, 01/11/2026). Aucun chiffre n'est écrit : rien du vrai montant ne passe
 *            dans la page, pas même sa longueur.
 */
export function MaskedAmount() {
  return <span className="masked-amount" role="img" aria-label="Montant masqué" />
}
