import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useReviewReplies, createReply, updateReply, deleteReply } from '@/hooks/use-review-replies'
import { canReply } from '@/lib/review-replies'
import { ReviewReplyItem } from './ReviewReplyItem'
import './ReviewReplies.css'

interface Props { reviewId: string }

export function ReviewReplies({ reviewId }: Props) {
  const { user, currentActor, isAdmin } = useAuth()
  const { replies, refetch } = useReviewReplies(reviewId)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const actor = currentActor ? { id: currentActor.id, kind: currentActor.kind } : null

  const submit = async () => {
    const body = draft.trim()
    if (!body || !user || !currentActor) return
    setBusy(true)
    await createReply({ review_id: reviewId, actor_id: currentActor.id, acted_by_user_id: user.id, body })
    setBusy(false); setDraft(''); await refetch()
  }

  const onEdit = async (id: string, body: string) => { await updateReply(id, body); await refetch() }
  const onDelete = async (id: string) => { await deleteReply(id); await refetch() }

  return (
    <div className="review-replies">
      <button className="review-replies-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <MessageCircle strokeWidth={2} />
        {replies.length > 0
          ? `${replies.length} réponse${replies.length > 1 ? 's' : ''}`
          : 'Répondre'}
      </button>

      {open && (
        <div className="review-replies-panel">
          {replies.map(r => (
            <ReviewReplyItem key={r.id} reply={r} actor={actor} isAdmin={isAdmin} onEdit={onEdit} onDelete={onDelete} />
          ))}

          {canReply(actor) ? (
            <div className="review-replies-composer">
              <textarea
                value={draft} maxLength={1000} rows={2}
                placeholder="Répondre à cet avis…"
                onChange={e => setDraft(e.target.value)}
              />
              <button className="da-btn da-btn-sm" onClick={submit} disabled={busy || !draft.trim()}>
                {busy ? '…' : 'Publier'}
              </button>
            </div>
          ) : (
            <p className="review-replies-hint">Passe en mode exposant pour répondre.</p>
          )}
        </div>
      )}
    </div>
  )
}
