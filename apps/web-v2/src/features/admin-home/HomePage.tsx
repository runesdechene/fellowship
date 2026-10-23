/**
 * QUOI     — l'accueil de l'administration (`/admin/accueil`) : le titre qui dit qui est venu, les
 *            visiteurs jour par jour, quatre chiffres, ce que font les gens, ce qu'il reste à
 *            traiter, les dernières personnes passées et le fil « Activité du réseau ».
 * POURQUOI — une vision globale de la santé de l'application en arrivant (Uriel, 22/10/2026,
 *            maquette 2448:233).
 */
import { CalendarDays, CircleAlert, Sparkles, Users } from 'lucide-react'
import { AdminStats } from '@/components/ui/AdminStats'
import { TrendLine } from '@/components/ui/TrendLine'
import { counted, visitorsHeadline, visitorsLine } from '@/lib/admin-home'
import { addDays, formatDayMonthShort } from '@/lib/dates'
import { NetworkActivity } from '@/features/activity/NetworkActivity'
import { HomeActivity } from './HomeActivity'
import { HomeCard } from './HomeCard'
import { HomeTodo } from './HomeTodo'
import { RecentVisitors } from './RecentVisitors'
import { useAdminHome } from './useAdminHome'

export function HomePage() {
  const { data, error } = useAdminHome()
  if (error) return <p className="admin-page__error">{error}</p>
  if (!data) return null

  const { figures, visitors } = data
  const now = new Date()
  const days = figures.visiteurs_par_jour
  const createdThisWeek = figures.fiches.at(-1) ?? 0

  return (
    <div className="admin-page admin-home">
      <header className="admin-home__head">
        <h1 className="admin-home__title">{visitorsHeadline(figures.venus_semaine)}</h1>
        <p className="admin-page__lede">
          {visitorsLine(now, figures.venus_aujourdhui, figures.venus_mois)}
        </p>
      </header>

      <HomeCard title="Visiteurs par jour" hint="les 30 derniers jours" className="home-pulse">
        <TrendLine
          values={days}
          label="Visiteurs par jour, sur 30 jours"
          tone="logo"
          scale
          names={days.map((_, index) => formatDayMonthShort(addDays(now, index + 1 - days.length)))}
        />
        <div className="home-pulse__axis">
          <span>{formatDayMonthShort(addDays(now, 1 - days.length))}</span>
          <span className="home-pulse__today">aujourd’hui, {days.at(-1) ?? 0}</span>
        </div>
      </HomeCard>

      <AdminStats
        figures={[
          {
            label: 'Comptes',
            Icon: Users,
            tone: 'prune',
            value: figures.comptes,
            detail: `+${figures.comptes_semaine} cette semaine`,
          },
          {
            label: 'Enseignes Pro',
            Icon: Sparkles,
            tone: 'terre',
            value: figures.pro,
            detail:
              figures.essais > 0
                ? `${counted(figures.essais, 'essai', 'essais')} en cours`
                : 'aucun essai en cours',
          },
          {
            label: 'Dates à venir',
            Icon: CalendarDays,
            tone: 'bleu',
            value: figures.dates_a_venir,
            detail: `${counted(createdThisWeek, 'fiche créée', 'fiches créées')} cette semaine`,
          },
          {
            label: 'Paiements en échec',
            Icon: CircleAlert,
            tone: 'brique',
            value: figures.echecs,
            detail: figures.echecs > 0 ? 'à relancer' : 'aucun',
            alert: figures.echecs > 0,
          },
        ]}
      />

      <div className="admin-home__columns">
        <div className="admin-home__column">
          <HomeActivity figures={figures} />
          <HomeTodo figures={figures} />
        </div>
        <div className="admin-home__column">
          <RecentVisitors visitors={visitors} now={now} />
          <NetworkActivity className="admin-card" />
        </div>
      </div>
    </div>
  )
}
