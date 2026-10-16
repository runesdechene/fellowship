/**
 * QUOI     — la date d'inscription d'une ligne de la liste des comptes, et « Nouveau » sous 7 jours.
 * POURQUOI — on repère d'un coup d'œil qui vient d'arriver (Uriel, 16/10/2026) ; partagé par la
 *            liste par enseigne et la liste par personne.
 */
import { formatDayMonthShort, formatFullDate, isRecent } from '@/lib/dates'

const NEW_DAYS = 7

export function SignupDate({ createdAt, now }: { createdAt: string; now: Date }) {
  const date = new Date(createdAt)
  return (
    <span className="admin-table__signup">
      {date.getFullYear() === now.getFullYear() ? formatDayMonthShort(date) : formatFullDate(date)}
      {isRecent(createdAt, now, NEW_DAYS) && (
        <span className="type-chip type-chip--sauge">Nouveau</span>
      )}
    </span>
  )
}
