/**
 * QUOI     — la discussion du festival : questions, réponses, meilleure réponse, par canal.
 * POURQUOI — les exposants posent leurs questions sur la date elle-même, pas dans un salon
 *            général ; les canaux visibles dépendent des casquettes de l'utilisateur.
 */
import { useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import {
  askBlocker,
  canAsk,
  channelLabel,
  deriveAudience,
  filterByChannels,
  visibleChannels,
  type ThreadActor,
  type ThreadAudience,
} from '@/lib/threads'
import { Question } from './DiscussionThread'
import { useEventThreads } from './useEventThreads'

export function EventDiscussion({ eventId }: { eventId: string }) {
  const { actor, person, entities } = useAuth()
  const { threads, loading, error, saving, ask, reply, markBest, remove, removeReply } =
    useEventThreads(eventId, actor?.id, person?.actor_id)

  // Le type d'entité ne vit pas sur l'acteur actif : on le retrouve dans les
  // casquettes chargées à la connexion.
  const threadActor: ThreadActor | null = useMemo(() => {
    if (!actor) return null
    const entity = entities.find((e) => e.actor_id === actor.id)
    return { id: actor.id, kind: actor.kind, entityType: entity?.type ?? null }
  }, [actor, entities])

  const channels = useMemo(() => visibleChannels(entities.map((e) => e.type)), [entities])

  const [active, setActive] = useState<ThreadAudience[] | null>(null)
  // Tant que rien n'a été décoché, on montre tous les canaux disponibles.
  const shown = active ?? channels

  const [asking, setAsking] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const audience = deriveAudience(threadActor)
  // Aucune question du tout — a distinguer de « aucune dans les canaux
  // affiches », qui est un resultat de filtre et non une absence.
  const rienDuTout = threads.length === 0
  const blocker = askBlocker(title, body)
  const visible = filterByChannels(threads, shown)
  const isAdmin = person?.role === 'admin'

  function toggle(channel: ThreadAudience) {
    const current = shown
    setActive(
      current.includes(channel) ? current.filter((c) => c !== channel) : [...current, channel],
    )
  }

  /** Combien de questions vivent dans un canal — dit où il se passe quelque
      chose avant qu'on ait cliqué. */
  const compte = (channel: ThreadAudience) => threads.filter((t) => t.audience === channel).length

  return (
    <div className="discussion">
      {channels.length > 1 && (
        <div className="discussion__canaux">
          {channels.map((channel) => (
            <button
              key={channel}
              type="button"
              className="discussion__canal"
              aria-pressed={shown.includes(channel)}
              onClick={() => toggle(channel)}
            >
              {channelLabel(channel)}
              <small>{compte(channel)}</small>
            </button>
          ))}
        </div>
      )}

      {canAsk(threadActor) &&
        (asking ? (
          <div className="discussion__composer discussion__composer--question">
            <input
              className="discussion__champ discussion__champ--titre"
              autoFocus
              placeholder="On peut dormir sur place ?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="discussion__champ"
              rows={3}
              placeholder="Ajoute ce qui aidera à te répondre — d’où tu viens, ce que tu montes, ce qui te bloque."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="discussion__composer-pied">
              {audience && (
                <span className="discussion__note">
                  Posée dans le canal <b>{channelLabel(audience)}</b> — c’est celui de la casquette
                  avec laquelle tu es connecté.
                </span>
              )}
              {/* La raison du blocage, jamais un bouton gris sans explication. */}
              {blocker && title.trim() !== '' && (
                <span className="discussion__blocage">{blocker}</span>
              )}
              <button type="button" className="discussion__geste" onClick={() => setAsking(false)}>
                Annuler
              </button>
              <Button
                variant="action"
                disabled={saving || blocker !== null || !audience}
                onClick={() => {
                  if (!audience) return
                  void ask({ audience, title, body })
                  setTitle('')
                  setBody('')
                  setAsking(false)
                }}
              >
                Poser la question
              </Button>
            </div>
          </div>
        ) : (
          <button type="button" className="discussion__poser" onClick={() => setAsking(true)}>
            <span>
              <span className="discussion__poser-mot">Poser une question</span>
              {/* Quand il n’y a RIEN, l’absence se dit ICI plutôt qu’en
                  dessous : deux objets disaient la même chose, et le constat
                  était plus gros que l’invitation — c’était donc le vide
                  qu’on voyait. Plié dans le bouton, il devient la RAISON
                  d’écrire au lieu d’une annonce à côté. */}
              <span className="discussion__poser-sous">
                {rienDuTout
                  ? 'Personne n’a encore rien demandé. Si tu hésites sur l’électricité, le montage ou l’accès, quelqu’un d’autre hésite aussi.'
                  : audience === 'organisateur'
                    ? 'Aux autres organisateurs'
                    : 'Aux autres exposants et à l’organisateur'}
              </span>
            </span>
            <ArrowRight className="discussion__poser-fleche" size={18} strokeWidth={2} />
          </button>
        ))}

      {error && <p className="discussion__erreur">{error}</p>}

      {loading ? (
        <p className="event-page__state">Chargement de la discussion…</p>
      ) : visible.length === 0 ? (
        /* Rien à ajouter quand l’invitation porte déjà le message : on ne le
           répète que si l’acteur ne PEUT pas poser de question, ou si c’est
           un filtre qui a tout masqué. */
        ((rienDuTout && !canAsk(threadActor)) || !rienDuTout) && (
          <p className="discussion__vide">
            {rienDuTout
              ? 'Personne n’a encore rien demandé sur cette date.'
              : 'Aucune question dans les canaux affichés.'}
          </p>
        )
      ) : (
        <div className="discussion__fil">
          {visible.map((thread) => (
            <Question
              key={thread.id}
              thread={thread}
              actor={threadActor}
              isAdmin={isAdmin}
              saving={saving}
              onReply={(text) => void reply(thread.id, text)}
              onMarkBest={(replyId) => void markBest(thread.id, replyId)}
              onRemove={() => void remove(thread.id)}
              onRemoveReply={(replyId) => void removeReply(replyId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
