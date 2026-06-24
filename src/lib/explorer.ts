import type { EventWithScore } from '@/types/database'

export const VIEW_MODES = ['upcoming', 'recent', 'all'] as const
export type ViewMode = (typeof VIEW_MODES)[number]

export function applyViewMode(
  events: EventWithScore[],
  mode: ViewMode,
  now: Date,
): EventWithScore[] {
  if (mode === 'upcoming') {
    return events.filter(ev => new Date(ev.start_date) >= now)
  }
  if (mode === 'recent') {
    return [...events].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }
  return events
}

export interface DeckStyle {
  transform: string; opacity: number; filter: string; zIndex: number;
  pointerEvents: 'auto' | 'none'; isCenter: boolean;
  /** Opacité du voile (couleur du fond) posé sur l'affiche pour la faire reculer — fonctionne
   *  sur photo ET fallback sans transparence (≠ propriété opacity). 0 = aucun voile (carte centrale). */
  veil: number
}

/**
 * Coverflow : style d'une carte selon son décalage à la carte active (porté du layout() maquette).
 * `isLight` : en mode jour, les voisines **fondent par opacité** (le fond clair transparaît = éclairci)
 * au lieu d'être assombries par un filtre brightness (qui les rend tristes sur fond clair).
 */
// Profondeur progressive : 4 rangs de voisines de plus en plus « lointaines »
// (translateZ recule, scale rétrécit, flou augmente, voile s'épaissit). Le deck est en
// preserve-3d → l'empilement suit le translateZ (z-index ignoré). Voile = couleur du fond
// posée sur l'affiche (≠ opacity → opaque, marche sur photo ET fallback).
const DEPTH: Record<number, { tx: number; sc: number; tz: number; blur: number; vN: number; vD: number }> = {
  1: { tx: 110, sc: 0.78, tz: -55,  blur: 0,   vN: 0.36, vD: 0.50 },
  2: { tx: 158, sc: 0.65, tz: -130, blur: 0.8, vN: 0.55, vD: 0.70 },
  3: { tx: 192, sc: 0.55, tz: -215, blur: 1.8, vN: 0.72, vD: 0.84 },
  4: { tx: 214, sc: 0.47, tz: -310, blur: 2.8, vN: 0.85, vD: 0.93 },
}

export function deckCardStyle(offset: number, isLight = false): DeckStyle {
  const ao = Math.abs(offset)
  if (offset === 0) {
    return {
      transform: `translate(-50%,-50%) translateX(0%) translateZ(0px) rotateY(0deg) scale(1)`,
      opacity: 1, filter: 'none', zIndex: 20, pointerEvents: 'auto', isCenter: true, veil: 0,
    }
  }
  if (ao > 4) {
    return {
      transform: `translate(-50%,-50%) translateX(${offset > 0 ? 230 : -230}%) translateZ(-380px) scale(.42)`,
      opacity: 0, filter: 'none', zIndex: 0, pointerEvents: 'none', isCenter: false, veil: 0,
    }
  }
  const dir = offset < 0 ? -1 : 1
  const d = DEPTH[ao]
  const rot = dir < 0 ? 18 : -18
  return {
    transform: `translate(-50%,-50%) translateX(${dir * d.tx}%) translateZ(${d.tz}px) rotateY(${rot}deg) scale(${d.sc})`,
    opacity: 1,
    filter: d.blur ? `blur(${d.blur}px)` : 'none',
    veil: isLight ? d.vD : d.vN,
    zIndex: 20 - ao,
    pointerEvents: ao <= 2 ? 'auto' : 'none',  // cartes lointaines = décor, pas cliquables
    isCenter: false,
  }
}

export type Period = 'all' | 'this-month' | 'next-3' | 'next-6' | 'next-12' | 'recent' | 'past'
export const PERIODS: { value: Period; label: string }[] = [
  { value: 'all', label: "Jusqu'à la fin des temps" },
  { value: 'this-month', label: 'Ce mois-ci' },
  { value: 'next-3', label: '3 prochains mois' },
  { value: 'next-6', label: '6 prochains mois' },
  { value: 'next-12', label: '12 prochains mois' },
  { value: 'recent', label: '✨ Ajoutés récemment' },
  { value: 'past', label: '✅ Terminés' },
]

export interface PeriodRange { from: Date | null; to: Date | null; past?: boolean; recent?: boolean }

