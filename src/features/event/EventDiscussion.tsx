import { useMemo, useState } from 'react'
import { CheckCheck, MessageSquare, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import {
  askBlocker,
  canAsk,
  canDelete,
  canMarkBest,
  channelLabel,
  deriveAudience,
  filterByChannels,
  isSolved,
  visibleChannels,
  type ThreadActor,
  type ThreadAudience,
} from '@/lib/threads'
import { useEventThreads, type Thread } from './useEventThreads'

/** « il y a 3 jours » — assez précis pour un fil, sans donner l'heure. */
function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 30) return `il y a ${days} jours`
  const months = Math.floor(days / 30)
  return months === 1 ? 'il y a un mois' : `il y a ${months} mois`
}

function ThreadCard({
  thread,
  actor,
  isAdmin,
  saving,
  onReply,
  onMarkBest,
  onRemove,
  onRemoveReply,
}: {
  thread: Thread
  actor: ThreadActor | null
  isAdmin: boolean
  saving: boolean
  onReply: (body: string) => void
  onMarkBest: (replyId: string | null) => void
  onRemove: () => void
  onRemoveReply: (replyId: string) => void
}) {
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)
  const solved = isSolved(thread)
  const canElect = canMarkBest(actor, { actorId: thread.actorId })

  return (
    <article className="thread">
      <header className="thread__head">
        <Avatar src={thread.avatarUrl} name={thread.name} />
        <div className="thread__identity">
          <h3 className="thread__title">{thread.title}</h3>
          <p className="thread__meta">
            <b>{thread.name}</b> · {channelLabel(thread.audience)} · {timeAgo(thread.createdAt)}
          </p>
        </div>
        {solved && (
          <span className="thread__solved">
            <CheckCheck size={12} strokeWidth={2.25} /> Répondu
          </span>
        )}
        {canDelete(actor, { actorId: thread.actorId }, isAdmin) && (
          <button
            type="button"
            className="thread__remove"
            onClick={onRemove}
            disabled={saving}
            aria-label="Supprimer la question"
          >
            <Trash2 size={14} strokeWidth={1.8} />
          </button>
        )}
      </header>

      {thread.body && <p className="thread__body">{thread.body}</p>}

      {thread.replies.length > 0 && (
        <ul className="thread__replies">
          {thread.replies.map((item) => {
            const best = item.id === thread.bestReplyId
            return (
              <li key={item.id} className={best ? 'reply reply--best' : 'reply'}>
                <Avatar src={item.avatarUrl} name={item.name} />
                <div className="reply__body">
                  <p className="reply__meta">
                    <b>{item.name}</b> · {timeAgo(item.createdAt)}
                    {best && <span className="reply__badge">Meilleure réponse</span>}
                  </p>
                  <p className="reply__text">{item.body}</p>
                  <div className="reply__actions">
                    {/* Élire, c'est aussi pouvoir se dédire : recliquer retire
                        le titre au lieu de le figer pour toujours. */}
                    {canElect && (
                      <button
                        type="button"
                        className="reply__action"
                        onClick={() => onMarkBest(best ? null : item.id)}
                        disabled={saving}
                      >
                        {best ? 'Ce n’est plus la meilleure' : 'Meilleure réponse'}
                      </button>
                    )}
                    {canDelete(actor, { actorId: item.actorId }, isAdmin) && (
                      <button
                        type="button"
                        className="reply__action"
                        onClick={() => onRemoveReply(item.id)}
                        disabled={saving}
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {actor &&
        (open ? (
          <div className="thread__composer">
            <textarea
              className="thread__field"
              rows={3}
              autoFocus
              placeholder="Ta réponse…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="thread__composer-actions">
              <Button
                variant="action"
                onClick={() => {
                  onReply(draft)
                  setDraft('')
                  setOpen(false)
                }}
                disabled={saving || !draft.trim()}
              >
                Répondre
              </Button>
              <Button variant="bare" onClick={() => setOpen(false)}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <button type="button" className="thread__open" onClick={() => setOpen(true)}>
            Répondre
          </button>
        ))}
    </article>
  )
}

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

  const channels = useMemo(
    () =>
      visibleChannels({
        hasPerson: Boolean(person),
        entityTypes: entities.map((e) => e.type),
      }),
    [person, entities],
  )

  const [active, setActive] = useState<ThreadAudience[] | null>(null)
  // Tant que rien n'a été décoché, on montre tous les canaux disponibles.
  const shown = active ?? channels

  const [asking, setAsking] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const audience = deriveAudience(threadActor)
  const blocker = askBlocker(title, body)
  const visible = filterByChannels(threads, shown)
  const isAdmin = person?.role === 'admin'

  function toggle(channel: ThreadAudience) {
    const current = shown
    setActive(
      current.includes(channel)
        ? current.filter((c) => c !== channel)
        : [...current, channel],
    )
  }

  return (
    <div className="discussion">
      {channels.length > 1 && (
        <div className="discussion__channels">
          {channels.map((channel) => (
            <button
              key={channel}
              type="button"
              className={
                shown.includes(channel)
                  ? 'discussion__channel discussion__channel--on'
                  : 'discussion__channel'
              }
              onClick={() => toggle(channel)}
            >
              {channelLabel(channel)}
            </button>
          ))}
        </div>
      )}

      {canAsk(threadActor) &&
        (asking ? (
          <div className="discussion__ask">
            <input
              className="discussion__field"
              autoFocus
              placeholder="Ta question, en une phrase"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="discussion__field discussion__field--long"
              rows={3}
              placeholder="Des précisions, si besoin"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="discussion__ask-actions">
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
                Publier
              </Button>
              <Button variant="bare" onClick={() => setAsking(false)}>
                Annuler
              </Button>
              {/* La raison du blocage, jamais un bouton gris sans explication. */}
              {blocker && title.trim() !== '' && (
                <span className="discussion__blocker">{blocker}</span>
              )}
            </div>
            {audience && (
              <p className="discussion__note">
                Ta question paraîtra dans le canal <b>{channelLabel(audience)}</b> — c’est
                celui de la casquette avec laquelle tu es connecté.
              </p>
            )}
          </div>
        ) : (
          <button type="button" className="discussion__start" onClick={() => setAsking(true)}>
            <MessageSquare size={15} strokeWidth={1.8} />
            Poser une question
          </button>
        ))}

      {error && <p className="discussion__error">{error}</p>}

      {loading ? (
        <p className="event-page__state">Chargement de la discussion…</p>
      ) : visible.length === 0 ? (
        <p className="event-page__state">
          {threads.length === 0
            ? 'Personne n’a encore rien demandé sur cette date.'
            : 'Aucune question dans les canaux affichés.'}
        </p>
      ) : (
        <div className="discussion__threads">
          {visible.map((thread) => (
            <ThreadCard
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
