/**
 * QUOI     — la carte de l'année de « Mes bilans » : le bénéfice, le chiffre d'affaires et sa
 *            variation sur l'année d'avant, les frais, la meilleure date.
 * POURQUOI — le bénéfice se lit en premier, en serif et dans la terre du logo : c'est de l'acquis.
 *            Sur téléphone, les trois autres chiffres passent en lignes libellé / valeur.
 */
import { formatEuros, formatSignedEuros } from '@/lib/money'
import type { YearSummary } from '@/lib/reports'

function signedPercent(value: number): string {
  return `${value >= 0 ? '+' : '−'}${Math.abs(value)} %`
}

export function YearCard({ summary, year }: { summary: YearSummary; year: number }) {
  const { net, revenue, costs, filledCount, best, bestNet, bestDays, revenueChange } = summary

  return (
    <section className="year-card">
      <div className="year-card__main">
        <span className="year-card__label">Bénéfice {year}</span>
        <span className="year-card__net">{formatSignedEuros(net)}</span>
        <span className="year-card__note">
          sur {filledCount} {filledCount === 1 ? 'date' : 'dates'}
        </span>
      </div>

      <div className="year-card__figure">
        <span className="year-card__label">Chiffre d’affaires</span>
        <span className="year-card__value">{formatEuros(revenue)}</span>
        {revenueChange !== null && (
          <span className="year-card__note">
            {signedPercent(revenueChange)} sur {year - 1}
          </span>
        )}
      </div>

      <div className="year-card__figure">
        <span className="year-card__label">Frais</span>
        <span className="year-card__value">{formatEuros(costs)}</span>
        <span className="year-card__note">emplacements, route, nuits</span>
      </div>

      {best && (
        <div className="year-card__figure">
          <span className="year-card__label">Meilleure date</span>
          <span className="year-card__value">{best.name}</span>
          <span className="year-card__note">
            {formatSignedEuros(bestNet)} en {bestDays} {bestDays === 1 ? 'jour' : 'jours'}
          </span>
        </div>
      )}
    </section>
  )
}
