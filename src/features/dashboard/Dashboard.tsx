import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/lib/auth'
import { formatEuros, formatSignedEuros } from '@/lib/money'
import { ActionBanner } from './ActionBanner'
import { NextDateCard } from './NextDateCard'
import { ReportsSection } from './ReportsSection'
import { SeasonChart } from './SeasonChart'
import { UpcomingCard } from './UpcomingCard'
import { useDashboard } from './useDashboard'

export function Dashboard() {
  const { actor } = useAuth()
  const {
    programmedCount,
    months,
    next,
    upcoming,
    reports,
    seasonNet,
    seasonRevenue,
    pendingReport,
    loading,
    error,
  } = useDashboard(actor?.id)

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <Avatar className="dashboard__avatar" src={actor?.avatarUrl} name={actor?.label} />
        <div>
          <h1 className="dashboard__greeting">
            Bienvenue <b>{actor?.label ?? ''}</b> 🫡
          </h1>
          <p className="dashboard__subtitle">
            {loading
              ? 'Chargement de tes dates…'
              : error
                ? 'Tes dates n’ont pas pu être chargées.'
                : `Tu as ${programmedCount} ${programmedCount === 1 ? 'date prévue' : 'dates prévues'} à ce jour`}
          </p>
        </div>
      </header>

      {pendingReport && (
        <section className="dashboard__section">
          <ActionBanner report={pendingReport} />
        </section>
      )}

      <section className="dashboard__section">
        <SeasonChart months={months} />
      </section>

      {next && (
        <section className="dashboard__section dashboard__columns">
          <div className="dashboard__column">
            <h2 className="dashboard__section-title">Ma prochaine date</h2>
            <NextDateCard date={next} />
          </div>
          <div className="dashboard__column">
            <h2 className="dashboard__section-title">A venir</h2>
            <UpcomingCard dates={upcoming} />
          </div>
        </section>
      )}

      {reports.length > 0 && (
        <section className="dashboard__section">
          <div className="dashboard__section-head">
            <h2 className="dashboard__section-title">Mes bilans</h2>
            {/* `typeof` et non `!== null` : une valeur absente vaut undefined,
                qui passait la garde et affichait « NaN € ». */}
            {typeof seasonNet === 'number' && typeof seasonRevenue === 'number' && (
              <p className="dashboard__section-total">
                <b>{formatSignedEuros(seasonNet)}</b> de bénéfice sur un CA de{' '}
                <b>{formatEuros(seasonRevenue)}</b> en {new Date().getFullYear()}
              </p>
            )}
          </div>
          <ReportsSection reports={reports} />
        </section>
      )}
    </div>
  )
}
