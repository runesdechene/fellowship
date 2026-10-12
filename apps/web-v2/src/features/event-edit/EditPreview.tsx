/**
 * QUOI     — l'aperçu en direct de la modification : la fiche en miniature (affiche, nom, dates et
 *            lieu, catégories, Date et Lieu, Pour candidater, À propos), mise à jour à la frappe.
 * POURQUOI — maquette 2117:2 (lot 10c) : on voit la fiche telle que tous la verront ; le champ qui
 *            manquait est repéré à sa place, en pointillés.
 * ATTENTION — la bascule Fiche / Carte de la maquette est masquée : la carte vient au lot 13.
 */
import { CalendarDays, Clock, FileText, Link as LinkIcon, Mail, MapPin } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Tag } from '@/components/ui/Tag'
import type { EventDraft } from '@/features/event-create/useEventDraft'
import { formatDateRange, formatFullDate, parseSqlDate } from '@/lib/dates'
import type { MissingField } from '@/lib/event-edit'
import { tagStyleFor } from '@/lib/tags'
import { useTagStyles } from '@/lib/useTagStyles'

interface EditPreviewProps {
  draft: EventDraft
  posterUrl: string | null
  highlight: MissingField | null
}

interface Row {
  field: MissingField
  Icon: LucideIcon
  label: string
  value: string
}

export function EditPreview({ draft, posterUrl, highlight }: EditPreviewProps) {
  const styles = useTagStyles()
  const start = draft.startDate ? parseSqlDate(draft.startDate) : null
  const end = draft.endDate ? parseSqlDate(draft.endDate) : start
  const place = `${draft.city} (${draft.department})`
  const rows: Row[] = [
    {
      field: 'registration_deadline',
      Icon: Clock,
      label: 'Date limite',
      value: draft.registrationDeadline
        ? formatFullDate(parseSqlDate(draft.registrationDeadline))
        : '',
    },
    { field: 'registration_note', Icon: FileText, label: 'Comment', value: draft.registrationNote },
    {
      field: 'registration_url',
      Icon: LinkIcon,
      label: 'Dossier en ligne',
      value: draft.registrationUrl,
    },
    { field: 'contact_email', Icon: Mail, label: 'Contact', value: draft.contactEmail },
  ]
  const shown = rows.filter((row) => row.value.trim() || row.field === highlight)

  return (
    <aside className="edit-preview" aria-label="Aperçu en direct">
      <p className="edit-preview__label">
        <span className="edit-preview__dot" />
        Aperçu en direct
      </p>
      <div className="edit-preview__card">
        {posterUrl && <img className="edit-preview__poster" src={posterUrl} alt="" />}
        <div className="edit-preview__body">
          <div className="edit-preview__identity">
            <p className="edit-preview__name">{draft.name || 'Sans nom'}</p>
            <p className="edit-preview__meta">
              {start && end
                ? `${formatDateRange(start, end, 'long')} ${String(end.getFullYear())}`
                : ''}
              {' · '}
              {place}
            </p>
            {draft.tags.length > 0 && (
              <div className="edit-preview__tags">
                {draft.tags.map((tag) => (
                  <Tag key={tag} name={tag} style={tagStyleFor(styles, tag)} />
                ))}
              </div>
            )}
          </div>

          <div className="edit-preview__facts">
            <span className="edit-preview__fact">
              <CalendarDays size={13} strokeWidth={1.8} />
              <span className="edit-preview__fact-label">Date</span>
              <span className="edit-preview__fact-value">
                {start && end ? formatDateRange(start, end) : '—'}
              </span>
            </span>
            <span className="edit-preview__fact">
              <MapPin size={13} strokeWidth={1.8} />
              <span className="edit-preview__fact-label">Lieu</span>
              <span className="edit-preview__fact-value">{place}</span>
            </span>
          </div>

          {shown.length > 0 && (
            <div className="edit-preview__block">
              <p className="edit-preview__block-title">Pour candidater</p>
              <ul className="edit-preview__rows">
                {shown.map(({ field, Icon, label, value }) => (
                  <li
                    key={field}
                    className={
                      field === highlight
                        ? 'edit-preview__row edit-preview__row--now'
                        : 'edit-preview__row'
                    }
                  >
                    <Icon size={13} strokeWidth={1.8} />
                    <span className="edit-preview__row-text">
                      <span className="edit-preview__row-label">{label}</span>
                      <span className="edit-preview__row-value">{value || '…'}</span>
                    </span>
                    {field === highlight && <span className="edit-preview__now">en cours</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {draft.description.trim() && (
            <div className="edit-preview__block">
              <p className="edit-preview__block-title">À propos</p>
              <p className="edit-preview__about">{draft.description}</p>
            </div>
          )}
        </div>
      </div>
      <p className="edit-preview__note">
        Tes modifications sont visibles de tous les exposants dès l’enregistrement.
      </p>
    </aside>
  )
}
