/**
 * QUOI     — la frise de saison : une gélule par mois, de plus en plus haute avec le nombre de
 *            dates ; le mois en cours en noir, un mois vide réduit à un trait.
 * POURQUOI — voir d'un coup d'œil les mois chargés ; les bornes de hauteur se règlent dans
 *            styles/2-semantic.css, pas ici.
 */
import type { CSSProperties } from 'react'
import { formatMonthShort } from '@/lib/dates'
import type { MonthBucket } from './useDashboard'

/** De 0 (un mois à une date) à 1 (le mois le plus chargé). */
function barRatio(count: number, max: number): number {
  return max > 1 ? (count - 1) / (max - 1) : 0
}

export function SeasonChart({ months }: { months: MonthBucket[] }) {
  const max = Math.max(1, ...months.map((month) => month.count))

  return (
    <div className="season-chart">
      {months.map((month, index) => {
        const classes = ['season-chart__column']
        if (month.count === 0) classes.push('season-chart__column--empty')
        if (index === 0) classes.push('season-chart__column--current')

        return (
          <div key={month.key} className={classes.join(' ')}>
            <div
              className="season-chart__bar"
              style={{ '--bar-ratio': String(barRatio(month.count, max)) } as CSSProperties}
            >
              {month.count > 0 && <span className="season-chart__value">{month.count}</span>}
            </div>
            <span className="season-chart__month">{formatMonthShort(month.date)}</span>
          </div>
        )
      })}
    </div>
  )
}
