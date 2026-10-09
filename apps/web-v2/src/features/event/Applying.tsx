/**
 * QUOI     — « Pour candidater — tout au même endroit » : la date limite, comment candidater, le
 *            dossier en ligne, le contact, et ce que l'exposant a envoyé.
 * POURQUOI — les infos d'inscription étaient éparpillées ; les exposants les ont réclamées au même
 *            endroit, avec la trace de leur propre envoi (maquette 2027, fiche événement).
 * ATTENTION — ce qui n'est pas renseigné n'apparaît pas. « Ce que j'ai envoyé » est privé
 *            (participation_dossiers) et n'existe que si l'exposant suit cette date. Le rappel de
 *            clôture (Pro) ne s'affiche que si la date limite est à venir.
 */
import { Check, Clock, FileText, Link as LinkIcon, Mail } from 'lucide-react'
import { DraftInput } from '@/components/ui/DraftInput'
import { InfoRow, InfoRows } from '@/components/ui/InfoRows'
import { daysUntil, formatCountdown, formatFullDate, parseSqlDate } from '@/lib/dates'
import { websiteLink } from '@/lib/vitrine'
import type { EventRow, ParticipationStatus } from '@/types/database'
import { DeadlineReminder } from './DeadlineReminder'
import type { DossierFields } from './useDossier'

interface ApplyingProps {
  event: EventRow
  status: ParticipationStatus | null
  setStatus: (next: ParticipationStatus | null) => Promise<void>
  statusSaving: boolean
  actorId: string | null | undefined
  fields: DossierFields
  save: (patch: Partial<DossierFields>) => Promise<void>
}

/** « dans 12 jours », « clôturé — tu y es inscrit », « clôturé ». */
function deadlineNote(deadline: Date, status: ParticipationStatus | null): string {
  const days = daysUntil(deadline)
  if (days >= 0) return formatCountdown(days).toLowerCase()
  return status === 'inscrit' || status === 'confirme' ? 'clôturé — tu y es inscrit' : 'clôturé'
}

export function Applying(props: ApplyingProps) {
  const { event, status, setStatus, statusSaving, actorId, fields, save } = props
  const deadline = event.registration_deadline ? parseSqlDate(event.registration_deadline) : null
  const site = event.registration_url ? websiteLink(event.registration_url) : null
  const following = status !== null
  const hasInfo = [deadline, event.registration_note, site, event.contact_email].some(Boolean)

  if (!hasInfo && !following) return null

  return (
    <section className="event-page__block">
      <h2 className="event-page__block-title">
        Pour candidater <span className="event-page__block-hint">tout au même endroit</span>
      </h2>
      <div className="dossier-card">
        <InfoRows>
          {deadline && (
            <InfoRow Icon={Clock} label="Date limite" sub={deadlineNote(deadline, status)}>
              {formatFullDate(deadline)}
            </InfoRow>
          )}
          {event.registration_note && (
            <InfoRow Icon={FileText} label="Comment">
              {event.registration_note}
            </InfoRow>
          )}
          {site && (
            <InfoRow Icon={LinkIcon} label="Dossier en ligne">
              <a className="info-row__link" href={site.href} target="_blank" rel="noreferrer">
                {site.label}
              </a>
            </InfoRow>
          )}
          {event.contact_email && (
            <InfoRow Icon={Mail} label="Contact">
              <a className="info-row__link" href={`mailto:${event.contact_email}`}>
                {event.contact_email}
              </a>
            </InfoRow>
          )}
          {following && (
            <InfoRow Icon={Check} label="Ce que j’ai envoyé">
              <span className="applying__sent">
                Envoyé le
                <DraftInput
                  type="date"
                  label="Date d’envoi du dossier"
                  value={fields.applicationSentOn ?? ''}
                  onSave={(draft) => void save({ applicationSentOn: draft === '' ? null : draft })}
                />
                <DraftInput
                  className="applying__note"
                  label="Ce que contenait le dossier"
                  placeholder="3 photos, catalogue…"
                  value={fields.applicationNote ?? ''}
                  onSave={(draft) => void save({ applicationNote: draft.trim() || null })}
                />
              </span>
            </InfoRow>
          )}
        </InfoRows>
      </div>
      {deadline && daysUntil(deadline) >= 0 && (
        <DeadlineReminder
          eventId={event.id}
          actorId={actorId}
          deadline={deadline}
          status={status}
          setStatus={setStatus}
          statusSaving={statusSaving}
        />
      )}
    </section>
  )
}
