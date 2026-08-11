// src/lib/annuaire.ts
import { getTagEmoji, getTagLandingColor } from '@/components/ui/TagBadge'

export interface PublicEvent {
  id: string
  name: string
  slug: string | null
  city: string | null
  department: string | null
  start_date: string
  end_date: string
  image_url: string | null
  tags: string[] | null
  registration_url: string | null
  registration_deadline: string | null
  is_private: boolean
}

export type StatusKind = 'open' | 'soon' | 'info'
export interface CardStatus { kind: StatusKind; label: string }

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

/** Une date ISO `YYYY-MM-DD` lue en heure locale, sans décalage de fuseau. */
function parseDay(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Nombre de jours pleins entre deux jours calendaires. */
function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000)
}

/** Les seuls événements que l'annuaire public a le droit de montrer :
 *  jamais un privé (modèle unlisted : la RLS ne les cache pas, c'est à nous
 *  de ne pas les lister), jamais un événement terminé. Triés par date. */
export function toPublicList(rows: PublicEvent[], today: Date): PublicEvent[] {
  const t = startOfDay(today)
  return rows
    .filter(e => !e.is_private)
    .filter(e => parseDay(e.end_date ?? e.start_date) >= t)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
}

export function applicationStatus(e: PublicEvent, today: Date): CardStatus {
  if (e.registration_deadline) {
    const left = daysBetween(today, parseDay(e.registration_deadline))
    if (left < 0) return { kind: 'info', label: 'Candidatures closes' }
    if (left === 0) return { kind: 'soon', label: 'Clôture aujourd’hui' }
    if (left <= 30) return { kind: 'soon', label: `Clôture dans ${left} jour${left > 1 ? 's' : ''}` }
    return { kind: 'open', label: 'Candidatures ouvertes' }
  }
  if (e.registration_url) return { kind: 'open', label: 'Candidatures ouvertes' }
  return { kind: 'info', label: 'Voir la fiche' }
}

export function formatWhen(e: PublicEvent): string {
  const s = parseDay(e.start_date)
  const en = parseDay(e.end_date ?? e.start_date)
  const sameDay = e.start_date === e.end_date
  const sameMonth = s.getMonth() === en.getMonth() && s.getFullYear() === en.getFullYear()
  const dates = sameDay
    ? `${s.getDate()} ${MOIS[s.getMonth()]}`
    : sameMonth
      ? `${s.getDate()} – ${en.getDate()} ${MOIS[en.getMonth()]}`
      : `${s.getDate()} ${MOIS[s.getMonth()]} – ${en.getDate()} ${MOIS[en.getMonth()]}`
  return e.city ? `${dates} · ${e.city}` : dates
}

/** Repli sans accents ni casse : « MARCHE DE NOEL » doit trouver « Marché de Noël ». */
function fold(s: string): string {
  // Plage des diacritiques combinants, construite par échappements : écrite
  // en littéral dans une regex, elle se fait avaler par les copier-coller.
  const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g')
  return s.normalize('NFD').replace(DIACRITICS, '').toLowerCase()
}

export function searchEvents(list: PublicEvent[], query: string): PublicEvent[] {
  const q = fold(query.trim())
  if (!q) return list
  return list.filter(e =>
    fold(e.name).includes(q) ||
    fold(e.city ?? '').includes(q) ||
    fold(e.department ?? '').includes(q))
}

export interface AnnuaireCard {
  id: string
  href: string
  title: string
  when: string
  tagSlug: string | null
  tagColor: string
  tagLabel: string
  image: string | null
  status: CardStatus
}

/** `tagLabels` vient de la table `tags` (slug → libellé). Sans libellé connu,
 *  on n'invente rien : on retombe sur le slug. */
export function toCard(e: PublicEvent, today: Date, tagLabels: Record<string, string>): AnnuaireCard {
  const slug = e.tags?.[0] ?? null
  return {
    id: e.id,
    href: e.slug ? `/e/${e.slug}` : `/evenement/${e.id}`,
    title: e.name,
    when: formatWhen(e),
    tagSlug: slug,
    tagColor: slug ? getTagLandingColor(slug) : '#e8a06a',
    tagLabel: slug ? `${getTagEmoji(slug)} ${tagLabels[slug] ?? slug}` : '',
    image: e.image_url,
    status: applicationStatus(e, today),
  }
}

/** Compteurs du hero. Uniquement des nombres mesurés : la page plaide
 *  l'honnêteté, elle ne peut pas s'ouvrir sur un chiffre gonflé. */
export function countCounters(list: PublicEvent[], exposants: number | null): Array<{ n: string; label: string }> {
  const withApplications = list.filter(e => e.registration_url || e.registration_deadline).length
  const out = [
    { n: String(list.length), label: list.length > 1 ? 'événements à venir' : 'événement à venir' },
    { n: String(withApplications), label: withApplications > 1 ? 'prennent des exposants' : 'prend des exposants' },
  ]
  if (exposants != null) out.push({ n: String(exposants), label: 'exposants inscrits' })
  return out
}
