/**
 * QUOI     — le rendu d'UN fil de la discussion : la question, ses réponses, qui parle et quand.
 * POURQUOI — EventDiscussion orchestre (canaux, formulaire, écritures) ; ici on ne fait
 *            qu'afficher une question et ce qu'on peut en faire.
 */
import { useState } from 'react'
import { CheckCheck, Hourglass, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { canDelete, canMarkBest, type ThreadActor } from '@/lib/threads'
import type { Thread, ThreadReply } from './useEventThreads'

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
export function Question({
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

      <Signature name={thread.name} avatarUrl={thread.avatarUrl} createdAt={thread.createdAt}>
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
          <Signature name={elue.name} avatarUrl={elue.avatarUrl} createdAt={elue.createdAt} />
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
          <button type="button" className="question__deplier" onClick={() => setDeplie(true)}>
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
              <button type="button" className="discussion__geste" onClick={() => setOpen(false)}>
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
