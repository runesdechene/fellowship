/**
 * QUOI     — la frise de saison : une gélule par mois, de plus en plus haute avec le nombre de
 *            dates ; le mois en cours en noir, un mois vide réduit à un trait.
 * POURQUOI — voir d'un coup d'œil les mois chargés ; les bornes de hauteur se règlent dans
 *            styles/2-semantic.css, pas ici. Sans aucune date (`demo`), une saison en gris montre
 *            à quoi elle ressemblera (maquette 2402:233).
 */
import type { CSSProperties } from 'react'
import { formatMonthShort } from '@/lib/dates'
import type { MonthBucket } from './useDashboard'

/** De 0 (un mois à une date) à 1 (le mois le plus chargé). */
function barRatio(count: number, max: number): number {
  return max > 1 ? (count - 1) / (max - 1) : 0
}

/** La saison dessinée en gris quand il n'y a rien : `null` est un mois creux. */
const DEMO_RATIOS = [0.3, 0.55, 0.4, 0.75, 0.12, null, null, 0.25, 0.5, 0.85, 0.65, 0.4]

export function SeasonChart({ months, demo }: { months: MonthBucket[]; demo: boolean }) {
  const max = Math.max(1, ...months.map((month) => month.count))

  return (
    <div className={demo ? 'season-chart season-chart--demo' : 'season-chart'} aria-hidden={demo}>
      {months.map((month, index) => {
        const ratio = demo ? (DEMO_RATIOS[index] ?? null) : barRatio(month.count, max)
        const classes = ['season-chart__column']
        if (demo ? ratio === null : month.count === 0) classes.push('season-chart__column--empty')
        if (index === 0 && !demo) classes.push('season-chart__column--current')

        return (
          <div key={month.key} className={classes.join(' ')}>
            <div
              className="season-chart__bar"
              style={{ '--bar-ratio': String(ratio ?? 0) } as CSSProperties}
            >
              {month.count > 0 && !demo && (
                <span className="season-chart__value">{month.count}</span>
              )}
            </div>
            <span className="season-chart__month">{formatMonthShort(month.date)}</span>
          </div>
        )
      })}
    </div>
  )
}
