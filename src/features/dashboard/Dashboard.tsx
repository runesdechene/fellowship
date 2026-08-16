import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/lib/auth'
import { NextDateCard } from './NextDateCard'
import { SeasonChart } from './SeasonChart'
import { UpcomingCard } from './UpcomingCard'
import { useDashboard } from './useDashboard'

export function Dashboard() {
  const { actor } = useAuth()
  const { programmedCount, months, next, upcoming, loading, error } = useDashboard(actor?.id)

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
                : `Tu as encore ${programmedCount} ${programmedCount === 1 ? 'date programmée' : 'dates programmées'} !`}
          </p>
        </div>
      </header>

      <section className="dashboard__section">
        <SeasonChart months={months} />
      </section>

      <section className="dashboard__section dashboard__cards">
        {next ? (
          <NextDateCard date={next} />
        ) : (
          <p className="dashboard__empty">Aucune date programmée pour le moment.</p>
        )}
        {next && <UpcomingCard dates={upcoming} />}
      </section>
    </div>
  )
}
