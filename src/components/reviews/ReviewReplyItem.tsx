import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type { ReplyWithActor } from '@/hooks/use-review-replies'
import { canEditReply, canDeleteReply, type ReplyActor } from '@/lib/review-replies'
import { reviewerDisplay } from '@/lib/review-visibility'
import { ReviewAvatar } from './ReviewAvatar'

function ago(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 7) return `il y a ${days} j`
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem`
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`
  return `il y a ${Math.floor(days / 365)} an${Math.floor(days / 365) > 1 ? 's' : ''}`
}

interface Props {
  reply: ReplyWithActor
  actor: ReplyActor
  isAdmin: boolean
  onEdit: (id: string, body: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function ReviewReplyItem({ reply, actor, isAdmin, onEdit, onDelete }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(reply.body)
  const [busy, setBusy] = useState(false)
  const edited = reply.updated_at !== reply.created_at

  const save = async () => {
    const body = draft.trim()
    if (!body || body === reply.body) { setEditing(false); return }
    setBusy(true); await onEdit(reply.id, body); setBusy(false); setEditing(false)
  }

  // Réponses : pas de « présent à cette édition » (réservé aux auteurs d'avis
  // vérifiés) ; anonyme = « Un exposant » (moins spécifique que pour un avis).
  const who = reviewerDisplay(
    { is_self: reply.is_self, identity_visible: reply.identity_visible, author_label: reply.actor_label, author_avatar_url: reply.actor_avatar_url, author_slug: reply.actor_slug },
    { anonLabel: 'Un exposant' },
  )
  const avatarLabel = who.mode === 'anonymous' ? null : who.label

  return (
    <div className="review-reply">
      <ReviewAvatar
        label={avatarLabel}
        avatarUrl={who.avatarUrl}
        slug={who.slug}
        className="review-reply-avatar"
      />
      <div className="review-reply-body">
        <div className="review-reply-meta">
          <span className="review-reply-name">{who.label}</span>
          <span className="review-reply-date">{ago(reply.created_at)}{edited ? ' · modifié' : ''}</span>
        </div>
        {editing ? (
          <div className="review-reply-edit">
            <textarea value={draft} maxLength={1000} rows={2} onChange={e => setDraft(e.target.value)} />
            <div className="review-reply-edit-actions">
              <button className="da-btn-ghost da-btn-sm" onClick={() => { setDraft(reply.body); setEditing(false) }} disabled={busy}>
                Annuler
              </button>
              <button className="da-btn da-btn-sm" onClick={save} disabled={busy || !draft.trim()}>
                {busy ? '…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        ) : (
          <p className="review-reply-text">{reply.body}</p>
        )}
        {!editing && (canEditReply(actor, reply) || canDeleteReply(actor, reply, isAdmin)) && (
          <div className="review-reply-actions">
            {canEditReply(actor, reply) && (
              <button className="review-reply-action" onClick={() => setEditing(true)}>
                <Pencil strokeWidth={2} /> Éditer
              </button>
            )}
            {canDeleteReply(actor, reply, isAdmin) && (
              <button className="review-reply-action review-reply-del" onClick={() => onDelete(reply.id)}>
                <Trash2 strokeWidth={2} /> Supprimer
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
