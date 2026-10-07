/**
 * QUOI     — le bloc « Mes bilans » : à gauche le bénéfice de l'année sur son chiffre d'affaires,
 *            à droite les trois dernières dates passées, remplies ou à remplir ; « Tout voir »
 *            déplie les autres.
 * POURQUOI — un bilan vide se signale par son appel à remplir ; un bilan rempli montre recette
 *            et bénéfice. Un clic ouvre la fiche de la date.
 * ATTENTION — « Tout voir » déplie sur place tant que l'écran « Mes bilans » (lot 7) n'existe
 *            pas : aucun bilan ne doit devenir inaccessible.
 */
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { formatFullDate } from '@/lib/dates'
import { formatEuros, formatSignedEuros } from '@/lib/money'
import { useTransitionNavigate } from '@/lib/navigation'
import type { DashboardReport } from './useDashboard'

const SHOWN = 3

function ReportItem({ report }: { report: DashboardReport }) {
  const go = useTransitionNavigate()
  const filled = report.net !== null

  return (
    <button type="button" className="report" onClick={() => go(`/evenement/${report.eventId}`)}>
      {report.imageUrl ? (
        <img className="report__thumb" src={report.imageUrl} alt="" />
      ) : (
        <span className="report__thumb" />
      )}
      <span className="report__body">
        <span className="report__name">{report.name}</span>
        <span className="report__date">
          {formatFullDate(report.date)}
          {filled && ` · ${formatEuros(report.revenue ?? 0)}`}
        </span>
        {filled ? (
          <span className="report__net">{formatSignedEuros(report.net ?? 0)}</span>
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
}

export function ReportsSection({ reports, seasonNet, seasonRevenue }: ReportsSectionProps) {
  const [open, setOpen] = useState(false)
  const rest = reports.slice(SHOWN)

  return (
    <section className="dashboard__section">
      <div className="dashboard__section-head">
        <h2 className="dashboard__section-title">Mes bilans</h2>
        {rest.length > 0 && (
          <button
            type="button"
            className="reports__more"
            aria-expanded={open}
            onClick={() => {
              setOpen((value) => !value)
            }}
          >
            {open ? 'Replier' : 'Tout voir'}
            <ArrowRight size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="reports">
        {/* `typeof` et non `!== null` : une valeur absente vaut undefined,
            qui passait la garde et affichait « NaN € ». */}
        {typeof seasonNet === 'number' && typeof seasonRevenue === 'number' && (
          <div className="reports__season">
            <span className="reports__label">Bénéfice {new Date().getFullYear()}</span>
            <span className="reports__net">{formatSignedEuros(seasonNet)}</span>
            <span className="reports__revenue">
              sur <b>{formatEuros(seasonRevenue)}</b> de chiffre d’affaires
            </span>
          </div>
        )}
        <div className="reports__latest">
          {reports.slice(0, SHOWN).map((report) => (
            <ReportItem key={report.eventId} report={report} />
          ))}
        </div>
      </div>

      {open && (
        <div className="reports__all">
          {rest.map((report) => (
            <ReportItem key={report.eventId} report={report} />
          ))}
        </div>
      )}
    </section>
  )
}
