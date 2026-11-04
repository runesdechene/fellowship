/**
 * QUOI     — la sélection Fellowship : le score d'une fête, et pour un type et une zone, les cinq
 *            fêtes à ne pas rater puis les autres dates à venir.
 * POURQUOI — les exposants demandent leurs dates à leur IA, qui cherche des superlatifs (« les 5
 *            fêtes médiévales à ne pas rater en Occitanie »). Cette page leur répond, en faits.
 *            Spec : docs/superpowers/specs/2026-11-03-pages-pour-les-ia-design.md.
 * ATTENTION — la sélection est la nôtre : jamais « selon les exposants » (trop peu d'avis). Le
 *            même calcul sert la page servie aux machines et la page de l'application.
 */
import { addDays, formatDayMonth, parseSqlDate, todayIso } from './dates'
import { zoneOf } from './regions'

export type SelectionEvent = {
  id: string
  slug: string
  name: string
  city: string
  department: string | null
  country: string
  start_date: string
  end_date: string
  registration_deadline: string | null
  registration_url: string | null
  stand_price: string | null
  stand_size: string | null
  image_url: string | null
  expected_attendance: string | null
  edition: number | null
  tags: string[]
  /** Totaux publics de `event_public_stats` : jamais une identité. */
  interested: number
  registered: number
  rating: number | null
  rating_count: number
}

export type Selection = {
  title: string
  season: number
  top: SelectionEvent[]
  others: SelectionEvent[]
}

const TOP_SIZE = 5
// Sous ce seuil, la page serait vide ou presque : Google et les IA la jugent creuse.
const MIN_EVENTS = 3

// Le nom d'un type au pluriel, tel qu'il se dit dans une recherche. Un type absent d'ici n'a pas
// de sélection : on n'invente pas « les autres immanquables ».
const TYPE_TITLES: Record<string, string> = {
  biker: 'rassemblements bikers',
  brocante: 'brocantes',
  culturel: 'festivals culturels',
  exposition: 'expositions',
  fantastique: 'festivals fantastiques',
  'festival-metal': 'festivals de metal',
  'festival-musique': 'festivals de musique',
  'fete-medievale': 'fêtes médiévales',
  foire: 'foires',
  gastronomique: 'salons gastronomiques',
  geek: 'salons geek',
  historique: 'fêtes historiques',
  litteraire: 'salons du livre',
  marche: 'marchés',
  'marche-createurs': 'marchés de créateurs',
  'marche-noel': 'marchés de Noël',
  outdoor: 'festivals outdoor',
  salon: 'salons',
  tatouage: 'conventions de tatouage',
  terroir: 'fêtes du terroir',
}

// « en Occitanie », mais « dans le Grand Est », « à La Réunion » : les exceptions seulement.
const ZONE_PREPOSITIONS: Record<string, string> = {
  'Grand Est': 'dans le',
  'Hauts-de-France': 'dans les',
  'Pays de la Loire': 'dans les',
  'La Réunion': 'à',
  Mayotte: 'à',
  Luxembourg: 'au',
}

/** Le premier nombre d'un texte libre (« environ 8 000 visiteurs » → 8000), 0 sans nombre. */
function firstNumber(text: string | null): number {
  const digits = /\d[\d\s.]*/.exec(text ?? '')?.[0].replace(/\D/g, '')
  return digits ? Number(digits) : 0
}

/** Plus haut = plus immanquable. Les poids sont un choix éditorial, réglable ; une note (1 à 5)
 *  compte au-dessus ou au-dessous de 3, le milieu de l’échelle. */
export function score(event: SelectionEvent): number {
  return (
    2 * Math.log10(1 + firstNumber(event.expected_attendance)) +
    Math.min(event.edition ?? 1, 20) / 5 +
    Math.log2(1 + event.interested + event.registered) +
    (event.rating !== null && event.rating_count > 0 ? event.rating - 3 : 0) -
    (event.stand_price ? 0 : 1) -
    (event.registration_url ? 0 : 1) -
    (event.image_url ? 0 : 0.5)
  )
}

/** La raison d'une ligne, en faits : « Stand 3×3 à 100 € · candidatures jusqu’au 15 mars ». */
export function reasonOf(event: SelectionEvent): string {
  const stand = event.stand_size || event.stand_price
  const exhibitors = event.interested + event.registered
  return [
    stand &&
      ['Stand', event.stand_size, event.stand_price && `à ${event.stand_price}`]
        .filter(Boolean)
        .join(' '),
    event.registration_deadline &&
      `candidatures jusqu’au ${formatDayMonth(parseSqlDate(event.registration_deadline))}`,
    exhibitors > 0 &&
      (exhibitors === 1 ? '1 exposant intéressé' : `${exhibitors} exposants intéressés`),
  ]
    .filter(Boolean)
    .join(' · ')
}

/** L'année où commencent le plus de fêtes de la page ; à égalité, la plus proche. */
function seasonOf(events: SelectionEvent[]): number {
  const counts = new Map<number, number>()
  for (const event of events) {
    const year = parseSqlDate(event.start_date).getFullYear()
    counts.set(year, (counts.get(year) ?? 0) + 1)
  }
  const [best] = [...counts].sort(([a, n], [b, m]) => m - n || a - b)
  return best?.[0] ?? 0
}

function byDateThenName(a: SelectionEvent, b: SelectionEvent): number {
  return a.start_date.localeCompare(b.start_date) || a.name.localeCompare(b.name, 'fr')
}

export function buildSelection(
  events: SelectionEvent[],
  type: string,
  zone: string,
  today: Date,
): Selection | null {
  const typeTitle = TYPE_TITLES[type]
  if (!typeTitle) return null
  // Comparé en jours : une fête finit ce soir, pas à l'heure où la page est demandée.
  const day = todayIso(today)
  const horizon = todayIso(addDays(today, 365))
  const upcoming = events.filter(
    (event) =>
      event.tags.includes(type) &&
      zoneOf(event) === zone &&
      event.end_date >= day &&
      event.start_date < horizon,
  )
  if (upcoming.length < MIN_EVENTS) return null

  const ranked = [...upcoming].sort((a, b) => score(b) - score(a) || byDateThenName(a, b))
  const top = ranked.slice(0, TOP_SIZE)
  const season = seasonOf(upcoming)
  return {
    title: `Les ${typeTitle} immanquables pour un exposant ${ZONE_PREPOSITIONS[zone] ?? 'en'} ${zone} en ${season} — la sélection Fellowship`,
    season,
    top,
    others: ranked.slice(TOP_SIZE).sort(byDateThenName),
  }
}
