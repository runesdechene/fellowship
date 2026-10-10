/**
 * QUOI     — la ligne des amis d'une fiche (« Gautier, Lina, Tom et 5 autres y vont aussi ») et la
 *            popup « Qui y va » qu'elle ouvre.
 * POURQUOI — Uriel, 11/10/2026 : on doit savoir QUI y va. La ligne nomme jusqu'à trois amis ; un
 *            clic ouvre la liste complète (maquette 2218:2).
 * ATTENTION — la popup a son adresse (`?voir=amis`) : le retour la ferme, une adresse partagée
 *            l'ouvre. Ouverte ici, on la ferme en revenant en arrière ; arrivée telle quelle, on
 *            retire seulement le paramètre.
 */
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import type { Friend } from '@/lib/friends'
import { namesLine } from '@/lib/name-line'
import { WhoGoesDialog } from './WhoGoesDialog'

interface CompanionsProps {
  eventId: string
  /** « Les Aventuriales · 25–27 sept. », en tête de la popup. */
  subtitle: string
  friends: Friend[]
}

const OPENED_HERE = 'who-goes'

export function Companions({ eventId, subtitle, friends }: CompanionsProps) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const open = params.get('voir') === 'amis'

  if (friends.length === 0) return null
  const line = namesLine(
    friends.map((friend) => friend.name),
    { one: 'y va aussi', many: 'y vont aussi' },
  )

  function show() {
    const next = new URLSearchParams(params)
    next.set('voir', 'amis')
    setParams(next, { state: OPENED_HERE })
  }

  function hide() {
    if (location.state === OPENED_HERE) {
      void navigate(-1)
      return
    }
    const next = new URLSearchParams(params)
    next.delete('voir')
    setParams(next, { replace: true })
  }

  return (
    <>
      <button type="button" className="event-page__companions" onClick={show}>
        <span className="event-page__avatars">
          {friends.slice(0, 5).map((friend) => (
            <span key={friend.id} className="event-page__avatar">
              <Avatar src={friend.avatarUrl} name={friend.name} />
            </span>
          ))}
        </span>
        <span className="event-page__companions-text">
          {line.map((part, index) =>
            typeof part === 'string' ? part : <b key={index}>{part.strong}</b>,
          )}
        </span>
      </button>
      <WhoGoesDialog
        open={open}
        eventId={eventId}
        subtitle={subtitle}
        friends={friends}
        onClose={hide}
      />
    </>
  )
}
