/**
 * QUOI     — ce qu'un visiteur sans compte ne voit pas.
 * POURQUOI — depuis la bascule (lot 12), tout compte connecté entre dans la V2 : il ne reste ici
 *            que la règle de la fiche privée, testable sans navigateur.
 */

/** Une fiche privée n'existe pas pour une personne sans session (lot 11b) : l'app ne la montre
 *  pas. Décidé sur la SESSION, pas sur l'acteur : une identité pas encore chargée n'est pas un
 *  visiteur. */
export function hiddenFromVisitor(isPrivate: boolean, signedIn: boolean): boolean {
  return isPrivate && !signedIn
}
