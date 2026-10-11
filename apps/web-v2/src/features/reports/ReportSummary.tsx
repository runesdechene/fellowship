/**
 * QUOI     — le résumé d'un bilan : bénéfice, objectif de chiffre d'affaires comparé au réalisé,
 *            chiffre d'affaires, frais, bénéfice par jour, « Enregistré automatiquement ».
 * POURQUOI — ce qu'on vient regarder en premier : sur téléphone, il passe en tête de l'écran.
 * ATTENTION — l'objectif vient du dossier de la date (participation_dossiers.revenue_goal) et
 *            se fixe ici (ReportGoal), après le festival.
 */
import { Poster } from '@/components/ui/Poster'
import { Check } from 'lucide-react'
import { formatDateRange } from '@/lib/dates'
import { formatEuros, formatSignedEuros } from '@/lib/money'
import { reportFigures } from '@/lib/reports'
import { ReportGoal } from './ReportGoal'
import type { ReportDetail } from './useReport'

interface ReportSummaryProps {
  detail: ReportDetail
  saving: boolean
  goal: number | null
  onSaveGoal: (goal: number | null) => void
}

export function ReportSummary({ detail, saving, goal, onSaveGoal }: ReportSummaryProps) {
  const { date } = detail
  const { revenue, costs, net, days } = reportFigures(date)

  return (
    <div className="report-summary">
      <div className="report-summary__event">
        <Poster imageUrl={date.imageUrl} tags={date.tags} className="report-summary__thumb" />
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

      <ReportGoal goal={goal} revenue={revenue} onSave={onSaveGoal} />

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
