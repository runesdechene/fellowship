/**
 * QUOI     — la page Décades (`/reporting`) : ce qui presse, ce qui reste à traiter, les trois
 *            décades du mois, les journées de celle qu'on a choisie, et les sources.
 * POURQUOI — déclarer chaque jour sans y penser, et voir d'un coup ce qui bloque (maquette 2795:233,
 *            validée le 09/11/2026). Le mois et la décade vivent dans l'adresse (`?mois=&decade=`).
 */
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  formatDayMonth,
  formatMonthLabel,
  formatWeekdayDayMonthTitle,
  monthKey,
  monthName,
  parseSqlDate,
} from '@/lib/dates'
import {
  type DayMark as Mark,
  decadeOf,
  decadeSpan,
  decadesOf,
  isBlocked,
  nextDeadline,
  parseMonthKey,
  reportingHeadline,
  toDayStatus,
} from '@/lib/reporting'
import { DayMark } from './DayMark'
import { DaysTable } from './DaysTable'
import { DecadeCard } from './DecadeCard'
import { ReportingSources } from './ReportingSources'
import { ReportingTodo } from './ReportingTodo'
import { useReporting } from './useReporting'

const LEGEND: [Mark, string][] = [
  ['envoyee', 'Envoyée'],
  ['verifier', 'À vérifier'],
  ['attente', 'En attente'],
  ['vide', 'Aucune vente'],
  ['venir', 'À venir'],
]

export function DecadesPage({ entityId }: { entityId: string }) {
  const [search] = useSearchParams()
  const today = new Date()
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const month = parseMonthKey(search.get('mois')) ?? thisMonth
  const { data, error, validate, markSale } = useReporting(entityId, month)
  if (error) return <p className="admin-page__error">{error}</p>
  if (!data) return null

  const decades = decadesOf(month)
  const asked = Number(search.get('decade'))
  const selected =
    decades.find((decade) => decade.index === asked) ??
    (monthKey(month) === monthKey(today) ? decadeOf(today) : decades[0])
  const byDay = new Map(data.days.map((day) => [day.jour, day]))
  const statuses = data.todo.map((day) => toDayStatus(day.statut))
  const blocked = statuses.filter((status) => status && isBlocked(status)).length
  const waiting = statuses.filter((status) => status === 'en_attente').length
  const due = nextDeadline(today)
  const dueMonth = due.end.getMonth() === today.getMonth() ? '' : ` ${monthName(due.end)}`
  const previous = new Date(month.getFullYear(), month.getMonth() - 1, 1)
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1)

  return (
    <div className="admin-page reporting">
      <header className="reporting__head">
        <div className="admin-home__head">
          <h1 className="admin-home__title">
            {reportingHeadline(
              blocked,
              waiting,
              data.lastSent ? parseSqlDate(data.lastSent) : null,
            )}
          </h1>
          <p className="admin-page__lede">
            {formatWeekdayDayMonthTitle(today)}. Prochaine échéance le{' '}
            {formatDayMonth(due.deadline)}, pour les ventes {decadeSpan(due)}
            {dueMonth}.
          </p>
        </div>
        {data.company.environnement === 'sandbox' && (
          <span className="reporting-chip reporting-chip--sent">
            Bac à sable : rien ne part à l’administration
          </span>
        )}
      </header>

      <ReportingTodo days={data.todo} onValidate={validate} />

      <div className="reporting__month">
        <h2 className="reporting__month-title">{formatMonthLabel(month)}</h2>
        <ul className="reporting__legend" aria-label="Légende">
          {LEGEND.map(([mark, label]) => (
            <li key={mark}>
              <DayMark mark={mark} size="s" />
              {label}
            </li>
          ))}
        </ul>
        <Link className="reporting__month-link" to={`?mois=${monthKey(previous)}`}>
          <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
          {formatMonthLabel(previous)}
        </Link>
        {next <= thisMonth && (
          <Link className="reporting__month-link" to={`?mois=${monthKey(next)}`}>
            {formatMonthLabel(next)}
            <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
          </Link>
        )}
      </div>

      <div className="reporting__decades">
        {decades.map((decade) => (
          <DecadeCard
            key={decade.index}
            decade={decade}
            byDay={byDay}
            today={today}
            selected={decade.index === selected?.index}
            declarations={data.declarations}
          />
        ))}
      </div>

      {selected && (
        <DaysTable decade={selected} byDay={byDay} today={today} onMarkSale={markSale} />
      )}
      <ReportingSources data={data} />
    </div>
  )
}
