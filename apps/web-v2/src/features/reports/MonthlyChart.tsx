/**
 * QUOI     — le bénéfice par mois de « Mes bilans » : douze barres, de janvier à décembre.
 * POURQUOI — voir d'un coup d'œil les mois qui rapportent ; le meilleur porte le dégradé du logo.
 * ATTENTION — la hauteur passe par la variable CSS --bar (0 à 1), jamais par un style calculé
 *            ici. Un mois à perte ou vide est un trait au ras de l'axe.
 */
import type { CSSProperties } from 'react'
import { formatMonthShort } from '@/lib/dates'
import { bestMonth } from '@/lib/reports'

/** « 9,4 k » : le bénéfice d'un mois, en milliers. */
function thousands(value: number): string {
  return `${(value / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k`
}

export function MonthlyChart({ months, year }: { months: number[]; year: number }) {
  const top = Math.max(...months, 0)
  const best = bestMonth(months)

  return (
    <div className="monthly-chart">
      {months.map((value, month) => {
        const label = formatMonthShort(new Date(year, month, 1))
        const filled = value > 0
        const classes = ['monthly-chart__bar']
        if (!filled) classes.push('monthly-chart__bar--empty')
        if (month === best) classes.push('monthly-chart__bar--best')
        return (
          <div key={label} className="monthly-chart__month">
            <span className="monthly-chart__track">
              {filled && <span className="monthly-chart__value">{thousands(value)}</span>}
              <span
                className={classes.join(' ')}
                style={{ '--bar': String(filled ? value / top : 0) } as CSSProperties}
              />
            </span>
            <span
              className={
                filled ? 'monthly-chart__label monthly-chart__label--on' : 'monthly-chart__label'
              }
            >
              <span className="monthly-chart__label-long">{label}</span>
              <span className="monthly-chart__label-short">{label.charAt(0)}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
