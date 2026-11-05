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

/** Un morceau de phrase : du texte, ou un nom en gras. */
export type NamePart = string | { strong: string }

/**
 * La fiche nomme TOUT LE MONDE jusqu'à trois (Uriel, 11/10/2026 : « Gautier et 2 autres »,
 * « comment je sais qui c'est ? ») : « A, B et C y vont aussi » ; au-delà, « A, B, C et 2
 * autres y vont aussi ».
 */
export function namesLine(names: string[], verb: { one: string; many: string }): NamePart[] {
  const shown = names.slice(0, 3)
  const more = names.length - shown.length
  const parts: NamePart[] = []
  shown.forEach((name, index) => {
    if (index > 0) parts.push(index === shown.length - 1 && more === 0 ? ' et ' : ', ')
    parts.push({ strong: name })
  })
  if (parts.length === 0) return parts
  const many = names.length > 1
  parts.push(
    more > 0
      ? ` et ${String(more)} ${more === 1 ? 'autre' : 'autres'} ${verb.many}`
      : ` ${many ? verb.many : verb.one}`,
  )
  return parts
}

/** Un ami nommé sur une date ; `applied` : dossier envoyé, pas encore inscrit. */
interface Goer {
  name: string
  applied: boolean
}

const APPLIED = { one: 'a candidaté', many: 'ont candidaté' }

/** Les noms de ceux qui y vont, puis de ceux qui ont seulement candidaté. */
function split(goers: Goer[]): [string[], string[]] {
  return [
    goers.filter((goer) => !goer.applied).map((goer) => goer.name),
    goers.filter((goer) => goer.applied).map((goer) => goer.name),
  ]
}

/**
 * « Gautier et Lina y vont · Tom a candidaté » : une candidature n'est pas une place (retour bêta,
 * Uriel, 05/11/2026). Seul le premier nom passe en gras, comme `nameLine`.
 */
export function goersLine(
  goers: Goer[],
  verb: { one: string; many: string },
): { first: string; rest: string } | null {
  const [going, applied] = split(goers)
  const main = nameLine(going, verb)
  const tried = nameLine(applied, APPLIED)
  if (!main || !tried) return main ?? tried
  return { first: main.first, rest: `${main.rest} · ${tried.first}${tried.rest}` }
}

/** La même phrase pour la fiche, qui nomme jusqu'à trois amis de chaque côté. */
export function goersParts(goers: Goer[], verb: { one: string; many: string }): NamePart[] {
  const [going, applied] = split(goers)
  const main = namesLine(going, verb)
  const tried = namesLine(applied, APPLIED)
  if (main.length === 0 || tried.length === 0) return [...main, ...tried]
  return [...main, ' · ', ...tried]
}
