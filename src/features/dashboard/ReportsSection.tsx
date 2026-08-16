import { Pencil } from 'lucide-react'
import { formatFullDate } from '@/lib/dates'
import { formatEuros, formatSignedEuros } from '@/lib/money'
import type { DashboardReport, ReportsOverflow } from './useDashboard'

function ReportCard({ report }: { report: DashboardReport }) {
  const filled = report.net !== null

  return (
    <button type="button" className={filled ? 'report' : 'report report--todo'}>
      {report.imageUrl ? (
        <img className="report__thumb" src={report.imageUrl} alt="" />
      ) : (
        <span className="report__thumb" />
      )}

      <span className="report__body">
        <span className="report__head">
          <span className="report__name">{report.name}</span>
          {filled && <Pencil className="report__action" size={13} strokeWidth={1.75} />}
        </span>
        <span className="report__date">Le {formatFullDate(report.date)}</span>
        {filled ? (
          <span className="report__money">
            <span className="report__revenue">{formatEuros(report.revenue ?? 0)}</span>
            <span className="report__net">{formatSignedEuros(report.net ?? 0)}</span>
          </span>
        ) : (
          <span className="report__todo">+ Cliquer pour remplir le bilan</span>
        )}
      </span>
    </button>
  )
}

/** Les bilans plus anciens, en affiches empilées avec leur compte par-dessus. */
function ReportStack({ overflow }: { overflow: ReportsOverflow }) {
  const bare = overflow.images.length === 0

  return (
    <button
      type="button"
      className={bare ? 'report-stack report-stack--bare' : 'report-stack'}
      aria-label={`Voir les ${overflow.count} autres bilans`}
    >
      {overflow.images.map((image) => (
        <img key={image} className="report-stack__layer" src={image} alt="" />
      ))}
      <span className="report-stack__count">+{overflow.count}</span>
    </button>
  )
}

interface ReportsSectionProps {
  reports: DashboardReport[]
  overflow: ReportsOverflow | null
}

export function ReportsSection({ reports, overflow }: ReportsSectionProps) {
  return (
    <div className="reports">
      {reports.map((report) => (
        <ReportCard key={report.eventId} report={report} />
      ))}
      {overflow && <ReportStack overflow={overflow} />}
    </div>
  )
}
