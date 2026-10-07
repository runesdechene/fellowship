import type { CSSProperties } from 'react'
import type { MonthBucket } from './useDashboard'

/**
 * Une barre par mois. La hauteur est proportionnelle au nombre de dates,
 * entre --chart-bar-min (zéro) et --chart-bar-max (le mois le plus chargé).
 * Les deux bornes se règlent dans src/styles/2-semantic.css.
 */
export function SeasonChart({ months }: { months: MonthBucket[] }) {
  const max = Math.max(1, ...months.map((month) => month.count))

  return (
    <div className="season-chart">
      {months.map((month) => {
        const ratio = month.count / max
        const style = {
          '--bar-height': `calc(var(--chart-bar-min) + (var(--chart-bar-max) - var(--chart-bar-min)) * ${ratio})`,
        } as CSSProperties

        return (
          <div
            key={month.key}
            className={
              month.count === 0
                ? 'season-chart__column season-chart__column--empty'
                : 'season-chart__column'
            }
          >
            <div className="season-chart__bar" style={style}>
              <span className="season-chart__value">{month.count}</span>
            </div>
            <span className="season-chart__month">{month.label}</span>
          </div>
        )
      })}
    </div>
  )
}
