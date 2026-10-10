/**
 * QUOI     — l'écran du tableau de bord : accueil, invitation au téléphone, bande d'action, frise
 *            de saison, prochaine date, dates à venir, mes dossiers, mes bilans.
 * POURQUOI — c'est l'écran de la maquette, et le seul point d'entrée de la V2. Il ne calcule rien :
 *            il assemble ce que useDashboard prépare.
 */
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/lib/auth'
import { usePlan } from '@/lib/usePlan'
import { ActionBanner } from './ActionBanner'
import { DossiersSection } from './DossiersSection'
import { NextDateCard } from './NextDateCard'
import { PhoneInvite } from './PhoneInvite'
import { ReportsSection } from './ReportsSection'
import { SeasonChart } from './SeasonChart'
import { UpcomingCard } from './UpcomingCard'
import { useDashboard } from './useDashboard'

export function Dashboard() {
  const { actor } = useAuth()
  // En gratuit, les bilans se devinent sous un voile et la bande qui les réclame se tait.
  const { pro } = usePlan()
  const {
    programmedCount,
    months,
    next,
    upcoming,
    dossiers,
    reports,
    seasonNet,
    seasonRevenue,
    seasonGoal,
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
            Bonjour, <b>{actor?.label ?? ''}</b>
          </h1>
          <p className="dashboard__subtitle">
            {loading ? (
              'Chargement de tes dates…'
            ) : error ? (
              'Tes dates n’ont pas pu être chargées.'
            ) : (
              <>
                <b>
                  {programmedCount} {programmedCount === 1 ? 'date' : 'dates'}
                </b>{' '}
                {programmedCount === 1 ? 'prévue' : 'prévues'} à ce jour
              </>
            )}
          </p>
        </div>
      </header>

      <PhoneInvite />

      {pendingReport && pro && (
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
            <h2 className="dashboard__section-title">À venir</h2>
            <UpcomingCard dates={upcoming} />
          </div>
        </section>
      )}

      {dossiers.length > 0 && (
        <section className="dashboard__section">
          <h2 className="dashboard__section-title">Mes dossiers</h2>
          <p className="dashboard__section-note">
            Ce qui reste à envoyer, à payer ou à recevoir sur tes prochaines dates
          </p>
          <DossiersSection dossiers={dossiers} />
        </section>
      )}

      {reports.length > 0 && (
        <ReportsSection
          reports={reports}
          seasonNet={seasonNet}
          seasonRevenue={seasonRevenue}
          seasonGoal={seasonGoal}
          locked={!pro}
        />
      )}
    </div>
  )
}
