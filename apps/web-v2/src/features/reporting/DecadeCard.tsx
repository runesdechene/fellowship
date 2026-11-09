/**
 * QUOI     — une décade en carte : son titre, son échéance, son état, ses jours en formes, et ce qui
 *            est déjà parti (TTC, dont TVA). Un clic l'ouvre dans le tableau du dessous.
 * POURQUOI — le mois se lit d'un coup d'œil, trois cartes côte à côte (maquette 2795:233, validée).
 */
import { Link } from 'react-router-dom'
import { formatDayMonth, monthKey, todayIso } from '@/lib/dates'
import { formatPrice } from '@/lib/money'
import { type Decade, dayState, decadeTitle, sentAmounts, toDayStatus } from '@/lib/reporting'
import { DayMark } from './DayMark'
import type { ReportingDay } from './useReporting'

interface Props {
  decade: Decade
  byDay: ReadonlyMap<string, ReportingDay>
  today: Date
  selected: boolean
}

export function DecadeCard({ decade, byDay, today, selected }: Props) {
  const states = decade.days.map((day) => {
    const row = byDay.get(todayIso(day))
    const status = row ? toDayStatus(row.statut) : null
    return { day, status, amounts: status === 'envoyee' && row ? sentAmounts(row.lignes) : null }
  })
  const sent = states.reduce(
    (total, { amounts }) =>
      amounts ? { ttc: total.ttc + amounts.ht + amounts.tva, tva: total.tva + amounts.tva } : total,
    { ttc: 0, tva: 0 },
  )
  const open = states.some(({ status }) => status !== 'envoyee' && status !== 'vide')
  const chip =
    decade.start > today
      ? { label: 'À venir', tone: 'neutral' }
      : open || decade.end >= today
        ? { label: 'En cours', tone: 'neutral' }
        : { label: 'Envoyée', tone: 'validated' }

  return (
    <Link
      to={`?mois=${monthKey(decade.start)}&decade=${decade.index}`}
      className={selected ? 'reporting-decade reporting-decade--selected' : 'reporting-decade'}
      aria-current={selected ? 'true' : undefined}
    >
      <span className="reporting-decade__head">
        <span className="reporting-decade__titles">
          <strong>{decadeTitle(decade)}</strong>
          <span>À déclarer avant le {formatDayMonth(decade.deadline)}</span>
        </span>
        <span className={`reporting-chip reporting-chip--${chip.tone}`}>{chip.label}</span>
      </span>
      <span className="reporting-decade__days">
        {states.map(({ day, status }) => (
          <span key={day.getDate()} className="reporting-decade__day">
            <span>{day.getDate()}</span>
            <DayMark mark={dayState(status, day, today).mark} />
          </span>
        ))}
      </span>
      <span className="reporting-decade__total">
        <span
          className={
            sent.ttc > 0 ? 'reporting-decade__amount' : 'reporting-decade__amount is-empty'
          }
        >
          {formatPrice(sent.ttc)}
        </span>
        <span>
          {sent.ttc > 0
            ? `envoyés, dont ${formatPrice(sent.tva)} de TVA`
            : 'rien d’envoyé pour l’instant'}
        </span>
      </span>
    </Link>
  )
}
