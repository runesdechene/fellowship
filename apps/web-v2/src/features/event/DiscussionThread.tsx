/**
 * QUOI     — le rendu d'UN fil de la discussion : la question, ses réponses, et de quoi répondre.
 * POURQUOI — maquette 2518:233 (25/10/2026), un mini-fil : la photo à gauche, reliée par un trait
 *            aux réponses qui suivent ; « Résolu » quand l'auteur a retenu une réponse.
 * ATTENTION — la réponse retenue remonte en tête des réponses, hors chronologie : c'est elle qu'on
 *            vient chercher. Les autres se replient dessous tant qu'elle existe.
 */
import { useState, type ReactNode } from 'react'
import { Check, MessageCircle, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { canDelete, canMarkBest, type ThreadActor } from '@/lib/threads'
import type { Thread, ThreadReply } from './useEventThreads'

/** Qui écrit dans le fil : le nom et la photo de l'acteur connecté. */
export interface Me {
  name: string
  avatarUrl: string | null
}

/** « il y a 3 jours » — assez précis pour un fil, sans donner l'heure. */
function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 30) return `il y a ${days} jours`
  const months = Math.floor(days / 30)
  return months === 1 ? 'il y a un mois' : `il y a ${months} mois`
}

/** Un message du fil : la photo et son trait à gauche, le nom, l'heure, puis le contenu. */
function Message({
  author,
  createdAt,
  linked,
  badge,
  children,
}: {
  author: { name: string; avatarUrl: string | null }
  createdAt: string
  /** Un message suit : le trait part de la photo et le rejoint. */
  linked: boolean
  /** Ce qui se pose au bout de la ligne du nom : « Résolu », la corbeille. */
  badge?: ReactNode
  children: ReactNode
}) {
  return (
    <div className={linked ? 'message message--linked' : 'message'}>
      <span className="message__rail">
        <Avatar className="message__photo" src={author.avatarUrl} name={author.name} />
      </span>
      <div className="message__body">
        <p className="message__head">
          <span className="message__name">{author.name}</span>
          <time className="message__time">{timeAgo(createdAt)}</time>
          {badge}
        </p>
        {children}
      </div>
    </div>
  )
}

/** Les gestes d'une réponse : l'élire, se dédire, la supprimer. */
function ReplyGestures({
  reply,
  elected,
  canElect,
  canRemove,
  saving,
  onMarkBest,
  onRemoveReply,
}: {
  reply: ThreadReply
  elected: boolean
  canElect: boolean
  canRemove: boolean
  saving: boolean
  onMarkBest: (replyId: string | null) => void
  onRemoveReply: (replyId: string) => void
}) {
  if (!canElect && !canRemove) return null
  return (
    <div className="message__actions">
      {canElect && (
        <button
          type="button"
          className="message__action"
          disabled={saving}
          onClick={() => onMarkBest(elected ? null : reply.id)}
        >
          {elected ? 'Ce n’est plus la réponse' : 'Élire cette réponse'}
        </button>
      )}
      {canRemove && (
        <button
          type="button"
          className="message__action"
          disabled={saving}
          onClick={() => onRemoveReply(reply.id)}
        >
          Supprimer
        </button>
      )}
    </div>
  )
}

