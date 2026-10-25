/**
 * QUOI     — la candidature : en pied de « L'essentiel », la date limite en inversé et le bouton
 *            « Candidater » ; derrière lui, la fenêtre qui dit comment candidater, le dossier en
 *            ligne, le contact, et ce que l'exposant a envoyé.
 * POURQUOI — maquettes 2506:233 (sans compte) et 2518:233 (connecté, 25/10/2026) : la date limite
 *            ne s'écrit qu'une fois, le reste attend qu'on veuille candidater.
 * ATTENTION — sans compte, le bouton mène à la connexion. Connecté, la fenêtre a son adresse
 *            (`?candidater`, EventPage) : le retour la ferme. Ce qui n'est pas renseigné apparaît
 *            avec « + Ajouter » pour qui peut modifier la fiche (lot 10c), et pas pour les autres.
 *            « Ce que j'ai envoyé » est privé (participation_dossiers) et n'existe que si
 *            l'exposant suit cette date. Le rappel de clôture (Pro) ne vaut que si la date limite
 *            est à venir.
 */
import {
  ArrowRight,
  Check,
  Clock,
  FileText,
  Globe,
  Link as LinkIcon,
  Mail,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { DraftInput } from '@/components/ui/DraftInput'
import { daysUntil, formatCountdown, formatFullDate, parseSqlDate } from '@/lib/dates'
import { MISSING_LABELS, type MissingField } from '@/lib/event-edit'
import { loginReturning } from '@/lib/welcome'
import { websiteLink } from '@/lib/vitrine'
import type { EventRow, ParticipationStatus } from '@/types/database'
import { DeadlineReminder } from './DeadlineReminder'
import { EventEssentials, type Essential } from './EventEssentials'
import { AddMissing } from './KeptUpToDate'
import type { DossierFields } from './useDossier'

function deadlineOf(event: EventRow): Date | null {
  return event.registration_deadline ? parseSqlDate(event.registration_deadline) : null
}

/** L'organisateur a dit quelque chose de la candidature. */
function hasApplyInfo(event: EventRow): boolean {
  return [
    event.registration_deadline,
    event.registration_note,
    event.registration_url,
    event.contact_email,
  ].some(Boolean)
}

/** « Clôture dans 7 jours », « Clôturé, tu y es inscrit », « Clôturé ». */
function closingNote(deadline: Date, status: ParticipationStatus | null): string {
  const days = daysUntil(deadline)
  if (days >= 0) return `Clôture ${formatCountdown(days).toLowerCase()}`
  return status === 'inscrit' || status === 'confirme' ? 'Clôturé, tu y es inscrit' : 'Clôturé'
}

interface ApplyFooterProps {
  event: EventRow
  status: ParticipationStatus | null
  /** Connecté : ouvre la fenêtre. Sans compte, le bouton mène à la connexion. */
  onApply?: () => void
  /** Qui peut modifier la fiche voit le pied même vide : la fenêtre lui dit quoi ajouter. */
  canEdit?: boolean
}

/** Le pied inversé de « L'essentiel ». Rien quand il n'y a rien à dire, ni à faire. */
export function ApplyFooter({ event, status, onApply, canEdit = false }: ApplyFooterProps) {
  const { pathname } = useLocation()
  const deadline = deadlineOf(event)
  const following = onApply !== undefined && status !== null
  if (!hasApplyInfo(event) && !following && !canEdit) return null

  return (
    <div className="essentials__apply">
      <span className="essentials__label">
        <FileText size={18} strokeWidth={1.8} aria-hidden="true" />
        Candidatures
      </span>
      <span className="essentials__body">
        <span className="essentials__value">
          {deadline ? `Jusqu’au ${formatFullDate(deadline)}` : 'Date limite pas encore connue'}
        </span>
        {deadline && <span className="essentials__sub">{closingNote(deadline, status)}</span>}
      </span>
      {onApply ? (
        <button type="button" className="essentials__apply-button" onClick={onApply}>
          Candidater
          <ArrowRight size={13} strokeWidth={2} />
        </button>
      ) : (
        <Link className="essentials__apply-button" to={loginReturning(pathname)}>
          Candidater
          <ArrowRight size={13} strokeWidth={2} />
        </Link>
      )}
    </div>
  )
}

interface ApplyDialogProps {
  open: boolean
  onClose: () => void
  event: EventRow
  status: ParticipationStatus | null
  setStatus: (next: ParticipationStatus | null) => Promise<void>
  statusSaving: boolean
  actorId: string | null | undefined
  fields: DossierFields
  save: (patch: Partial<DossierFields>) => Promise<void>
  canEdit: boolean
  onAdd: (field: MissingField) => void
}

export function ApplyDialog(props: ApplyDialogProps) {
  const { open, onClose, event, status, setStatus, statusSaving, actorId, fields, save } = props
  const { canEdit, onAdd } = props
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  }, [open])

  const deadline = deadlineOf(event)
  const site = event.registration_url ? websiteLink(event.registration_url) : null

  /** Une info absente, pour qui peut la compléter. */
  const missing = (Icon: LucideIcon, field: MissingField): Essential => ({
    Icon,
    label: MISSING_LABELS[field],
    value: <span className="essentials__missing">Pas encore renseigné</span>,
    action: <AddMissing onClick={() => onAdd(field)} />,
  })

  const rows: (Essential | false | null)[] = [
    !deadline && canEdit && missing(Clock, 'registration_deadline'),
    event.registration_note
      ? { Icon: FileText, label: 'Comment', value: event.registration_note }
      : canEdit && missing(FileText, 'registration_note'),
    site
      ? {
          Icon: LinkIcon,
          label: 'Dossier en ligne',
          value: (
            <a className="essentials__link" href={site.href} target="_blank" rel="noreferrer">
              {site.label}
            </a>
          ),
        }
      : canEdit && missing(LinkIcon, 'registration_url'),
    event.contact_email
      ? {
          Icon: Mail,
          label: 'Contact',
          value: (
            <a className="essentials__link" href={`mailto:${event.contact_email}`}>
              {event.contact_email}
            </a>
          ),
        }
      : canEdit && missing(Mail, 'contact_email'),
    !event.external_url && canEdit && missing(Globe, 'external_url'),
    status !== null && {
      Icon: Check,
      label: 'Envoyé',
      value: (
        <span className="applying__sent">
          Le
          <DraftInput
            type="date"
            label="Date d’envoi du dossier"
            value={fields.applicationSentOn ?? ''}
            onSave={(draft) => void save({ applicationSentOn: draft === '' ? null : draft })}
          />
        </span>
      ),
      sub: (
        <DraftInput
          className="applying__note"
          label="Ce que contenait le dossier"
          placeholder="3 photos, catalogue…"
          value={fields.applicationNote ?? ''}
          onSave={(draft) => void save({ applicationNote: draft.trim() || null })}
        />
      ),
    },
  ]
  const shown = rows.filter((row): row is Essential => Boolean(row))

  return (
    <dialog
      ref={dialog}
      className="apply-dialog"
      aria-labelledby="apply-dialog-title"
      onClose={() => {
        // Échap ferme le <dialog> lui-même : on le dit à la fiche.
        if (open) onClose()
      }}
      onClick={(click) => {
        // Un clic sur le voile (le <dialog> lui-même, hors de sa carte) ferme la fenêtre.
        if (click.target === click.currentTarget) onClose()
      }}
    >
      <div className="apply-dialog__card">
        <header className="apply-dialog__head">
          <div>
            <h2 id="apply-dialog-title" className="apply-dialog__title">
              Candidater
            </h2>
            <p className="apply-dialog__subtitle">
              {deadline ? `${event.name}, jusqu’au ${formatFullDate(deadline)}` : event.name}
            </p>
          </div>
          <button
            type="button"
            className="apply-dialog__close"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        {shown.length > 0 ? (
          <EventEssentials rows={shown} />
        ) : (
          <p className="apply-dialog__empty">
            L’organisateur n’a pas encore dit comment candidater.
          </p>
        )}

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

        {site && (
          <a className="apply-dialog__go" href={site.href} target="_blank" rel="noreferrer">
            Ouvrir le dossier en ligne
            <ArrowRight size={13} strokeWidth={2} />
          </a>
        )}
      </div>
    </dialog>
  )
}
