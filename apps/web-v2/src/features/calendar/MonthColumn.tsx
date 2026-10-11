/**
 * QUOI     — une colonne de la frise : le nom du mois en serif, son compte, ses cartes-affiches,
 *            « Mois libre » quand il n'a rien, puis les compagnons.
 * POURQUOI — le calendrier se lit mois par mois ; chaque colonne est autonome.
 * ATTENTION — le compte ne compte que les dates engagées ; les « Intéressé » s'affichent sur option
 *            mais ne comptent jamais.
 */
import { ArrowRight } from 'lucide-react'
import { countLabel } from '@/lib/calendar'
import { CompanionCard } from './CompanionCard'
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
          {companions.map((companion) => (
            <CompanionCard key={companion.eventId} companion={companion} />
          ))}
        </div>
      )}
    </section>
  )
}
