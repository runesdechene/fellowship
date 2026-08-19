import { useMemo, useState } from 'react'
import { ArrowRight, CheckCheck, Hourglass, Trash2 } from 'lucide-react'
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
  visibleChannels,
  type ThreadActor,
  type ThreadAudience,
} from '@/lib/threads'
import { useEventThreads, type Thread, type ThreadReply } from './useEventThreads'

/** « il y a 3 jours » — assez précis pour un fil, sans donner l'heure. */
function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 30) return `il y a ${days} jours`
  const months = Math.floor(days / 30)
  return months === 1 ? 'il y a un mois' : `il y a ${months} mois`
}

/** Qui parle, et quand. La même ligne sert à la question et aux réponses. */
function Signature({
  name,
  avatarUrl,
  createdAt,
  children,
}: {
  name: string
  avatarUrl: string | null
  createdAt: string
  children?: React.ReactNode
}) {
  return (
    <p className="discussion__signature">
      <span className="discussion__avatar">
        <Avatar src={avatarUrl} name={name} />
      </span>
      {name}
      <time>{timeAgo(createdAt)}</time>
      {children}
    </p>
  )
}

/** Une réponse ordinaire : celles qui n'ont pas été élues. */
function Reponse({
  item,
  actor,
  isAdmin,
  saving,
  canElect,
  onMarkBest,
  onRemoveReply,
}: {
  item: ThreadReply
  actor: ThreadActor | null
  isAdmin: boolean
  saving: boolean
  canElect: boolean
  onMarkBest: (replyId: string | null) => void
  onRemoveReply: (replyId: string) => void
}) {
  return (
    <div className="reponse">
      <Signature name={item.name} avatarUrl={item.avatarUrl} createdAt={item.createdAt} />
      <p className="reponse__texte">{item.body}</p>
      <div className="discussion__gestes">
        {canElect && (
          <button
            type="button"
            className="discussion__geste"
            onClick={() => onMarkBest(item.id)}
            disabled={saving}
          >
            Élire cette réponse
          </button>
        )}
        {canDelete(actor, { actorId: item.actorId }, isAdmin) && (
          <button
            type="button"
            className="discussion__geste"
            onClick={() => onRemoveReply(item.id)}
            disabled={saving}
          >
            Supprimer
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Une question et ce qu'on lui a répondu.
 *
 * LA RÉPONSE ÉLUE REMONTE EN TÊTE, hors chronologie, et porte le seul aplat
 * de la section. Dans une question-réponse on vient chercher LA réponse ;
 * une fois qu'elle fait autorité, l'ordre d'arrivée ne porte plus rien. Les
 * autres se replient dessous — neuf questions ouvertes font un mur.
 */
function Question({
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
  const [deplie, setDeplie] = useState(false)

  const canElect = canMarkBest(actor, { actorId: thread.actorId })
  const elue = thread.replies.find((r) => r.id === thread.bestReplyId) ?? null
  const autres = thread.replies.filter((r) => r.id !== thread.bestReplyId)

  // Sans réponse élue, il n'y a rien à mettre en avant : les autres se lisent
  // toutes, à plat. Le repli n'a de sens que quand une réponse fait autorité.
  const montrerLesAutres = deplie || !elue

  return (
    <article className="question">
      <h3 className="question__titre">{thread.title}</h3>
      {thread.body && <p className="question__corps">{thread.body}</p>}

      <Signature
        name={thread.name}
        avatarUrl={thread.avatarUrl}
        createdAt={thread.createdAt}
      >
        {/* Les visages de ceux qui ont répondu, avant même d'ouvrir. */}
        {thread.replies.length > 0 && (
          <span className="question__pile">
            {thread.replies.slice(0, 4).map((r) => (
              <span key={r.id} className="discussion__avatar">
                <Avatar src={r.avatarUrl} name={r.name} />
              </span>
            ))}
          </span>
        )}
        {canDelete(actor, { actorId: thread.actorId }, isAdmin) && (
          <button
            type="button"
            className="question__retirer"
            onClick={onRemove}
            disabled={saving}
            aria-label="Retirer cette question"
          >
            <Trash2 size={14} strokeWidth={1.9} />
          </button>
        )}
      </Signature>

      {elue ? (
        <div className="reponse-elue">
          <p className="reponse-elue__sceau">
            <CheckCheck size={15} strokeWidth={2.4} />
            La réponse
          </p>
          <p className="reponse-elue__texte">{elue.body}</p>
          <Signature
            name={elue.name}
            avatarUrl={elue.avatarUrl}
            createdAt={elue.createdAt}
          />
          <div className="discussion__gestes">
            {/* Élire, c'est aussi pouvoir se dédire. */}
            {canElect && (
              <button
                type="button"
                className="discussion__geste"
                onClick={() => onMarkBest(null)}
                disabled={saving}
              >
                Ce n’est plus la réponse
              </button>
            )}
            {canDelete(actor, { actorId: elue.actorId }, isAdmin) && (
              <button
                type="button"
                className="discussion__geste"
                onClick={() => onRemoveReply(elue.id)}
                disabled={saving}
              >
                Supprimer
              </button>
            )}
          </div>
        </div>
      ) : (
        thread.replies.length === 0 && (
          /* Ce n'est pas un vide, c'est un ÉTAT : la terre dit « ça attend
             chez quelqu'un d'autre », comme « Dossier en cours » sur la fiche. */
          <span className="question__attente">
            <Hourglass size={14} strokeWidth={2} />
            En attente de réponse
          </span>
        )
      )}

      {autres.length > 0 &&
        (montrerLesAutres ? (
          <div className="question__autres">
            {autres.map((item) => (
              <Reponse
                key={item.id}
                item={item}
                actor={actor}
                isAdmin={isAdmin}
                saving={saving}
                canElect={canElect}
                onMarkBest={onMarkBest}
                onRemoveReply={onRemoveReply}
              />
            ))}
          </div>
        ) : (
          <button
            type="button"
            className="question__deplier"
            onClick={() => setDeplie(true)}
          >
            {autres.length === 1 ? '1 autre réponse' : `${autres.length} autres réponses`}
          </button>
        ))}

      {actor &&
        (open ? (
          <div className="discussion__composer">
            <textarea
              className="discussion__champ"
              rows={3}
              autoFocus
              placeholder="Ta réponse…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="discussion__composer-pied">
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
              {/* Pas `variant="bare"` : il est dessiné pour UNE ICÔNE dans
                  un carré de 42 px, le mot y débordait. C'est une action en
                  texte, comme « Répondre » — même classe qu'elle. */}
              <button
                type="button"
                className="discussion__geste"
                onClick={() => setOpen(false)}
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="discussion__geste discussion__geste--seul"
            onClick={() => setOpen(true)}
          >
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

  const channels = useMemo(() => visibleChannels(entities.map((e) => e.type)), [entities])

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

  /** Combien de questions vivent dans un canal — dit où il se passe quelque
      chose avant qu'on ait cliqué. */
  const compte = (channel: ThreadAudience) =>
    threads.filter((t) => t.audience === channel).length

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
                  Posée dans le canal <b>{channelLabel(audience)}</b> — c’est celui de la
                  casquette avec laquelle tu es connecté.
                </span>
              )}
              {/* La raison du blocage, jamais un bouton gris sans explication. */}
              {blocker && title.trim() !== '' && (
                <span className="discussion__blocage">{blocker}</span>
              )}
              <button
                type="button"
                className="discussion__geste"
                onClick={() => setAsking(false)}
              >
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
          <button
            type="button"
            className="discussion__poser"
            onClick={() => setAsking(true)}
          >
            <span>
              <span className="discussion__poser-mot">Poser une question</span>
              <span className="discussion__poser-sous">
                {audience === 'organisateur'
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
        /* Un écran vide est une invitation, pas un constat. */
        <p className="discussion__vide">
          {threads.length === 0
            ? 'Personne n’a encore rien demandé sur cette date. Si tu hésites sur l’électricité, le montage ou l’accès, quelqu’un d’autre hésite aussi.'
            : 'Aucune question dans les canaux affichés.'}
        </p>
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
