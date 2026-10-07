/**
 * QUOI     — la phrase qui nomme des amis : « Gautier y va aussi », « Gautier et Uriel y vont
 *            aussi », « Gautier et 2 autres y vont aussi ».
 * POURQUOI — la même tournure sert la fiche (« y vont aussi ») et la vitrine (« t'y
 *            retrouvent ») ; seul le verbe change.
 * ATTENTION — le premier nom se met en gras à l'affichage : il revient à part (`first`).
 */

export function nameLine(
  names: string[],
  verb: { one: string; many: string },
): { first: string; rest: string } | null {
  const [first, second] = names
  if (first === undefined) return null
  if (second === undefined) return { first, rest: ` ${verb.one}` }
  if (names.length === 2) return { first, rest: ` et ${second} ${verb.many}` }
  return { first, rest: ` et ${names.length - 1} autres ${verb.many}` }
}