export function periodToRange(period: Period, now: Date): PeriodRange {
  const addMonths = (n: number) => { const d = new Date(now); d.setMonth(d.getMonth() + n); return d }
  switch (period) {
    case 'all': return { from: now, to: null }
    case 'this-month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      return { from, to }
    }
    case 'next-3': return { from: now, to: addMonths(3) }
    case 'next-6': return { from: now, to: addMonths(6) }
    case 'next-12': return { from: now, to: addMonths(12) }
    case 'recent': return { from: now, to: addMonths(12), recent: true }
    case 'past': return { from: null, to: now, past: true }
  }
}

export type Zone = 'mine' | 'france'
export interface ExplorerFilters {
  tags: Set<string>
  zone: Zone
  period: Period
  query?: string
  /** Filtre "mois précis" (depuis le calendrier) : prend le pas sur `period`. */
  monthRange?: { from: Date; to: Date } | null
}

/** Plage [1er du mois, 1er du mois suivant) pour un mois calendaire précis. */
export function monthRangeFor(year: number, month: number): { from: Date; to: Date } {
  return { from: new Date(year, month, 1), to: new Date(year, month + 1, 1) }
}

/** Normalise pour une comparaison insensible à la casse et aux accents. */
export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Parse 'YYYY-MM-DD' comme date LOCALE (évite le décalage UTC→tz qui changeait le jour). */
function parseLocalDate(d: string): Date {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, (m || 1) - 1, day || 1)
}

/** Plage de dates affichée façon dock (« 12 juin », « 12–14 juin », « 31 juil – 2 août »). */
export function formatEventDateRange(start: string, end: string): string {
  const s = parseLocalDate(start), e = parseLocalDate(end)
  const day = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric' })
  const month = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'long' })
  if (start === end) return `${day(s)} ${month(s)}`
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) return `${day(s)}–${day(e)} ${month(s)}`
  const sm = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
  return `${day(s)} ${sm(s)} – ${day(e)} ${sm(e)}`
}

/** Compose tags ∩ zone ∩ période, puis tri (chronologique ; created_at desc si 'recent'). */
export function eventBadge(event: EventWithScore, now: Date): 'nouveau' | 'populaire' | null {
  const created = new Date(event.created_at).getTime()
  const days = (now.getTime() - created) / 86_400_000
  if (days >= 0 && days <= 30) return 'nouveau'
  if ((event.review_count ?? 0) >= 3) return 'populaire'
  return null
}

export type ActorKind = 'person' | 'entity'

export type ExplorerView = 'slideshow' | 'grid'

/** Pur (testable) : tolère null / valeurs inconnues → défaut 'slideshow'. */
export function parseExplorerView(raw: string | null): ExplorerView {
  return raw === 'grid' ? 'grid' : 'slideshow'
}

export function readExplorerView(): ExplorerView {
  try { return parseExplorerView(localStorage.getItem('explorer-view')) } catch { return 'slideshow' }
}

export function writeExplorerView(v: ExplorerView): void {
  try { localStorage.setItem('explorer-view', v) } catch { /* ignore */ }
}

export type StatusVariant =
  | 'repere' | 'dossier' | 'accepte' | 'apayer' | 'acompte' | 'inscrit'
  | 'refuse' | 'termine' | 'going'

export interface StatusChip { label: string; variant: StatusVariant }

export interface ChipContext {
  /** end_date < now — override « Terminé », prioritaire sur tout le reste. */
  isPast?: boolean
}

/**
 * Pastille de statut de participation, vocabulaire unifié (Explorer / Événement / Calendrier).
 * Exposant : Repéré → Dossier envoyé → Accepté → À payer → Inscrit (+ Refusé). Personne : Repéré / J'y vais.
 * Pour un exposant le stand est toujours payant : « Accepté » = confirme avant paiement, « Inscrit » = payé.
 */
export function participationChip(
  status: string | null | undefined,
  payment: string | null | undefined,
  kind: ActorKind,
  ctx?: ChipContext,
): StatusChip | null {
  if (!status) return null
  if (ctx?.isPast) return { label: '✓ Terminé', variant: 'termine' }
  if (status === 'interesse') return { label: '★ Repéré', variant: 'repere' }
  if (status === 'refuse') return { label: '✕ Refusé', variant: 'refuse' }
  if (kind === 'person') return { label: '✓ J’y vais', variant: 'going' }

  // Exposant
  if (status === 'en_cours') return { label: '📨 Dossier envoyé', variant: 'dossier' }

  // Branche « accepté » : confirme (= Accepté) ou inscrit (legacy). Le paiement décide.
  // Paiement en 3 étapes : a_payer → acompte_verse → paye. Le CHECK constraint DB
  // (migration 20260528220000_payment_status_acompte) accepte les 3 valeurs.
  if (payment === 'paye') return { label: '✓ Inscrit', variant: 'inscrit' }
  if (payment === 'acompte_verse') return { label: '€ Acompte versé', variant: 'acompte' }
  if (payment === 'a_payer') return { label: '€ À payer', variant: 'apayer' }
  return { label: '✦ Accepté', variant: 'accepte' }
}

