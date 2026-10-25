/**
 * QUOI     — le bloc « Discussions » de la fiche : la discussion, la sourdine au bout de son titre.
 * POURQUOI — maquette « Fiche · sourdine de la discussion » : un exposant engagé sur la date peut
 *            couper les notifications des nouvelles questions de ce festival.
 * ATTENTION — la sourdine n'apparaît qu'à qui reçoit ces notifications : un exposant engagé
 *            (dossier envoyé, inscrit, confirmé). Les réponses à ses propres questions arrivent
 *            toujours.
 */
import { BellOff } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { PROGRAMMED_STATUSES } from '@/lib/friends'
import type { ParticipationStatus } from '@/types/database'
import { EventDiscussion } from './EventDiscussion'
import { useDiscussionMute } from './useDiscussionMute'

export function DiscussionBlock({
  eventId,
  status,
}: {
  eventId: string
  status: ParticipationStatus | null
}) {
  const { actor, entities } = useAuth()
  const exhibitor = entities.some(
    (entity) => entity.actor_id === actor?.id && entity.type === 'exposant',
  )
  const engaged = exhibitor && status !== null && PROGRAMMED_STATUSES.includes(status)
  const { muted, saving, failed, toggle } = useDiscussionMute(eventId, engaged ? actor?.id : null)

  return (
    <section className="event-page__block" id="discussions">
      <EventDiscussion
        eventId={eventId}
        action={
          engaged && (
            <button
              type="button"
              className={muted ? 'discussion-mute discussion-mute--on' : 'discussion-mute'}
              aria-pressed={muted}
              disabled={saving}
              onClick={toggle}
            >
              <BellOff size={14} strokeWidth={2} />
              {muted ? 'En sourdine' : 'Sourdine'}
            </button>
          )
        }
      />
      {engaged && muted && (
        <p className="discussion-mute__note">
          Tu ne reçois plus de notification pour les nouvelles questions de ce festival. Les
          réponses à tes propres questions arrivent toujours.
        </p>
      )}
      {failed && (
        <p className="discussion-mute__note" role="status">
          La sourdine n’a pas pu être lue ou enregistrée. Réessaie dans un instant.
        </p>
      )}
    </section>
  )
}
