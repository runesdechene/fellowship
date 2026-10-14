/**
 * QUOI     — l'assemblage de la landing : à partir des vrais festivals de Fellowship, tout ce que
 *            ses écrans affichent, avec l'exposant de démonstration posé dessus.
 * POURQUOI — lot 11c (spec 2026-10-14-v2-landing-11c-design.md) : chaque élément de la landing
 *            change quand Fellowship change ; seule la « personne » vient de lib/landing-demo.ts.
 * ATTENTION — une donnée manquante rend un tableau vide ou null : l'écran qui en dépend se cache,
 *            jamais un zéro ni une case vide.
 */
import { parseSqlDate } from './dates'
import { DEMO, type DemoStatus } from './landing-demo'

export const WALL_POSTERS = 30
const MONTHS = 4
const PER_MONTH = 2
const DOSSIERS = 4
const FOR_YOU = 3
const DAY = 24 * 60 * 60 * 1000

export interface ShowcaseRow {
  id: string
  name: string
  image_url: string | null
  tags: string[] | null
  start_date: string
  end_date: string
  city: string
  department: string | null
  created_at: string
}

export interface ShowEvent {
  id: string
  name: string
  imageUrl: string | null
  tags: string[] | null
  startDate: Date
  endDate: Date
  place: string
}

export interface Showcase {
  wall: string[]
  crowd: { event: ShowEvent; count: number } | null
  exhibitors: number | null
  months: { month: Date; events: (ShowEvent & { status: DemoStatus })[] }[]
  dossiers: (ShowEvent & { status: DemoStatus; paid: number; total: number })[]
  oneClick: ShowEvent | null
  pdf: ShowEvent | null
  recent: (ShowEvent & { daysAgo: number })[]
  forYou: ShowEvent[]
}

/** « Limoges (87) » — un code postal ou un « Orne (61) » ramené au numéro du département. */
export function placeOf(city: string, department: string | null): string {
  const raw = (department ?? '').trim()
  if (!raw) return city
  const inParens = /\(([0-9AB]{2,3})\)/.exec(raw)?.[1]
  const dept = inParens ?? (/^\d{5}$/.test(raw) ? raw.slice(0, 2) : raw)
  return `${city} (${dept})`
}

const OBJECT = '/storage/v1/object/public/'
const RENDER = '/storage/v1/render/image/public/'

/** Une miniature de l'affiche, servie par le stockage : les fonds flous et le mur restent légers. */
export function posterThumb(url: string, width: number): string {
  if (!url.includes(OBJECT)) return url
  return `${url.replace(OBJECT, RENDER)}?width=${String(width)}&quality=60`
}

function toEvent(r: ShowcaseRow): ShowEvent {
  return {
    id: r.id,
    name: r.name.trim(),
    imageUrl: r.image_url,
    tags: r.tags,
    startDate: parseSqlDate(r.start_date),
    endDate: parseSqlDate(r.end_date),
    place: placeOf(r.city.trim(), r.department),
  }
}

const statusOf = (index: number): DemoStatus =>
  DEMO.statuses[index % DEMO.statuses.length] ?? 'interesse'

export function buildShowcase(
  input: {
    upcoming: ShowcaseRow[]
    registered: ReadonlyMap<string, number>
    recent: ShowcaseRow[]
    exhibitors: number | null
  },
  today: Date,
): Showcase {
  const events = input.upcoming.map(toEvent)
  const withPoster = events.filter((e) => e.imageUrl)

  let crowd: Showcase['crowd'] = null
  for (const e of events) {
    const count = input.registered.get(e.id) ?? 0
    if (count > (crowd?.count ?? 0)) crowd = { event: e, count }
  }

  const months = Array.from({ length: MONTHS }, (_, k) => {
    const month = new Date(today.getFullYear(), today.getMonth() + k, 1)
    const inMonth = events
      .map((e, i) => ({ ...e, status: statusOf(i) }))
      .filter(
        (e) =>
          e.startDate.getFullYear() === month.getFullYear() &&
          e.startDate.getMonth() === month.getMonth(),
      )
      .slice(0, PER_MONTH)
    return { month, events: inMonth }
  })

  const dossiers = events.slice(0, DOSSIERS).map((e, i) => ({
    ...e,
    status: statusOf(i),
    paid: DEMO.dossiers[i]?.paid ?? 0,
    total: DEMO.dossiers[i]?.total ?? 0,
  }))

  const crowdId = crowd?.event.id
  const oneClick = withPoster.find((e) => e.id !== crowdId) ?? null
  const pdf = events.find((e) => e.id !== crowdId && e.id !== oneClick?.id) ?? null
  const forYou = withPoster.filter((e) => e.id !== crowdId).slice(-FOR_YOU)

  const recent = input.recent.map((r) => ({
    ...toEvent(r),
    daysAgo: Math.max(0, Math.floor((today.getTime() - new Date(r.created_at).getTime()) / DAY)),
  }))

  return {
    wall: withPoster.slice(0, WALL_POSTERS).flatMap((e) => (e.imageUrl ? [e.imageUrl] : [])),
    crowd,
    exhibitors: input.exhibitors,
    months,
    dossiers,
    oneClick,
    pdf,
    recent,
    forYou,
  }
}
