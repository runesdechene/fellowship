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
  pointerEvents: 'auto' | 'none'; isCenter: boolean
}

/**
 * Coverflow : style d'une carte selon son décalage à la carte active (porté du layout() maquette).
 * `isLight` : en mode jour, les voisines **fondent par opacité** (le fond clair transparaît = éclairci)
 * au lieu d'être assombries par un filtre brightness (qui les rend tristes sur fond clair).
 */
export function deckCardStyle(offset: number, isLight = false): DeckStyle {
  const ao = Math.abs(offset)
  if (ao > 2) {
    return {
      transform: `translate(-50%,-50%) translateX(${offset > 0 ? 170 : -170}%) scale(.5)`,
      opacity: 0, filter: 'none', zIndex: 0, pointerEvents: 'none', isCenter: false,
    }
  }
  const tx = offset === 0 ? 0 : (offset < 0 ? -1 : 1) * (ao === 1 ? 120 : 172)
  const rot = offset === 0 ? 0 : (offset < 0 ? 18 : -18)
  const sc = offset === 0 ? 1 : (ao === 1 ? 0.74 : 0.62)
  // Voisines : on les fait reculer. Nuit = assombrir ; jour = éclaircir + désaturer
  // (brightness > 1, jamais d'opacité → les cartes restent OPAQUES, pas de transparence).
  const dim = offset === 0
    ? 'none'
    : isLight
      ? (ao === 1 ? 'brightness(1.07) saturate(.6)' : 'brightness(1.14) saturate(.45)')
      : (ao === 1 ? 'brightness(.45)' : 'brightness(.3)')
  return {
    transform: `translate(-50%,-50%) translateX(${tx}%) rotateY(${rot}deg) scale(${sc})`,
    opacity: 1,
    filter: dim,
    zIndex: offset === 0 ? 20 : 10 - ao, pointerEvents: 'auto', isCenter: offset === 0,
  }
}

export type Period = 'all' | 'this-month' | 'next-3' | 'next-6' | 'next-12' | 'recent' | 'past'
export const PERIODS: { value: Period; label: string }[] = [
  { value: 'all', label: "Jusqu'à la fin des temps" },
  { value: 'this-month', label: 'Ce mois-ci' },
  { value: 'next-3', label: '3 prochains mois' },
  { value: 'next-6', label: '6 prochains mois' },
  { value: 'next-12', label: '12 prochains mois' },
  { value: 'recent', label: '🆕 Ajoutés récemment' },
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
export interface ExplorerFilters { tags: Set<string>; zone: Zone; period: Period; query?: string }

/** Normalise pour une comparaison insensible à la casse et aux accents. */
export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
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

export type StatusVariant =
  | 'repere' | 'dossier' | 'accepte' | 'apayer' | 'inscrit'
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
  if (payment === 'paye') return { label: '✓ Inscrit', variant: 'inscrit' }
  if (payment === 'a_payer') return { label: '€ À payer', variant: 'apayer' }
  return { label: '✦ Accepté', variant: 'accepte' }
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
    const end = new Date(ev.end_date)
    const start = new Date(ev.start_date)
    if (range.past) return end < ctx.now
    // Périodes à venir : ne jamais afficher un événement déjà terminé (corrige « Ce mois-ci »).
    if (end < ctx.now) return false
    if (range.to && start >= range.to) return false
    return true
  })
  result = [...result].sort(
    searching || filters.period !== 'past' && filters.period !== 'recent'
      ? (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      : filters.period === 'past'
        // Terminés : du plus récemment terminé au plus ancien.
        ? (a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
        // Récents : par date d'ajout décroissante.
        : (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return result
}
