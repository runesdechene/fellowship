import type { ParticipationWithEvent } from '@/types/database'

// Périmètre du Cockpit (cf. lib/explorer.ts participationChip pour le modèle de statut).
const CONFIRMED = 'inscrit'          // présence acquise
const CANDIDATE = 'en_cours'         // candidature à boucler
const DUE_PAYMENTS = new Set(['a_payer', 'acompte_verse'])

function isUpcoming(p: ParticipationWithEvent, now: Date): boolean {
  return !!p.events && new Date(p.events.end_date).getTime() >= now.getTime()
}

function byStartAsc(a: ParticipationWithEvent, b: ParticipationWithEvent): number {
  return new Date(a.events.start_date).getTime() - new Date(b.events.start_date).getTime()
}

/** Hero : prochaine participation CONFIRMÉE uniquement (inscrit), à venir, la plus proche. */
export function selectNextFestival(
  parts: ParticipationWithEvent[],
  now: Date,
): ParticipationWithEvent | null {
  const confirmed = parts.filter(p => p.status === CONFIRMED && isUpcoming(p, now))
  if (confirmed.length === 0) return null
  return [...confirmed].sort(byStartAsc)[0]
}

/** « Tes prochains festivals » : inscrit + en_cours à venir, tri croissant. (Repéré exclu.) */
export function selectUpcomingFestivals(
  parts: ParticipationWithEvent[],
  now: Date,
): ParticipationWithEvent[] {
  return parts
    .filter(p => (p.status === CONFIRMED || p.status === CANDIDATE) && isUpcoming(p, now))
    .sort(byStartAsc)
}

/** « À régler & finaliser » : inscrit non payé (a_payer/acompte_verse) + en_cours, à venir. */
export function selectAReglerItems(
  parts: ParticipationWithEvent[],
  now: Date,
): ParticipationWithEvent[] {
  return parts
    .filter(p => {
      if (!isUpcoming(p, now)) return false
      if (p.status === CANDIDATE) return true
      if (p.status === CONFIRMED) return DUE_PAYMENTS.has(p.payment_status ?? '')
      return false
    })
    .sort(byStartAsc)
}

export interface SeasonMonth {
  month: number   // 0-11
  count: number
  filled: boolean
}

/** Frise 12 mois : nb de participations CONFIRMÉES par mois (date de début) sur `year`. */
export function aggregateSeason(parts: ParticipationWithEvent[], year: number): SeasonMonth[] {
  const counts = new Array(12).fill(0)
  for (const p of parts) {
    if (!p.events || p.status !== CONFIRMED) continue
    const start = new Date(p.events.start_date)
    if (start.getFullYear() !== year) continue
    counts[start.getMonth()]++
  }
  return counts.map((count, month) => ({ month, count, filled: count > 0 }))
}

export interface BilanPrompt {
  pending: ParticipationWithEvent | null
  extraCount: number
}

/**
 * Festivals terminés (end_date < now), confirmés (inscrit), SANS event_report :
 * retourne le plus récent à proposer + le nombre des autres en attente.
 */
export function detectBilanPrompt(
  parts: ParticipationWithEvent[],
  reportedEventIds: Set<string>,
  now: Date,
): BilanPrompt {
  const pendingList = parts
    .filter(p =>
      p.events &&
      p.status === CONFIRMED &&
      new Date(p.events.end_date).getTime() < now.getTime() &&
      !reportedEventIds.has(p.event_id),
    )
    .sort((a, b) => new Date(b.events.end_date).getTime() - new Date(a.events.end_date).getTime())
  return { pending: pendingList[0] ?? null, extraCount: Math.max(0, pendingList.length - 1) }
}
