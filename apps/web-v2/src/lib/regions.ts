/**
 * QUOI     — la région d'un département, par son numéro (« 63 » → « Auvergne-Rhône-Alpes »).
 * POURQUOI — le fil d'Ariane d'une fiche nomme la région, pas le département : c'est ce que les
 *            exposants tapent dans Google (décision du 23/10/2026).
 * ATTENTION — un numéro inconnu rend null : le fil s'arrête alors à l'univers.
 */

const REGIONS: Record<string, string[]> = {
  'Auvergne-Rhône-Alpes': ['01', '03', '07', '15', '26', '38', '42', '43', '63', '69', '73', '74'],
  'Bourgogne-Franche-Comté': ['21', '25', '39', '58', '70', '71', '89', '90'],
  Bretagne: ['22', '29', '35', '56'],
  'Centre-Val de Loire': ['18', '28', '36', '37', '41', '45'],
  Corse: ['2A', '2B'],
  'Grand Est': ['08', '10', '51', '52', '54', '55', '57', '67', '68', '88'],
  'Hauts-de-France': ['02', '59', '60', '62', '80'],
  'Île-de-France': ['75', '77', '78', '91', '92', '93', '94', '95'],
  Normandie: ['14', '27', '50', '61', '76'],
  'Nouvelle-Aquitaine': ['16', '17', '19', '23', '24', '33', '40', '47', '64', '79', '86', '87'],
  Occitanie: ['09', '11', '12', '30', '31', '32', '34', '46', '48', '65', '66', '81', '82'],
  'Pays de la Loire': ['44', '49', '53', '72', '85'],
  'Provence-Alpes-Côte d’Azur': ['04', '05', '06', '13', '83', '84'],
  Guadeloupe: ['971'],
  Martinique: ['972'],
  Guyane: ['973'],
  'La Réunion': ['974'],
  Mayotte: ['976'],
}

const BY_DEPARTMENT = new Map(
  Object.entries(REGIONS).flatMap(([region, departments]) =>
    departments.map((department) => [department, region] as const),
  ),
)

/** Le numéro de département dans ce que la base contient vraiment : « 63 », « Puy-de-Dôme (63) »
 *  ou un code postal (« 04100 » ; outre-mer sur trois chiffres, Corse 200-201 → 2A). */
function departmentCode(raw: string): string {
  const text = raw.trim().toUpperCase()
  const inParentheses = /\(([0-9AB]{2,3})\)/.exec(text)?.[1]
  if (inParentheses) return inParentheses
  if (!/^\d{5}$/.test(text)) return text
  if (text.startsWith('97')) return text.slice(0, 3)
  if (text.startsWith('20')) return text < '20200' ? '2A' : '2B'
  return text.slice(0, 2)
}

export function regionOf(department: string | null): string | null {
  return BY_DEPARTMENT.get(departmentCode(department ?? '')) ?? null
}
