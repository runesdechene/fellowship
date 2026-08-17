import { Pencil } from 'lucide-react'
import { formatFullDate } from '@/lib/dates'
import { formatEuros, formatSignedEuros } from '@/lib/money'
import { useTransitionNavigate } from '@/lib/navigation'
import type { DashboardReport } from './useDashboard'

function ReportCard({ report }: { report: DashboardReport }) {
  const filled = report.net !== null
  const go = useTransitionNavigate()

  return (
    <button
      type="button"
      className={filled ? 'report' : 'report report--todo'}
      onClick={() => go(`/evenement/${report.eventId}`)}
    >
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

export function ReportsSection({ reports }: { reports: DashboardReport[] }) {
  return (
    <div className="reports">
      {reports.map((report) => (
        <ReportCard key={report.eventId} report={report} />
      ))}
    </div>
  )
}
