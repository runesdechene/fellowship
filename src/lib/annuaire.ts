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

/** Accord singulier/pluriel : UNE seule mécanique pour toute la page. Zéro
 *  prend le singulier (« 0 événement à venir »), règle française. */
function plural(n: number, one: string, many: string): string {
  return n > 1 ? many : one
}

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

/** `today` au format ISO `YYYY-MM-DD`, en heure LOCALE — jamais via
 *  `toISOString()` (UTC) : dans un fuseau positif (UTC+1/+2), juste après
 *  minuit local, `toISOString()` retomberait encore sur la veille en UTC et
 *  ferait déborder d'un jour le filtre `.gte('end_date', today)` côté serveur.
 *  Miroir de `parseDay`/`startOfDay` qui appliquent la même règle. */
export function todayIso(today: Date): string {
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
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
    if (left <= 30) return { kind: 'soon', label: `Clôture dans ${left} ${plural(left, 'jour', 'jours')}` }
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

/** Les univers du pied de page : seulement ceux qui ont au moins un
 *  événement à venir (une porte qui ouvre sur du vide est pire que pas de
 *  porte), triés par nombre d'événements décroissant, plafonnés à `limit`.
 *  Égalité de compte → l'ordre d'apparition dans `list` est conservé (tri
 *  stable de JS), sans signification particulière : pas besoin de plus. */
export function topUniverses(list: PublicEvent[], limit = 8): string[] {
  const counts = new Map<string, number>()
  for (const e of list) {
    const slug = e.tags?.[0]
    if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([slug]) => slug)
}

/** Un événement « prend des exposants » s'il porte une URL de candidature ou
 *  une date limite. LE prédicat, unique : compteurs du hero, bande de dernier
 *  appel et puce de filtre s'y réfèrent tous, sans le recopier. */
export function takesExhibitors(e: PublicEvent): boolean {
  return Boolean(e.registration_url || e.registration_deadline)
}

export function countWithApplications(list: PublicEvent[]): number {
  return list.filter(takesExhibitors).length
}

/** Compteurs du hero. Uniquement des nombres mesurés : la page plaide
 *  l'honnêteté, elle ne peut pas s'ouvrir sur un chiffre gonflé — ni sur un
 *  zéro qui n'est en réalité qu'une lecture ratée. `list` à `null` veut dire
 *  « on ne sait pas » : les deux premières pastilles disparaissent, exactement
 *  comme la troisième quand le compte d'exposants est inconnu. */
export function countCounters(list: PublicEvent[] | null, exposants: number | null): Array<{ n: string; label: string }> {
  const out: Array<{ n: string; label: string }> = []
  if (list) {
    const withApplications = countWithApplications(list)
    out.push({ n: String(list.length), label: plural(list.length, 'événement à venir', 'événements à venir') })
    out.push({ n: String(withApplications), label: plural(withApplications, 'prend des exposants', 'prennent des exposants') })
  }
  if (exposants != null) out.push({ n: String(exposants), label: 'exposants inscrits' })
  return out
}

/** Le premier point du bloc gratuit. `count` à `null` (lecture ratée) →
 *  la promesse reste vraie sans avancer de nombre. */
export function searchScopeLabel(count: number | null): string {
  if (count == null) return 'Chercher dans l’annuaire'
  return `Chercher dans ${count} ${plural(count, 'événement', 'événements')}`
}

/** La phrase chiffrée de la bande de dernier appel, ou `null` quand la lecture
 *  a échoué : on ne clôt pas la page sur un chiffre qu'on n'a pas mesuré. */
export function ctaCountsSentence(list: PublicEvent[] | null): string | null {
  if (!list) return null
  const w = countWithApplications(list)
  return `${list.length} ${plural(list.length, 'événement à venir', 'événements à venir')}, `
    + `${w} qui ${plural(w, 'prend', 'prennent')} des exposants.`
}

/** Annonce vocale (aria-live) du nombre de résultats après une recherche ou
 *  un filtre — sans elle, taper dans le champ ne produit aucun retour. */
export function resultsLabel(n: number): string {
  if (n === 0) return 'Aucun événement ne correspond'
  return `${n} ${plural(n, 'événement trouvé', 'événements trouvés')}`
}
