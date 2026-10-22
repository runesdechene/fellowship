/**
 * QUOI     — l'écran du tableau de bord : accueil, paiement échoué, invitation au téléphone, la
 *            communauté, bande d'action, frise de saison, prochaine date, dates à venir, mes dossiers, pour toi, mes bilans.
 * POURQUOI — c'est l'écran de la maquette, et le seul point d'entrée de la V2. Il ne calcule rien :
 *            il assemble ce que useDashboard prépare. Un bloc sans contenu garde sa place en
 *            squelettes (maquette 2402:233) ; pendant le chargement ou après une erreur, il se tait.
 */
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/lib/auth'
import { usePlan } from '@/lib/usePlan'
import { ActionBanner } from './ActionBanner'
import { CommunitySummary } from './CommunitySummary'
import { DossiersSection } from './DossiersSection'
import { EmptyInvite } from './EmptyInvite'
import { FirstDateCard } from './FirstDateCard'
import { NextDateCard } from './NextDateCard'
import { PaymentBanner } from './PaymentBanner'
import { PhoneInvite } from './PhoneInvite'
import { ReportsSection } from './ReportsSection'
import { SeasonChart } from './SeasonChart'
import { SuggestionsSection } from './SuggestionsSection'
import { UpcomingCard } from './UpcomingCard'
import { useDashboard } from './useDashboard'

export function Dashboard() {
  const { actor, entities } = useAuth()
  const unpaid = entities.some(
    (entity) => entity.actor_id === actor?.id && entity.subscription_status === 'past_due',
  )
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
  // Les squelettes ne parlent qu'une fois les dates lues : jamais pendant le chargement.
  const settled = !loading && !error

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
            ) : programmedCount === 0 ? (
              'Aucune date prévue pour l’instant'
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

      {unpaid && actor && (
        <section className="dashboard__section">
          <PaymentBanner entityId={actor.id} />
        </section>
      )}

      <PhoneInvite />

      <CommunitySummary />

      {pendingReport && pro && (
        <section className="dashboard__section">
          <ActionBanner report={pendingReport} />
        </section>
      )}

      <section className="dashboard__section">
        <SeasonChart months={months} demo={settled && programmedCount === 0} />
      </section>

      {settled && (
        <section className="dashboard__section dashboard__columns">
          <div className="dashboard__column">
            <h2 className="dashboard__section-title">Ma prochaine date</h2>
            {next ? <NextDateCard date={next} /> : <FirstDateCard />}
          </div>
          <div className="dashboard__column">
            <h2 className="dashboard__section-title">À venir</h2>
            <UpcomingCard dates={upcoming} />
          </div>
        </section>
      )}

      {settled && <DossiersSection dossiers={dossiers} />}

      {/* Une clé par acteur : changer d'enseigne repart de zéro, jamais les cartes de l'autre. */}
      <SuggestionsSection key={actor?.id} />

      {settled && reports.length === 0 && (
        <section className="dashboard__section">
          <h2 className="dashboard__section-title">Mes bilans</h2>
          <EmptyInvite
            title="Ton bénéfice, festival par festival"
            note={`Après chaque date, note tes ventes et tes frais : ${pro ? 'Fellowship' : 'le Pro'} calcule ce que chaque festival t’a vraiment rapporté.`}
            pro={pro}
            preview="chart"
          />
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
