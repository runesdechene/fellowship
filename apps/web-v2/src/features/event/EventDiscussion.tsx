/**
 * QUOI     — la discussion du festival : le titre et son compte, les canaux, puis le fil — la
 *            question à poser en tête, les questions et leurs réponses dessous.
 * POURQUOI — maquette 2518:233 (25/10/2026), un mini-fil dans une seule carte : on écrit en haut,
 *            on lit en dessous, les deux plus récentes d'abord. Les canaux visibles dépendent des
 *            casquettes de l'utilisateur.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { Avatar } from '@/components/ui/Avatar'
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
import { Question, type Me } from './DiscussionThread'
import { useEventThreads } from './useEventThreads'

/** Les plus récentes s'affichent d'abord ; les autres attendent « Voir les questions précédentes ». */
const FIRST_SHOWN = 2

/** La question à poser, en tête du fil : une ligne qui s'ouvre en formulaire. */
function Composer({
  me,
  audience,
  saving,
  onAsk,
}: {
  me: Me
  audience: ThreadAudience | null
  saving: boolean
  onAsk: (title: string, body: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const blocker = askBlocker(title, body)
  const prompt =
    audience === 'organisateur'
      ? 'Pose ta question aux autres organisateurs…'
      : 'Pose ta question aux exposants qui y sont allés…'

  if (!open) {
    return (
      <button type="button" className="composer" onClick={() => setOpen(true)}>
        <Avatar className="composer__photo" src={me.avatarUrl} name={me.name} />
        <span className="composer__text">
          <span className="composer__name">{me.name}</span>
          <span className="composer__prompt">{prompt}</span>
        </span>
        <span className="composer__publish">Publier</span>
      </button>
    )
  }

  return (
    <div className="composer composer--open">
      <Avatar className="composer__photo" src={me.avatarUrl} name={me.name} />
      <div className="composer__form">
        <span className="composer__name">{me.name}</span>
        <input
          className="discussion__champ discussion__champ--titre"
          autoFocus
          aria-label="Ta question"
          placeholder={prompt}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <textarea
          className="discussion__champ"
          rows={3}
          aria-label="Le détail de ta question"
          placeholder="Ajoute ce qui aidera à te répondre — d’où tu viens, ce que tu montes, ce qui te bloque."
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <div className="discussion__composer-pied">
          {audience && (
            <span className="discussion__note">
              Posée dans le canal <b>{channelLabel(audience)}</b> — c’est celui de la casquette avec
              laquelle tu es connecté.
            </span>
          )}
          {/* La raison du blocage, jamais un bouton gris sans explication. */}
          {blocker && title.trim() !== '' && <span className="discussion__blocage">{blocker}</span>}
          <button type="button" className="message__action" onClick={() => setOpen(false)}>
            Annuler
          </button>
          <button
            type="button"
            className="composer__publish"
            disabled={saving || blocker !== null || !audience}
            onClick={() => {
              onAsk(title, body)
              setTitle('')
              setBody('')
              setOpen(false)
            }}
          >
            Publier
          </button>
        </div>
      </div>
    </div>
  )
}

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
          <Composer
            me={me}
            audience={audience}
            saving={saving}
            onAsk={(title, body) => {
              if (audience) void ask({ audience, title, body })
            }}
          />
        )}
        {loading ? (
          <p className="discussion__vide">Chargement de la discussion…</p>
        ) : visible.length === 0 ? (
          <p className="discussion__vide">
            {!nothingAtAll
              ? 'Aucune question dans les canaux affichés.'
              : asking
                ? 'Personne n’a encore rien demandé. Si tu hésites sur l’électricité, le montage ou l’accès, quelqu’un d’autre hésite aussi.'
                : 'Personne n’a encore rien demandé sur cette date.'}
          </p>
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
