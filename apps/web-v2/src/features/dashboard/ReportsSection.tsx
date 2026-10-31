/**
 * QUOI     — le bloc « Mes bilans » : à gauche le bénéfice de l'année sur son chiffre d'affaires,
 *            à droite les trois dernières dates passées, remplies ou à remplir.
 * POURQUOI — un bilan vide se signale par son appel à remplir ; un bilan rempli montre recette
 *            et bénéfice. « Tout voir » mène à Mes bilans (/bilans) ; un bilan mène à son écran
 *            (/bilans/:eventId). En gratuit (`locked`), le bloc passe sous un voile et une pastille
 *            mène à Mes bilans, qui présente le Pro.
 * ATTENTION — recettes chiffrées et verrouillées (`masked`) : leurs montants passent en « •••• € » ;
 *            dès qu'une date de l'année l'est, le total de la saison aussi, et la jauge d'objectif
 *            (qui se lit sur le CA) disparaît.
 */
import { Poster } from '@/components/ui/Poster'
import { ArrowRight } from 'lucide-react'
import type { CSSProperties } from 'react'
import { ProBadge } from '@/components/ui/ProBadge'
import { ProVeil } from '@/components/ui/ProVeil'
import { formatFullDate } from '@/lib/dates'
import { formatEuros, formatSignedEuros, goalShare, MASKED_EUROS } from '@/lib/money'
import { useTransitionNavigate } from '@/lib/navigation'
import type { DashboardReport } from './useDashboard'

const SHOWN = 3

function ReportItem({ report }: { report: DashboardReport }) {
  const go = useTransitionNavigate()
  const filled = report.net !== null

  return (
    <button type="button" className="report" onClick={() => go(`/bilans/${report.eventId}`)}>
      <Poster imageUrl={report.imageUrl} tags={report.tags} className="report__thumb" />
      <span className="report__body">
        <span className="report__name">{report.name}</span>
        <span className="report__date">
          {formatFullDate(report.date)}
          {filled && ` · ${report.masked ? MASKED_EUROS : formatEuros(report.revenue ?? 0)}`}
        </span>
        {filled ? (
          <span className="report__net">
            {report.masked ? MASKED_EUROS : formatSignedEuros(report.net ?? 0)}
          </span>
        ) : (
          <span className="report__todo">
            <span className="report__todo-dot" />
            Bilan à remplir
            <ArrowRight size={13} strokeWidth={2} />
          </span>
        )}
      </span>
    </button>
  )
}

interface ReportsSectionProps {
  reports: DashboardReport[]
  seasonNet: number | null
  seasonRevenue: number | null
  seasonGoal: number | null
  /** En gratuit : flouté, avec l'invitation vers Mes bilans. */
  locked: boolean
}

export function ReportsSection({
  reports,
  seasonNet,
  seasonRevenue,
  seasonGoal,
  locked,
}: ReportsSectionProps) {
  const go = useTransitionNavigate()

  return (
    <section className="dashboard__section">
      <div className="dashboard__section-head">
        <h2 className="dashboard__section-title">Mes bilans</h2>
        {reports.length > 0 && !locked && (
          <button type="button" className="reports__more" onClick={() => go('/bilans')}>
            Tout voir
            <ArrowRight size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      {locked ? (
        <ProVeil
          invitation={
            <button type="button" className="reports__invite" onClick={() => go('/bilans')}>
              <ProBadge />
              Tes bilans avec le Pro
              <ArrowRight size={14} strokeWidth={2} />
            </button>
          }
        >
          <ReportsCard
            reports={reports}
            seasonNet={seasonNet}
            seasonRevenue={seasonRevenue}
            seasonGoal={seasonGoal}
          />
        </ProVeil>
      ) : (
        <ReportsCard
          reports={reports}
          seasonNet={seasonNet}
          seasonRevenue={seasonRevenue}
          seasonGoal={seasonGoal}
        />
      )}
    </section>
  )
}

function ReportsCard({
  reports,
  seasonNet,
  seasonRevenue,
  seasonGoal,
}: Omit<ReportsSectionProps, 'locked'>) {
  const masked = reports.some((report) => report.masked)
  return (
    <div className="reports">
      {/* `typeof` et non `!== null` : une valeur absente vaut undefined,
            qui passait la garde et affichait « NaN € ». */}
      {typeof seasonNet === 'number' && typeof seasonRevenue === 'number' && (
        <div className="reports__season">
          <span className="reports__label">Bénéfice {new Date().getFullYear()}</span>
          <span className="reports__net">
            {masked ? MASKED_EUROS : formatSignedEuros(seasonNet)}
          </span>
          <span className="reports__revenue">
            sur <b>{masked ? MASKED_EUROS : formatEuros(seasonRevenue)}</b> de chiffre d’affaires
          </span>
          {seasonGoal !== null && !masked && (
            <>
              <span
                className="reports__gauge"
                style={
                  {
                    '--gauge': String(goalShare(seasonRevenue, seasonGoal).ratio),
                  } as CSSProperties
                }
              />
              <span className="reports__goal">
                {goalShare(seasonRevenue, seasonGoal).percent} % de l’objectif ·{' '}
                {formatEuros(seasonGoal)}
              </span>
            </>
          )}
        </div>
      )}
      <div className="reports__latest">
        {reports.slice(0, SHOWN).map((report) => (
          <ReportItem key={report.eventId} report={report} />
        ))}
      </div>
    </div>
  )
}
