import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Compass } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { planForActor } from '@/lib/navModel'
import { useMyParticipations, useFriendsParticipations } from '@/hooks/use-participations'
import { groupParticipationsByMonth, freeWindowSplit, type MonthBucket } from '@/lib/mes-dates'
import { CalendarFriendsModal } from '@/components/calendar/CalendarFriendsModal'
import { DateRow } from '@/components/mes-dates/DateRow'
import type { ActorKind } from '@/lib/explorer'
import './MesDates.css'

type Tab = 'upcoming' | 'past'

export function MesDatesPage() {
  const { currentActor, currentActorRow } = useAuth()
  const actorKind: ActorKind = currentActor?.kind === 'entity' ? 'entity' : 'person'
  const isFreeEntity = actorKind === 'entity' && planForActor(currentActor, currentActorRow) === 'free'

  const now = useMemo(() => new Date(), [])
  const [tab, setTab] = useState<Tab>('upcoming')
  const [modalEvent, setModalEvent] = useState<{ id: string; name: string } | null>(null)

  const { participations, loading } = useMyParticipations()
  const { participations: friendActivity } = useFriendsParticipations()

  const buckets = useMemo(
    () => groupParticipationsByMonth(participations, { now, direction: tab }),
    [participations, now, tab],
  )

  // Exposant gratuit, onglet À venir : on coupe à 3 mois et on tease le reste.
  const split = useMemo(() => {
    if (isFreeEntity && tab === 'upcoming') return freeWindowSplit(buckets, now)
    return { visible: buckets, beyond: [] as MonthBucket[], beyondCount: 0 }
  }, [isFreeEntity, tab, buckets, now])

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

  const isEmpty = !loading && split.visible.length === 0 && split.beyond.length === 0

  return (
    <div className="md-page">
      <div className="md-head">
        <div>
          <h1 className="page-title">Mes dates</h1>
          <p className="md-sub">{subtitle}</p>
        </div>
        {isFreeEntity && tab === 'upcoming' && (
          <span className="md-freepill">🎟️ Vue gratuite · <b>3 mois</b></span>
        )}
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
          {renderBuckets(split.visible)}

          {/* Tease « Mes dates débloquée » : vraies dates au-delà de 3 mois, flou progressif. */}
          {split.beyond.length > 0 && (
            <div className="md-tease">
              {/* `inert` retire le sous-arbre du tab order ET de l'arbre d'accessibilité ET des pointer-events
                  (aria-hidden seul laisse les liens/boutons floutés focusables au clavier). */}
              <div className="md-tease-blur" inert>{renderBuckets(split.beyond)}</div>
              <div className="md-tease-cta">
                <div className="md-tease-lock"><Lock strokeWidth={1.5} /></div>
                <b>+{split.beyondCount} date{split.beyondCount > 1 ? 's' : ''} au-delà de 3 mois</b>
                <p>Vois ta <b>saison complète sur l'année</b> avec Fellowship Pro.</p>
                <Link to="/reglages" className="md-tease-btn">Voir ma saison complète — Pro</Link>
                <small>dès 9,99 € HT/mois · annulable à tout moment</small>
              </div>
            </div>
          )}

          {/* CTA Explorer en bas (festivalier, liste non vide) */}
          {actorKind === 'person' && split.visible.length > 0 && (
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