/** Variant de statut → token couleur + label court (sans emoji) pour le point DA. */
const DOT_BY_VARIANT: Record<StatusVariant, { colorVar: string; label: string }> = {
  termine: { colorVar: 'var(--muted-foreground)', label: 'Terminé' },
  repere:  { colorVar: 'var(--status-repere)',    label: 'Repéré' },
  refuse:  { colorVar: 'var(--status-refuse)',    label: 'Refusé' },
  going:   { colorVar: 'var(--status-inscrit)',   label: 'J\'y vais' },
  dossier: { colorVar: 'var(--status-dossier)',   label: 'Dossier' },
  inscrit: { colorVar: 'var(--status-inscrit)',   label: 'Inscrit' },
  acompte: { colorVar: 'var(--status-acompte)',   label: 'Acompte' },
  apayer:  { colorVar: 'var(--status-apayer)',    label: 'À payer' },
  accepte: { colorVar: 'var(--status-accepte)',   label: 'Accepté' },
}

/**
 * Point coloré + label court pour le Calendrier (DA). Dérive du même arbre de
 * décision que participationChip ; retourne null quand il n'y a pas de chip
 * (ex. date amie sans statut perso).
 */
export function participationDot(
  status: string | null | undefined,
  payment: string | null | undefined,
  kind: ActorKind,
  ctx?: ChipContext,
): { colorVar: string; label: string } | null {
  const chip = participationChip(status, payment, kind, ctx)
  if (!chip) return null
  return DOT_BY_VARIANT[chip.variant]
}

/**
 * L'autoplay du coverflow ne tourne que là où il peut être mis en pause proprement.
 * Sur pointeur tactile (`coarse`) il n'y a pas de hover → la pause-au-survol ne se
 * déclenche jamais et la carte défilerait pendant qu'on vise un tap (#4). On le coupe donc
 * sur tactile : sur mobile on swipe soi-même. Reste actif sur desktop (pause au survol/scrub).
 */
export function shouldAutoplay(opts: {
  reducedMotion: boolean
  count: number
  scrubbing: boolean
  hoverPause: boolean
  coarsePointer: boolean
}): boolean {
  const { reducedMotion, count, scrubbing, hoverPause, coarsePointer } = opts
  return !reducedMotion && !coarsePointer && count > 1 && !scrubbing && !hoverPause
}

export function composeFilter(
  events: EventWithScore[],
  filters: ExplorerFilters,
  ctx: { department: string | null; now: Date },
): EventWithScore[] {
  const range = periodToRange(filters.period, ctx.now)
  const q = normalizeText(filters.query ?? '')
  const searching = q.length > 0
  let result = events.filter(ev => {
    if (filters.tags.size > 0 && !ev.tags?.some(t => filters.tags.has(t))) return false
    if (filters.zone === 'mine' && ctx.department && ev.department !== ctx.department) return false
    // Recherche texte (nom + ville) : on cherche dans tout le temps, période ignorée.
    if (searching) {
      return normalizeText(ev.name).includes(q) || normalizeText(ev.city ?? '').includes(q)
    }
    const start = new Date(ev.start_date)
    // Mode "mois précis" (clic depuis le calendrier) : événements dont la date de
    // DÉBUT tombe dans le mois, comme le calendrier. Prend le pas sur `period`.
    if (filters.monthRange) {
      return start >= filters.monthRange.from && start < filters.monthRange.to
    }
    const end = new Date(ev.end_date)
    if (range.past) return end < ctx.now
    // Périodes à venir : ne jamais afficher un événement déjà terminé (corrige « Ce mois-ci »).
    if (end < ctx.now) return false
    if (range.to && start >= range.to) return false
    return true
  })
  // Chronologique pour les vues "à venir", "ce mois-ci" et "mois précis".
  const chrono = !!filters.monthRange || searching || (filters.period !== 'past' && filters.period !== 'recent')
  result = [...result].sort(
    chrono
      ? (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      : filters.period === 'past'
        // Terminés : du plus récemment terminé au plus ancien.
        ? (a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
        // Récents : par date d'ajout décroissante.
        : (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return result
}
