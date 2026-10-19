/**
 * QUOI     — sous une mise à jour : le cœur et son compte, les commentaires et leurs réponses,
 *            « Répondre », la corbeille, le champ « Écrire un commentaire… ».
 * POURQUOI — maquette 2371:65 : un mot laissé sous l'annonce, et une vraie conversation qui peut
 *            naître (Uriel, 19/10/2026). Signé « Prénom (Enseigne) ».
 * ATTENTION — trois commentaires racine d'abord, puis « Voir les N autres » ; une réponse à une
 *            réponse reste dans le fil de sa racine (lib/app-updates.ts).
 */
import { Heart, MessageCircle, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { likersLabel, signature, threadOf, type UpdateComment } from '@/lib/app-updates'
import { timeAgo } from '@/lib/dates'
import type { Friend } from '@/lib/friends'
import type { AppUpdate } from './useUpdates'

const FIRST_THREADS = 3

interface Props {
  update: AppUpdate
  profiles: Map<string, Friend>
  personId: string | undefined
  isAdmin: boolean
  busy: boolean
  problem: string | null
  onHeart: (on: boolean) => void
  onComment: (body: string, parentId: string | null) => void
  onRemove: (commentId: string) => void
}

export function UpdateConversation(props: Props) {
  const { update, profiles, personId, busy, problem, onHeart, onComment, onRemove } = props
  const [showAll, setShowAll] = useState(false)
  const [replyTo, setReplyTo] = useState<UpdateComment | null>(null)
  const [doomed, setDoomed] = useState<string | null>(null)
  const mine = personId ? update.hearts.includes(personId) : false
  const threads = threadOf(update.comments)
  const shown = showAll ? threads : threads.slice(0, FIRST_THREADS)
  const names = update.hearts.flatMap((id) => {
    const name = profiles.get(id)?.name
    return name ? [name] : []
  })
  const now = new Date()

  function nameOf(comment: UpdateComment) {
    const person = profiles.get(comment.actorId)?.name ?? 'Un exposant'
    const entity = comment.entityActorId
      ? (profiles.get(comment.entityActorId)?.name ?? null)
      : null
    return signature(person, entity)
  }

  function line(comment: UpdateComment) {
    const canDelete = comment.actorId === personId || props.isAdmin
    return (
      <div className="update-comment">
        <Avatar
          className="update-comment__avatar"
          src={profiles.get(comment.actorId)?.avatarUrl}
          name={nameOf(comment)}
        />
        <div className="update-comment__main">
          <p className="update-comment__head">
            <strong>{nameOf(comment)}</strong>
            <span> · {timeAgo(new Date(comment.createdAt), now)}</span>
          </p>
          <p className="update-comment__text">{comment.body}</p>
          <div className="update-comment__actions">
            <button type="button" onClick={() => setReplyTo(comment)}>
              Répondre
            </button>
            {canDelete && (
              <button
                type="button"
                className="update-comment__delete"
                aria-label="Supprimer le commentaire"
                onClick={() => setDoomed(comment.id)}
              >
                <Trash2 size={13} strokeWidth={1.9} />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const field = event.currentTarget.elements.namedItem('commentaire')
    if (!(field instanceof HTMLInputElement) || !field.value.trim()) return
    onComment(field.value, replyTo?.id ?? null)
    field.value = ''
    setReplyTo(null)
  }

  return (
    <>
      <div className="update-reactions">
        <button
          type="button"
          className={
            mine ? 'update-reactions__heart update-reactions__heart--on' : 'update-reactions__heart'
          }
          aria-pressed={mine}
          aria-label={mine ? 'Retirer mon cœur' : 'Mettre un cœur'}
          disabled={busy || !personId}
          onClick={() => onHeart(!mine)}
        >
          <Heart size={15} strokeWidth={2} />
          {update.hearts.length}
        </button>
        <span className="update-reactions__count">
          <MessageCircle size={15} strokeWidth={2} />
          {update.comments.length}
        </span>
        <span className="update-reactions__likers">{likersLabel(names, update.hearts.length)}</span>
      </div>

      <div className="update-conversation">
        {shown.length > 0 && (
          <ul className="update-conversation__list">
            {shown.map(({ root, replies }) => (
              <li key={root.id} className="update-conversation__thread">
                {line(root)}
                {replies.length > 0 && (
                  <ul className="update-conversation__replies">
                    {replies.map((reply) => (
                      <li key={reply.id}>{line(reply)}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
        {!showAll && threads.length > FIRST_THREADS && (
          <button
            type="button"
            className="update-conversation__more"
            onClick={() => setShowAll(true)}
          >
            Voir les {threads.length - FIRST_THREADS} autres commentaires
          </button>
        )}
        {problem && <p className="update-conversation__problem">{problem}</p>}
        <form className="update-conversation__form" onSubmit={submit}>
          {replyTo && (
            <p className="update-conversation__replying">
              Réponse à {nameOf(replyTo)}
              <button type="button" onClick={() => setReplyTo(null)}>
                Annuler
              </button>
            </p>
          )}
          <input
            key={replyTo?.id ?? 'racine'}
            name="commentaire"
            className="update-conversation__field"
            placeholder="Écrire un commentaire…"
            aria-label="Écrire un commentaire"
            maxLength={2000}
            autoFocus={Boolean(replyTo)}
            disabled={busy || !personId}
          />
        </form>
      </div>

      {doomed && (
        <ConfirmDialog
          title="Supprimer ce commentaire ?"
          text="Ses réponses partent avec lui."
          confirmLabel="Supprimer"
          busy={busy}
          problem={null}
          onConfirm={() => {
            onRemove(doomed)
            setDoomed(null)
          }}
          onClose={() => setDoomed(null)}
        />
      )}
    </>
  )
}
