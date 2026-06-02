import type { ParticipationWithEvent, EventReport } from '@/types/database'

export interface PastBilan {
  participation: ParticipationWithEvent
  report: EventReport | null
  profit: number | null   // null si pas de bilan rempli
}

/** Bénéfice = CA − coût stand − charges. null traités comme 0. */
export function bilanProfit(r: { revenue: number | null; booth_cost: number | null; charges: number | null }): number {
  return (r.revenue ?? 0) - (r.booth_cost ?? 0) - (r.charges ?? 0)
}

/**
 * Festivals PASSÉS confirmés (inscrit, end_date < now), triés du plus récent au plus ancien,
 * chacun joint à son bilan (event_reports) s'il existe + le bénéfice calculé.
 */
export function buildPastBilans(
  parts: ParticipationWithEvent[],
  reportsByEvent: Map<string, EventReport>,
  now: Date,
): PastBilan[] {
  return parts
    .filter(p => p.events && p.status === 'inscrit' && new Date(p.events.end_date).getTime() < now.getTime())
    .sort((a, b) => new Date(b.events.end_date).getTime() - new Date(a.events.end_date).getTime())
    .map(p => {
      const report = reportsByEvent.get(p.event_id) ?? null
      return { participation: p, report, profit: report ? bilanProfit(report) : null }
    })
}
