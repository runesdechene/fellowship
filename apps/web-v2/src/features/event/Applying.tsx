/**
 * QUOI     — « Pour candidater — tout au même endroit » : la date limite, comment candidater, le
 *            dossier en ligne, le contact, et ce que l'exposant a envoyé.
 * POURQUOI — les infos d'inscription étaient éparpillées ; les exposants les ont réclamées au même
 *            endroit, avec la trace de leur propre envoi (maquette 2027, fiche événement).
 * ATTENTION — ce qui n'est pas renseigné apparaît en gris avec « + Ajouter » pour qui peut modifier
 *            la fiche (lot 10c), et n'apparaît pas pour les autres. « Ce que j'ai envoyé » est privé
 *            (participation_dossiers) et n'existe que si l'exposant suit cette date. Le rappel de
 *            clôture (Pro) ne s'affiche que si la date limite est à venir.
 */
import { Check, Clock, FileText, Globe, Link as LinkIcon, Mail } from 'lucide-react'
import { DraftInput } from '@/components/ui/DraftInput'
import { InfoRow, InfoRows } from '@/components/ui/InfoRows'
import { daysUntil, formatCountdown, formatFullDate, parseSqlDate } from '@/lib/dates'
import { MISSING_LABELS, type MissingField } from '@/lib/event-edit'
import { websiteLink } from '@/lib/vitrine'
import type { EventRow, ParticipationStatus } from '@/types/database'
import { DeadlineReminder } from './DeadlineReminder'
import { AddMissing } from './KeptUpToDate'
import type { DossierFields } from './useDossier'

interface ApplyingProps {
  event: EventRow
  status: ParticipationStatus | null
  setStatus: (next: ParticipationStatus | null) => Promise<void>
  statusSaving: boolean
  actorId: string | null | undefined
  fields: DossierFields
  save: (patch: Partial<DossierFields>) => Promise<void>
  /** Qui peut modifier la fiche voit ce qui manque, avec « + Ajouter ». */
  canEdit: boolean
  onAdd: (field: MissingField) => void
}

/** Une info absente de la fiche, pour qui peut la compléter. */
function Missing({
  Icon,
  field,
  onAdd,
}: {
  Icon: typeof Clock
  field: MissingField
  onAdd: (field: MissingField) => void
}) {
  return (
    <InfoRow
      Icon={Icon}
      label={MISSING_LABELS[field]}
      action={<AddMissing onClick={() => onAdd(field)} />}
    >
      <span className="info-row__missing">Pas encore renseigné</span>
    </InfoRow>
  )
}

/** « dans 12 jours », « clôturé — tu y es inscrit », « clôturé ». */
function deadlineNote(deadline: Date, status: ParticipationStatus | null): string {
  const days = daysUntil(deadline)
  if (days >= 0) return formatCountdown(days).toLowerCase()
  return status === 'inscrit' || status === 'confirme' ? 'clôturé — tu y es inscrit' : 'clôturé'
}

export function Applying(props: ApplyingProps) {
  const { event, status, setStatus, statusSaving, actorId, fields, save, canEdit, onAdd } = props
  const deadline = event.registration_deadline ? parseSqlDate(event.registration_deadline) : null
  const site = event.registration_url ? websiteLink(event.registration_url) : null
  const following = status !== null
  const hasInfo = [deadline, event.registration_note, site, event.contact_email].some(Boolean)

  if (!hasInfo && !following && !canEdit) return null

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
          {!deadline && canEdit && (
            <Missing Icon={Clock} field="registration_deadline" onAdd={onAdd} />
          )}
          {event.registration_note && (
            <InfoRow Icon={FileText} label="Comment">
              {event.registration_note}
            </InfoRow>
          )}
          {!event.registration_note && canEdit && (
            <Missing Icon={FileText} field="registration_note" onAdd={onAdd} />
          )}
          {site && (
            <InfoRow Icon={LinkIcon} label="Dossier en ligne">
              <a className="info-row__link" href={site.href} target="_blank" rel="noreferrer">
                {site.label}
              </a>
            </InfoRow>
          )}
          {!site && canEdit && <Missing Icon={LinkIcon} field="registration_url" onAdd={onAdd} />}
          {event.contact_email && (
            <InfoRow Icon={Mail} label="Contact">
              <a className="info-row__link" href={`mailto:${event.contact_email}`}>
                {event.contact_email}
              </a>
            </InfoRow>
          )}
          {!event.contact_email && canEdit && (
            <Missing Icon={Mail} field="contact_email" onAdd={onAdd} />
          )}
          {!event.external_url && canEdit && (
            <Missing Icon={Globe} field="external_url" onAdd={onAdd} />
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
      {/* Sans compte (lot 11b), pas de rappel : il s'allume pour un acteur. */}
      {deadline && actorId && daysUntil(deadline) >= 0 && (
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
