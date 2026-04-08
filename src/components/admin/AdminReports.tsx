import { useAdminReports } from '@/hooks/use-admin'
import { Loader2, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function AdminReports() {
  const { reports, loading } = useAdminReports()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground">Aucun signalement</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="p-3 font-medium">Événement</th>
            <th className="p-3 font-medium">Date du rapport</th>
            <th className="p-3 font-medium">Revenus</th>
            <th className="p-3 font-medium">Coûts</th>
            <th className="p-3 font-medium">Points forts</th>
            <th className="p-3 font-medium">Améliorations</th>
            <th className="p-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.map(report => (
            <tr key={report.id} className="border-b border-border/50 hover:bg-muted/30">
              <td className="p-3 font-medium">{report.event_name ?? '—'}</td>
              <td className="p-3 text-muted-foreground">{new Date(report.created_at).toLocaleDateString('fr-FR')}</td>
              <td className="p-3">{report.revenue != null ? `${report.revenue} €` : '—'}</td>
              <td className="p-3">{report.booth_cost != null || report.charges != null ? `${(report.booth_cost ?? 0) + (report.charges ?? 0)} €` : '—'}</td>
              <td className="p-3 text-muted-foreground max-w-[200px] truncate">{report.wins?.join(', ') ?? '—'}</td>
              <td className="p-3 text-muted-foreground max-w-[200px] truncate">{report.improvements?.join(', ') ?? '—'}</td>
              <td className="p-3">
                <button
                  onClick={() => navigate(`/evenement/${report.event_id}`)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                  title="Voir l'événement"
                >
                  <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
