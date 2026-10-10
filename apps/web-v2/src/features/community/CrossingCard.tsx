/**
 * QUOI     — « Où vous vous croiserez » : les trois prochaines dates de l'exposant où vont aussi des
 *            comptes qu'il suit.
 * POURQUOI — lot 9a, maquette 2212:2. Rien à montrer : la carte ne s'affiche pas.
 */
import { Link } from 'react-router-dom'
import { formatDateRange, parseSqlDate } from '@/lib/dates'
import type { Crossing } from './useCommunity'

export function CrossingCard({ crossing }: { crossing: Crossing[] }) {
  if (crossing.length === 0) return null
  return (
    <section className="side-card" aria-labelledby="crossing-title">
      <h2 id="crossing-title" className="side-card__title">
        Où vous vous croiserez
      </h2>
      <ul className="side-card__list">
        {crossing.map((date) => (
          <li key={date.eventId}>
            <Link className="side-card__row" to={`/evenement/${date.eventId}`}>
              {date.imageUrl ? (
                <img className="side-card__poster" src={date.imageUrl} alt="" />
              ) : (
                <span className="side-card__poster" />
              )}
              <span className="side-card__body">
                <span className="side-card__name">{date.name}</span>
                <span className="side-card__meta">
                  {formatDateRange(parseSqlDate(date.startDate), parseSqlDate(date.endDate))} ·{' '}
                  {date.companions} {date.companions === 1 ? 'compagnon' : 'compagnons'}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
