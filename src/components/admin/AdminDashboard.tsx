import { useAdminMetrics } from '@/hooks/use-admin'
import { Loader2, Users, UserCheck, Eye, CalendarDays, Ticket, UserPlus } from 'lucide-react'

export function AdminDashboard() {
  const { metrics, loading } = useAdminMetrics()

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const cards = [
    { label: 'Exposants', value: metrics.totalExposants, icon: UserCheck },
    { label: 'Visiteurs', value: metrics.totalVisitors, icon: Eye },
    { label: 'Total utilisateurs', value: metrics.totalUsers, icon: Users },
    { label: 'Événements actifs', value: metrics.activeEvents, icon: CalendarDays },
    { label: 'Participations (mois)', value: metrics.participationsThisMonth, icon: Ticket },
    { label: 'Nouveaux (7j)', value: metrics.newUsers7d, icon: UserPlus },
    { label: 'Nouveaux (30j)', value: metrics.newUsers30d, icon: UserPlus },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <div key={label} className="rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Icon className="h-4 w-4" strokeWidth={1.5} />
            <span className="text-xs font-medium">{label}</span>
          </div>
          <p className="text-2xl font-extrabold">{value}</p>
        </div>
      ))}
    </div>
  )
}
