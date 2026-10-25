/**
 * QUOI     — la discussion du festival : le titre et son compte, les canaux, puis le fil — la
 *            question à poser en tête, les questions et leurs réponses dessous.
 * POURQUOI — maquette 2518:233 (25/10/2026), un mini-fil dans une seule carte : on écrit en haut,
 *            on lit en dessous, les deux plus récentes d'abord. Les canaux visibles dépendent des
 *            casquettes de l'utilisateur.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/lib/auth'
import {
  canAsk,
  channelLabel,
  deriveAudience,
  filterByChannels,
  visibleChannels,
  type ThreadActor,
  type ThreadAudience,
} from '@/lib/threads'
import { DiscussionComposer } from './DiscussionComposer'
import { Question, type Me } from './DiscussionThread'
import { useEventThreads } from './useEventThreads'

/** Les plus récentes s'affichent d'abord ; les autres attendent « Voir les questions précédentes ». */
const FIRST_SHOWN = 2

export function EventDiscussion({ eventId, action }: { eventId: string; action?: ReactNode }) {
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
  const me: Me | null = actor ? { name: actor.label, avatarUrl: actor.avatarUrl } : null

  const channels = useMemo(() => visibleChannels(entities.map((e) => e.type)), [entities])
  const [active, setActive] = useState<ThreadAudience[] | null>(null)
  // Tant que rien n'a été décoché, on montre tous les canaux disponibles.
  const shownChannels = active ?? channels
  const [everything, setEverything] = useState(false)
  const [composing, setComposing] = useState(false)

  const audience = deriveAudience(threadActor)
  const nothingAtAll = threads.length === 0
  const visible = filterByChannels(threads, shownChannels)
  const listed = everything ? visible : visible.slice(0, FIRST_SHOWN)
  const earlier = visible.length - listed.length
  const isAdmin = person?.role === 'admin'
  const asking = me !== null && canAsk(threadActor)

  function toggle(channel: ThreadAudience) {
    setActive(
      shownChannels.includes(channel)
        ? shownChannels.filter((c) => c !== channel)
        : [...shownChannels, channel],
    )
  }

  return (
    <div className="discussion">
      <div className="discussion-head">
        <h2 className="event-page__block-title">
          Discussions
          {threads.length > 0 && (
            <span className="event-page__block-hint">
              {threads.length === 1 ? '1 question' : `${threads.length} questions`}
            </span>
          )}
        </h2>
        {action}
      </div>

      {channels.length > 1 && (
        <div className="discussion__canaux">
          {channels.map((channel) => (
            <button
              key={channel}
              type="button"
              className="discussion__canal"
              aria-pressed={shownChannels.includes(channel)}
              onClick={() => toggle(channel)}
            >
              {channelLabel(channel)}
              {/* Le compte dit où il se passe quelque chose avant qu'on ait cliqué. */}
              <small>{threads.filter((t) => t.audience === channel).length}</small>
            </button>
          ))}
        </div>
      )}

      {error && <p className="discussion__erreur">{error}</p>}

      <div className="discussion__fil">
        {me && asking && (
          <DiscussionComposer
            me={me}
            audience={audience}
            open={composing}
            setOpen={setComposing}
            saving={saving}
            onAsk={(title, body) => {
              if (audience) void ask({ audience, title, body })
            }}
          />
        )}
        {loading ? (
          <p className="discussion__vide">Chargement de la discussion…</p>
        ) : visible.length === 0 ? (
          // Le champ ouvert dit déjà quoi faire : le vide ne se répète pas dessous.
          !composing && (
            <p className="discussion__vide">
              {!nothingAtAll
                ? 'Aucune question dans les canaux affichés.'
                : asking
                  ? 'Personne n’a encore rien demandé : sois le premier.'
                  : 'Personne n’a encore rien demandé sur cette date.'}
            </p>
          )
        ) : (
          listed.map((thread) => (
            <Question
              key={thread.id}
              thread={thread}
              actor={threadActor}
              me={me}
              isAdmin={isAdmin}
              saving={saving}
              onReply={(text) => void reply(thread.id, text)}
              onMarkBest={(replyId) => void markBest(thread.id, replyId)}
              onRemove={() => void remove(thread.id)}
              onRemoveReply={(replyId) => void removeReply(replyId)}
            />
          ))
        )}
        {earlier > 0 && (
          <button type="button" className="discussion__earlier" onClick={() => setEverything(true)}>
            {earlier === 1
              ? 'Voir la question précédente'
              : `Voir les ${earlier} questions précédentes`}
          </button>
        )}
      </div>
    </div>
  )
}
