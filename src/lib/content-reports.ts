// Modèle métier des signalements de contenu (modération admin).
// Distinct des bilans post-festival (table event_reports) qui sont privés à leur auteur.

export type ReportReason = 'spam' | 'inapproprie' | 'info_erronee' | 'doublon'
export type ReportTargetType = 'event' | 'profile'
export type ReportStatus = 'pending' | 'resolved' | 'dismissed'

export const REPORT_REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: 'spam', label: 'Spam ou promotion abusive' },
  { value: 'inapproprie', label: 'Contenu inapproprié' },
  { value: 'info_erronee', label: 'Information erronée' },
  { value: 'doublon', label: 'Doublon (déjà existant)' },
]

const REASON_LABELS: Record<string, string> = Object.fromEntries(
  REPORT_REASONS.map(r => [r.value, r.label])
)

export function formatReason(reason: string): string {
  return REASON_LABELS[reason] ?? reason
}

/**
 * Décide si le current actor a le droit de signaler ce target.
 * - false si non authentifié (la RLS bloquera de toute façon, mais on cache l'UI).
 * - false si target appartient au reporter (auto-signalement = no sense).
 * - true sinon (y compris si ownerId est inconnu/null).
 */
export function canReport(
  reporter: { id: string } | null,
  target: { type: ReportTargetType; ownerId: string | null }
): boolean {
  if (!reporter) return false
  if (target.ownerId && reporter.id === target.ownerId) return false
  return true
}
