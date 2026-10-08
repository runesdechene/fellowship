/**
 * QUOI     — le résumé d'un bilan : bénéfice, objectif de chiffre d'affaires comparé au réalisé,
 *            chiffre d'affaires, frais, bénéfice par jour, « Enregistré automatiquement ».
 * POURQUOI — ce qu'on vient regarder en premier : sur téléphone, il passe en tête de l'écran.
 * ATTENTION — l'objectif vient du dossier de la date (participation_dossiers.revenue_goal) ;
 *            sans objectif, le bloc n'apparaît pas.
 */
import { Check, Target } from 'lucide-react'
import type { CSSProperties } from 'react'
import { formatDateRange } from '@/lib/dates'
import { formatEuros, formatSignedEuros, goalShare } from '@/lib/money'
import { reportFigures } from '@/lib/reports'
import type { ReportDetail } from './useReport'

export function ReportSummary({ detail, saving }: { detail: ReportDetail; saving: boolean }) {
  const { date, revenueGoal } = detail
  const { revenue, costs, net, days } = reportFigures(date)
  const share = revenueGoal ? goalShare(revenue, revenueGoal) : null

  return (
    <div className="report-summary">
      <div className="report-summary__event">
        {date.imageUrl ? (
          <img className="report-summary__thumb" src={date.imageUrl} alt="" />
        ) : (
          <span className="report-summary__thumb" />
        )}
        <span className="report-summary__event-text">
          <span className="report-summary__name">{date.name}</span>
          <span className="report-summary__dates">
            {formatDateRange(date.startDate, date.endDate, 'long')} {date.startDate.getFullYear()}
          </span>
        </span>
      </div>

      <div className="report-summary__net-block">
        <span className="report-summary__label">Bénéfice</span>
        <span className="report-summary__net">{formatSignedEuros(net)}</span>
      </div>

      {revenueGoal !== null && share && (
        <div className="report-summary__goal">
          <span className="report-summary__goal-head">
            <span className="report-summary__goal-title">
              <Target size={13} strokeWidth={2} />
              Objectif {formatEuros(revenueGoal)}
            </span>
            <span>{share.percent >= 100 ? `+${share.percent - 100} %` : `${share.percent} %`}</span>
          </span>
          <span
            className="report-summary__gauge"
            style={{ '--gauge': String(share.ratio) } as CSSProperties}
          />
          <span className="report-summary__goal-note">
            Réalisé {formatEuros(revenue)}
            {share.percent >= 100 ? ' — objectif dépassé' : ` sur ${formatEuros(revenueGoal)}`}
          </span>
        </div>
      )}

      <dl className="report-summary__rows">
        <div className="report-summary__row">
          <dt>Chiffre d’affaires</dt>
          <dd>{formatEuros(revenue)}</dd>
        </div>
        <div className="report-summary__row">
          <dt>Frais</dt>
          <dd>{formatEuros(costs)}</dd>
        </div>
        <div className="report-summary__row">
          <dt>Bénéfice par jour</dt>
          <dd>{formatEuros(net / days)}</dd>
        </div>
      </dl>

      <span className="report-summary__saved">
        <Check size={13} strokeWidth={2} />
        {saving ? 'Enregistrement…' : 'Enregistré automatiquement'}
      </span>
    </div>
  )
}