/** Le bas du fil : une ligne « Répondre à Lina… » qui s'ouvre en champ. */
function ReplyBox({
  me,
  to,
  open,
  setOpen,
  saving,
  onReply,
}: {
  me: Me
  to: string
  open: boolean
  setOpen: (open: boolean) => void
  saving: boolean
  onReply: (body: string) => void
}) {
  const [draft, setDraft] = useState('')

  if (!open) {
    return (
      <button type="button" className="thread__reply" onClick={() => setOpen(true)}>
        <span className="thread__reply-slot">
          <Avatar className="thread__reply-photo" src={me.avatarUrl} name={me.name} />
        </span>
        Répondre à {to}…
      </button>
    )
  }

  return (
    <div className="thread__reply thread__reply--open">
      <span className="thread__reply-slot">
        <Avatar className="thread__reply-photo" src={me.avatarUrl} name={me.name} />
      </span>
      <div className="thread__reply-form">
        <textarea
          className="discussion__champ"
          rows={3}
          autoFocus
          placeholder={`Répondre à ${to}…`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className="discussion__composer-pied">
          <button type="button" className="message__action" onClick={() => setOpen(false)}>
            Annuler
          </button>
          <Button
            variant="action"
            disabled={saving || !draft.trim()}
            onClick={() => {
              onReply(draft)
              setDraft('')
              setOpen(false)
            }}
          >
            Répondre
          </Button>
        </div>
      </div>
    </div>
  )
}

export function Question({
  thread,
  actor,
  me,
  isAdmin,
  saving,
  onReply,
  onMarkBest,
  onRemove,
  onRemoveReply,
}: {
  thread: Thread
  actor: ThreadActor | null
  /** Sans acteur, le fil se lit sans pouvoir y répondre. */
  me: Me | null
  isAdmin: boolean
  saving: boolean
  onReply: (body: string) => void
  onMarkBest: (replyId: string | null) => void
  onRemove: () => void
  onRemoveReply: (replyId: string) => void
}) {
  const [replying, setReplying] = useState(false)
  const [unfolded, setUnfolded] = useState(false)

  const canElect = canMarkBest(actor, { actorId: thread.actorId })
  const elected = thread.replies.find((reply) => reply.id === thread.bestReplyId) ?? null
  const others = thread.replies.filter((reply) => reply.id !== thread.bestReplyId)
  // Sans réponse retenue, rien ne fait autorité : toutes se lisent, à plat.
  const folded = elected !== null && !unfolded && others.length > 0
  const shown = [...(elected ? [elected] : []), ...(folded ? [] : others)]
  const hasReplyBox = me !== null && (thread.replies.length > 0 || replying)
  const count = thread.replies.length

  return (
    <article className="thread">
      <Message
        author={thread}
        createdAt={thread.createdAt}
        linked={shown.length > 0 || hasReplyBox}
        badge={
          <>
            {elected && (
              <span className="thread__resolved">
                <Check size={12} strokeWidth={2.4} />
                Résolu
              </span>
            )}
            {canDelete(actor, { actorId: thread.actorId }, isAdmin) && (
              <button
                type="button"
                className="thread__remove"
                disabled={saving}
                onClick={onRemove}
                aria-label="Retirer cette question"
              >
                <Trash2 size={14} strokeWidth={1.9} />
              </button>
            )}
          </>
        }
      >
        <h3 className="message__question">{thread.title}</h3>
        {thread.body && <p className="message__text">{thread.body}</p>}
        <div className="message__actions">
          {count > 0 ? (
            <span className="message__action message__action--count">
              <MessageCircle size={15} strokeWidth={1.9} />
              {count === 1 ? '1 réponse' : `${count} réponses`}
            </span>
          ) : (
            me && (
              <button type="button" className="message__action" onClick={() => setReplying(true)}>
                <MessageCircle size={15} strokeWidth={1.9} />
                Répondre
              </button>
            )
          )}
        </div>
      </Message>

      {shown.map((reply, index) => {
        const isElected = reply.id === thread.bestReplyId
        return (
          <Message
            key={reply.id}
            author={reply}
            createdAt={reply.createdAt}
            linked={index < shown.length - 1 || folded || hasReplyBox}
            badge={
              isElected && (
                <span className="thread__elected" aria-label="La réponse retenue">
                  <Check size={13} strokeWidth={2.4} />
                </span>
              )
            }
          >
            <p className="message__text">{reply.body}</p>
            <ReplyGestures
              reply={reply}
              elected={isElected}
              canElect={canElect}
              canRemove={canDelete(actor, { actorId: reply.actorId }, isAdmin)}
              saving={saving}
              onMarkBest={onMarkBest}
              onRemoveReply={onRemoveReply}
            />
          </Message>
        )
      })}

      {folded && (
        <button type="button" className="thread__unfold" onClick={() => setUnfolded(true)}>
          {others.length === 1 ? '1 autre réponse' : `${others.length} autres réponses`}
        </button>
      )}

      {me && hasReplyBox && (
        <ReplyBox
          me={me}
          to={thread.name}
          open={replying}
          setOpen={setReplying}
          saving={saving}
          onReply={onReply}
        />
      )}
    </article>
  )
}
