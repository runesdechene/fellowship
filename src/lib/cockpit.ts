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
  year: number
  month: number   // 0-11
  count: number
  filled: boolean
}

/**
 * Frise des 12 prochains mois GLISSANTS à partir du mois courant (jamais Jan→Déc fixe :
 * on ne montre pas de mois déjà passés). Compte les participations CONFIRMÉES (inscrit)
 * tombant dans la fenêtre, par mois de date de début.
 */
export function aggregateSeason(parts: ParticipationWithEvent[], now: Date): SeasonMonth[] {
  const startY = now.getFullYear()
  const startM = now.getMonth()
  const buckets: SeasonMonth[] = Array.from({ length: 12 }, (_, i) => {
    const abs = startM + i
    return { year: startY + Math.floor(abs / 12), month: abs % 12, count: 0, filled: false }
  })
  for (const p of parts) {
    if (!p.events || p.status !== CONFIRMED) continue
    const start = new Date(p.events.start_date)
    const idx = (start.getFullYear() - startY) * 12 + (start.getMonth() - startM)
    if (idx >= 0 && idx < 12) {
      buckets[idx].count++
      buckets[idx].filled = true
    }
  }
  return buckets
}

export interface BilanPrompt {
  pending: ParticipationWithEvent | null
  extraCount: number
}

/** Fenêtre de récence du prompt bilan : on ne nag que pour un festival terminé
 *  RÉCEMMENT (un bilan se renseigne à chaud ; une vieille ligne ne doit pas harceler). */
export const BILAN_WINDOW_DAYS = 45

/**
 * Festivals terminés RÉCEMMENT (end_date dans les BILAN_WINDOW_DAYS derniers jours),
 * confirmés (inscrit), SANS event_report : retourne le plus récent à proposer +
 * le nombre des autres en attente.
 */
export function detectBilanPrompt(
  parts: ParticipationWithEvent[],
  reportedEventIds: Set<string>,
  now: Date,
  snoozedEventIds: Set<string> = new Set(),
): BilanPrompt {
  const nowMs = now.getTime()
  const sinceMs = nowMs - BILAN_WINDOW_DAYS * 86_400_000
  const pendingList = parts
    .filter(p => {
      if (!p.events || p.status !== CONFIRMED) return false
      const end = new Date(p.events.end_date).getTime()
      return end < nowMs && end >= sinceMs
        && !reportedEventIds.has(p.event_id)
        && !snoozedEventIds.has(p.event_id)  // snoozé « Plus tard » aujourd'hui (#7)
    })
    .sort((a, b) => new Date(b.events.end_date).getTime() - new Date(a.events.end_date).getTime())
  return { pending: pendingList[0] ?? null, extraCount: Math.max(0, pendingList.length - 1) }
}
