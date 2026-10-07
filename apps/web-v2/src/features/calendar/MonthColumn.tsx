/**
 * QUOI     — une colonne de la frise : le nom du mois en serif, son compte, ses cartes-affiches,
 *            « Mois libre » quand il n'a rien, puis les compagnons.
 * POURQUOI — le calendrier se lit mois par mois ; chaque colonne est autonome.
 * ATTENTION — le compte ne compte que les dates engagées ; les « Intéressé » s'affichent sur option
 *            mais ne comptent jamais.
 */
import { ArrowRight } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { countLabel } from '@/lib/calendar'
import { formatDateRange } from '@/lib/dates'
import { PosterCard } from './PosterCard'
import type { CalendarMonth } from './useCalendar'

interface MonthColumnProps {
  month: CalendarMonth
  current: boolean
  showFriends: boolean
  showInterested: boolean
}

export function MonthColumn({ month, current, showFriends, showInterested }: MonthColumnProps) {
  const engaged = month.dates.filter((date) => date.status !== 'interesse')
  const shown = showInterested ? month.dates : engaged
  const companions = showFriends ? month.companions : []

  return (
    <section className="month-column" id={`mois-${month.key}`} aria-label={month.label}>
      <header className="month-column__head">
        <h2
          className={
            current ? 'month-column__name month-column__name--current' : 'month-column__name'
          }
        >
          {month.label}
        </h2>
        <div className="month-column__count">
          {countLabel(engaged.length)}
          {current && <span className="month-column__now">Ce mois-ci</span>}
        </div>
      </header>

      {shown.map((date) => (
        <PosterCard key={date.eventId} date={showFriends ? date : { ...date, friends: [] }} />
      ))}

      {shown.length === 0 && (
        <div className="month-column__free">
          <span className="month-column__free-title">Mois libre</span>
          <span className="month-column__free-link">
            Trouver une date en {month.label.toLowerCase()} <ArrowRight size={13} strokeWidth={2} />
          </span>
        </div>
      )}

      {companions.length > 0 && (
        <div className="companions">
          <span className="companions__title">Compagnons</span>
          {companions.map((companion) => {
            const first = companion.friends[0]
            if (!first) return null
            const others = companion.friends.length - 1
            return (
              <div key={companion.eventId} className="companions__row">
                <Avatar className="companions__face" src={first.avatarUrl} name={first.name} />
                <span className="companions__text">
                  <span>
                    <b>{first.name}</b>
                    {others > 0
                      ? ` et ${others} ${others === 1 ? 'autre' : 'autres'} y vont`
                      : ' y va'}
                  </span>
                  <b className="companions__event">
                    {companion.name} · {formatDateRange(companion.startDate, companion.endDate)}
                  </b>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
