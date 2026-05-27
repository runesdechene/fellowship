import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useMyParticipations, useFriendsParticipations } from '@/hooks/use-participations'
import { groupParticipationsByMonth, type MonthBucket } from '@/lib/mes-dates'
import { CalendarFriendsModal } from '@/components/calendar/CalendarFriendsModal'
import { DateRow } from '@/components/mes-dates/DateRow'
import type { ActorKind } from '@/lib/explorer'
import './MesDates.css'

type Tab = 'upcoming' | 'past'

export function MesDatesPage() {
  const { currentActor } = useAuth()
  const actorKind: ActorKind = currentActor?.kind === 'entity' ? 'entity' : 'person'

  const now = useMemo(() => new Date(), [])
  const [tab, setTab] = useState<Tab>('upcoming')
  const [modalEvent, setModalEvent] = useState<{ id: string; name: string } | null>(null)

  const { participations, loading } = useMyParticipations()
  const { participations: friendActivity } = useFriendsParticipations()

  // Mes dates affiche TOUT (pas de cap d'horizon) : le palier gratuit est piloté
  // par un quota de dates/an posé à l'ajout d'un statut, pas par une fenêtre de vue.
  const buckets = useMemo(
    () => groupParticipationsByMonth(participations, { now, direction: tab }),
    [participations, now, tab],
  )

  const companionsFor = (eventId: string) => friendActivity.filter(f => f.event_id === eventId)

  const subtitle = actorKind === 'entity'
    ? 'Tes prochains festivals.'
    : "Les festivals où tu vas — et ceux qui te font de l'œil."

  const renderBuckets = (list: MonthBucket[]) => list.map(b => (
    <section key={`${b.year}-${b.month}`} className="md-month-sec">
      <div className="md-month">{b.label}</div>
      {b.events.map(p => (
        <DateRow
          key={p.id}
          participation={p}
          actorKind={actorKind}
          now={now}
          companions={companionsFor(p.event_id)}
          onOpenCompanions={(id, name) => setModalEvent({ id, name })}
        />
      ))}
    </section>
  ))

  const isEmpty = !loading && buckets.length === 0

  return (
    <div className="md-page">
      <div className="md-head">
        <div>
          <h1 className="page-title">Mes dates</h1>
          <p className="md-sub">{subtitle}</p>
        </div>
      </div>

      <div className="md-tabs">
        <button className={'md-tab' + (tab === 'upcoming' ? ' on' : '')} onClick={() => setTab('upcoming')}>À venir</button>
        <button className={'md-tab' + (tab === 'past' ? ' on' : '')} onClick={() => setTab('past')}>Passées</button>
      </div>

      {loading ? (
        <div className="md-skel">{[0, 1, 2].map(i => <div key={i} className="md-skel-row" />)}</div>
      ) : isEmpty ? (
        <div className="md-empty">
          <p>{tab === 'upcoming' ? "Aucune date à venir pour l'instant." : 'Aucune date passée.'}</p>
          <Link to="/explorer" className="md-empty-btn"><Compass size={16} strokeWidth={2.2} /> Explorer les festivals</Link>
        </div>
      ) : (
        <>
          {renderBuckets(buckets)}

          {/* CTA Explorer en bas (festivalier, liste non vide) */}
          {actorKind === 'person' && (
            <div className="md-addmore">
              <p>Envie d'en ajouter d'autres&nbsp;?</p>
              <Link to="/explorer" className="md-empty-btn"><Compass size={16} strokeWidth={2.2} /> Explorer les festivals</Link>
            </div>
          )}
        </>
      )}

      {modalEvent && (
        <CalendarFriendsModal
          eventName={modalEvent.name}
          friends={friendActivity.filter(f => f.event_id === modalEvent.id)}
          onClose={() => setModalEvent(null)}
        />
      )}
    </div>
  )
}
