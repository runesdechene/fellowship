import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { ReportButton } from '@/components/reports/ReportButton'
import {
  useThreadReplies, createThreadReply, updateThreadReply, deleteThreadReply,
  type ThreadReplyWithActor,
} from '@/hooks/use-thread-replies'
import { markBestReply, type ThreadWithActor } from '@/hooks/use-event-threads'
import { canReply, canEdit, canDelete, canMarkBest, sortReplies } from '@/lib/event-threads'

function timeAgo(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function ThreadReplies({ thread, onChanged }: { thread: ThreadWithActor; onChanged: () => void }) {
  const { currentActor, isAdmin } = useAuth()
  const { replies, loading, refetch } = useThreadReplies(thread.id)
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')

  const actor = currentActor ? { id: currentActor.id, kind: currentActor.kind, entityType: currentActor.entityType } : null
  const ordered = sortReplies(replies, thread.best_reply_id)

  async function submit() {
    const body = draft.trim()
    if (!body || !currentActor) return
    await createThreadReply({
      thread_id: thread.id, actor_id: currentActor.id,
      acted_by_user_id: currentActor.kind === 'entity' ? null : currentActor.id, body,
    })
    setDraft(''); await refetch(); onChanged()
  }

  async function saveEdit(id: string) {
    const body = editBody.trim()
    if (!body) return
    await updateThreadReply(id, body); setEditingId(null); await refetch()
  }

  async function remove(id: string) {
    await deleteThreadReply(id); await refetch(); onChanged()
  }

  async function elect(replyId: string) {
    await markBestReply(thread.id, thread.best_reply_id === replyId ? null : replyId)
    onChanged()
  }

  if (loading) return <div className="disc-replies"><p className="disc-ctx">Chargement…</p></div>

  return (
    <div className="disc-replies">
      {ordered.map(r => {
        const isBest = r.id === thread.best_reply_id
        return (
          <ReplyRow
            key={r.id} reply={r} isBest={isBest}
            editing={editingId === r.id} editBody={editBody} setEditBody={setEditBody}
            onStartEdit={() => { setEditingId(r.id); setEditBody(r.body) }}
            onSaveEdit={() => saveEdit(r.id)} onCancelEdit={() => setEditingId(null)}
            onDelete={() => remove(r.id)} onElect={() => elect(r.id)}
            canEditThis={canEdit(actor, r)} canDeleteThis={canDelete(actor, r, isAdmin)}
            canMarkThis={canMarkBest(actor, thread)}
          />
        )
      })}

      {canReply(actor) && (
        <>
          <div className="disc-compose">
            <input
              value={draft} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit() }}
              placeholder="Ajouter une réponse…" maxLength={2000}
            />
            <button className="da-btn da-btn-flat" onClick={submit} aria-label="Envoyer">↑</button>
          </div>
          {currentActor && (
            <p className="disc-ctx">tu réponds en tant que <b style={{ color: 'var(--copper)' }}>{currentActor.label}</b></p>
          )}
        </>
      )}
    </div>
  )
}

function ReplyRow(props: {
  reply: ThreadReplyWithActor; isBest: boolean
  editing: boolean; editBody: string; setEditBody: (v: string) => void
  onStartEdit: () => void; onSaveEdit: () => void; onCancelEdit: () => void
  onDelete: () => void; onElect: () => void
  canEditThis: boolean; canDeleteThis: boolean; canMarkThis: boolean
}) {
  const { reply: r, isBest } = props
  const edited = r.updated_at !== r.created_at
  return (
    <div className={isBest ? 'disc-best' : 'disc-reply'} style={{ padding: isBest ? undefined : '11px 0', display: 'flex', gap: 10 }}>
      <div className="r-body" style={{ flex: 1 }}>
        <div className="r-name" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          {r.actor_label ?? 'Quelqu\'un'}
          {isBest && <span style={{ fontSize: 10, color: 'var(--forest)', border: '1px solid color-mix(in srgb,var(--forest) 45%,transparent)', borderRadius: 999, padding: '1px 7px' }}>✓ meilleure réponse</span>}
          <span style={{ color: 'var(--font-color-lowtitle)', fontWeight: 500, fontSize: 11 }}>{timeAgo(r.created_at)}{edited ? ' · modifié' : ''}</span>
          {!isBest && props.canMarkThis && <span className="disc-mark" onClick={props.onElect}>✓ marquer la bonne</span>}
        </div>
        {props.editing ? (
          <div style={{ marginTop: 6 }}>
            <textarea value={props.editBody} onChange={e => props.setEditBody(e.target.value)} maxLength={2000}
              style={{ width: '100%', background: 'var(--surface)', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'var(--font-color-text)', padding: 8, fontFamily: 'var(--font-body)', fontSize: 13 }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button className="da-btn da-btn-flat" onClick={props.onSaveEdit}>Enregistrer</button>
              <button className="da-btn" onClick={props.onCancelEdit}>Annuler</button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13.5, lineHeight: 1.5, marginTop: 2 }}>{r.body}</div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 11 }}>
          {props.canEditThis && !props.editing && <button className="disc-mark" onClick={props.onStartEdit}>Éditer</button>}
          {props.canDeleteThis && <button className="disc-mark" onClick={props.onDelete}>Supprimer</button>}
          <ReportButton targetType="event_thread_reply" targetId={r.id} targetLabel="cette réponse"
            targetOwnerId={r.actor_id} title="Signaler cette réponse" />
        </div>
      </div>
    </div>
  )
}
