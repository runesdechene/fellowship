/**
 * QUOI     — les signalements : leurs trois statuts tenus dans l'adresse, les motifs et le libellé de
 *            ce qui est visé.
 * POURQUOI — un seul endroit pour les valeurs que la base attend (`content_reports.status`,
 *            `reason`, `target_type`), partagé par l'administration et « Signaler ce profil ».
 * ATTENTION — les motifs sont ceux de la V1, qui en crée encore : ne pas en changer les valeurs.
 */

export type ModerationStatus = 'pending' | 'resolved' | 'dismissed'

export const STATUSES: readonly { value: ModerationStatus; param: string; label: string }[] = [
  { value: 'pending', param: 'a-traiter', label: 'À traiter' },
  { value: 'resolved', param: 'resolus', label: 'Résolus' },
  { value: 'dismissed', param: 'rejetes', label: 'Rejetés' },
]

export function readModerationStatus(search: URLSearchParams): ModerationStatus {
  const param = search.get('statut')
  return STATUSES.find((status) => status.param === param)?.value ?? 'pending'
}

export function writeModerationStatus(status: ModerationStatus): URLSearchParams {
  const params = new URLSearchParams()
  const param = STATUSES.find((s) => s.value === status)?.param
  if (status !== 'pending' && param) params.set('statut', param)
  return params
}

export type ReportReason = 'spam' | 'inapproprie' | 'info_erronee' | 'doublon'

export const REASONS: readonly { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam ou promotion abusive' },
  { value: 'inapproprie', label: 'Contenu inapproprié' },
  { value: 'info_erronee', label: 'Information erronée' },
  { value: 'doublon', label: 'Doublon' },
]

export function reasonLabel(reason: string): string {
  return REASONS.find((r) => r.value === reason)?.label ?? reason
}

const TARGET_KINDS: Record<string, string> = {
  event: 'Fiche',
  profile: 'Vitrine',
  event_thread: 'Question',
  event_thread_reply: 'Réponse',
}

/** « Vitrine · Atelier Sauvage » ; ce qui a été supprimé depuis se dit. */
export function targetLabel(type: string, name: string | null): string {
  return `${TARGET_KINDS[type] ?? 'Contenu'} · ${name ?? 'supprimé depuis'}`
}
