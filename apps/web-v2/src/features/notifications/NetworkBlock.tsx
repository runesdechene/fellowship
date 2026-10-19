/**
 * QUOI     — le bloc du haut de la cloche : « Demandes d'ami » (trois exposants au plus, avec × et +)
 *            puis « Nouveaux abonnés » (les comptes non exposants de la semaine, sur une ligne).
 * POURQUOI — micro-maquette validée par Uriel le 19/10/2026 : on répond à une demande sans quitter la
 *            cloche, et elle remplace la notification « … suit maintenant ta vitrine ». Le bloc ne
 *            s'affiche que s'il a quelque chose à dire ; la cloche décide.
 */
import { Plus, X } from 'lucide-react'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { newcomersPhrase, type FriendRequest, type Member } from '@/lib/network'

/** Trois demandes à la fois ; au-delà, la liste des abonnés les montre toutes. */
const SHOWN = 3

interface NetworkBlockProps {
  requests: FriendRequest[]
  newcomers: Member[]
  /** Les demandes suivies en retour ou refusées : elles s'effacent avant la relecture. */
  answered: ReadonlySet<string>
  onFollow: (id: string) => void
  onDecline: (id: string) => void
  /** Ferme la cloche et mène à la liste des abonnés. */
  onOpenFollowers: () => void
}

export function NetworkBlock({
  requests,
  newcomers,
  answered,
  onFollow,
  onDecline,
  onOpenFollowers,
}: NetworkBlockProps) {
  return (
    <section className="notif-network">
      {requests.length > 0 && (
        <>
          <h3 className="notif-panel__day notif-network__alert">
            Demandes d’ami · {requests.length}
          </h3>
          {requests.slice(0, SHOWN).map((request) => {
            const leaving = answered.has(request.id)
            return (
              <div
                key={request.id}
                className={leaving ? 'notif notif-network__row--leaving' : 'notif'}
                inert={leaving}
              >
                <Avatar
                  className="notif-network__avatar"
                  src={request.avatarUrl}
                  name={request.name}
                />
                <span className="notif__body">
                  <span className="notif-network__name">{request.name}</span>
                  <span className="notif__time">{request.city ?? 'Exposant'}</span>
                </span>
                <span className="notif-network__actions">
                  <button
                    type="button"
                    className="side-card__follow"
                    onClick={() => onDecline(request.id)}
                    aria-label={`Refuser la demande de ${request.name}`}
                  >
                    <X size={13} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    className="side-card__follow"
                    onClick={() => onFollow(request.id)}
                    aria-label={`Suivre ${request.name} en retour`}
                  >
                    <Plus size={13} strokeWidth={2} />
                  </button>
                </span>
              </div>
            )
          })}
          {requests.length > SHOWN && (
            <button type="button" className="notif-network__more" onClick={onOpenFollowers}>
              Voir les {requests.length} demandes →
            </button>
          )}
        </>
      )}
      {newcomers.length > 0 && (
        <>
          <h3 className="notif-panel__day">Nouveaux abonnés</h3>
          <button
            type="button"
            className="notif notif-network__newcomers"
            onClick={onOpenFollowers}
          >
            <AvatarStack>
              {newcomers.slice(0, SHOWN).map((member) => (
                <Avatar
                  key={member.id}
                  className="notif-network__face"
                  src={member.avatarUrl}
                  name={member.name}
                />
              ))}
            </AvatarStack>
            <span className="notif__open">
              {newcomersPhrase(newcomers.map((member) => member.name))}
            </span>
          </button>
        </>
      )}
    </section>
  )
}
