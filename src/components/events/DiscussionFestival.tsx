import { useEffect, useMemo, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { ReportButton } from '@/components/reports/ReportButton'
import { ThreadReplies } from '@/components/events/ThreadReplies'
import {
  useEventThreads, createThread, updateThread, deleteThread, type ThreadWithActor,
} from '@/hooks/use-event-threads'
import {
  visibleChannels, deriveAudience, canAsk, canEdit, canDelete,
  filterByChannels, channelLabel, isSolved, type ThreadAudience, type ThreadActor,
} from '@/lib/event-threads'

export function DiscussionFestival({ event }: { event: { id: string; name?: string; participant_count?: number } }) {
  const { currentActor, person, entities, isAdmin } = useAuth()
  const { threads, loading, refetch } = useEventThreads(event.id)

  const channels = useMemo(
    () => visibleChannels({ hasPerson: !!person, entityTypes: entities.map(e => e.type) }),
    [person, entities],
  )
  const [active, setActive] = useState<ThreadAudience[]>(channels)
  useEffect(() => { setActive(channels) }, [channels])
  const shown = channels.length > 1 ? active : channels // toggles seulement si >1 canal

  const [askOpen, setAskOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const actor = currentActor ? { id: currentActor.id, kind: currentActor.kind, entityType: currentActor.entityType } : null
  const postAudience = deriveAudience(actor)
  const visibleThreads = filterByChannels(threads, shown)

  function toggle(ch: ThreadAudience) {
    setActive(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch])
  }

  async function ask() {
    const t = title.trim()
    if (!t || !currentActor || !postAudience) return
    await createThread({
      event_id: event.id, actor_id: currentActor.id,
      acted_by_user_id: person?.actor_id ?? null,
      audience: postAudience, title: t, body: body.trim() || null,
    })
    setTitle(''); setBody(''); setAskOpen(false); await refetch()
  }

  return (
    <div className="glass-card disc" style={{ padding: 18 }}>
      <div className="event-section-title"><MessageSquare strokeWidth={1.8} /> Discussion du festival</div>

      {channels.length > 1 && (
        <div className="disc-toggles">
          {channels.map(ch => (
            <button key={ch} className={`disc-tg${shown.includes(ch) ? ' on' : ''}`} onClick={() => toggle(ch)}>
              <span className="sw" style={{ background: ch === 'festivalier' ? '#8bb5e0' : ch === 'exposant' ? 'var(--copper)' : 'var(--forest)' }} />
              {channelLabel(ch)}
            </button>
          ))}
        </div>
      )}

      {canAsk(actor) && (
        askOpen ? (
          <div className="glass-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={140}
              placeholder="Ta question (ex. Le montage se fait la veille ?)"
              style={{ background: 'var(--surface)', border: '1px solid hsl(var(--border))', borderRadius: 10, color: 'var(--font-color-text)', padding: '10px 12px', fontFamily: 'var(--font-heading)', fontWeight: 600 }} />
            <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={2000}
              placeholder="Détaille si besoin (optionnel)"
              style={{ background: 'var(--surface)', border: '1px solid hsl(var(--border))', borderRadius: 10, color: 'var(--font-color-text)', padding: '10px 12px', minHeight: 60, fontFamily: 'var(--font-body)' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="da-btn da-btn-flat" onClick={ask}>Poser dans « {postAudience ? channelLabel(postAudience) : ''} »</button>
              <button className="da-btn" onClick={() => setAskOpen(false)}>Annuler</button>
            </div>
          </div>
        ) : (
          <div className="glass-card disc-ask" onClick={() => setAskOpen(true)}>
            <span className="ph">Pose ta question sur le festival…</span>
            <span className="da-btn da-btn-flat">Poser</span>
          </div>
        )
      )}

      {loading ? (
        <p className="disc-ctx">Chargement…</p>
      ) : visibleThreads.length === 0 ? (
        <p className="disc-q-body">Aucune question pour l'instant — lance la première 👀</p>
      ) : (
        visibleThreads.map(t => (
          <ThreadCard
            key={t.id} thread={t} open={openId === t.id}
            onToggle={() => setOpenId(openId === t.id ? null : t.id)}
            onChanged={refetch} actor={actor} isAdmin={isAdmin}
          />
        ))
      )}
    </div>
  )
}

function ThreadCard({ thread, open, onToggle, onChanged, actor, isAdmin }: {
  thread: ThreadWithActor; open: boolean; onToggle: () => void; onChanged: () => void
  actor: ThreadActor; isAdmin: boolean
}) {
  const solved = isSolved(thread)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(thread.title)
  const [editBody, setEditBody] = useState(thread.body ?? '')
  const canEditThis = canEdit(actor, thread)
  const canDeleteThis = canDelete(actor, thread, isAdmin)

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation()
    setEditTitle(thread.title); setEditBody(thread.body ?? ''); setEditing(true)
  }

  async function saveEdit(e: React.MouseEvent) {
    e.stopPropagation()
    const t = editTitle.trim()
    if (!t) return
    await updateThread(thread.id, { title: t, body: editBody.trim() || null })
    setEditing(false); await onChanged()
  }

  async function remove(e: React.MouseEvent) {
    e.stopPropagation()
    await deleteThread(thread.id); await onChanged()
  }

  return (
    <div className="glass-card disc-thread">
      <div className="disc-t-main" onClick={onToggle} style={{ cursor: 'pointer' }}>
        <div className="disc-t-top">
          <span className={`disc-chan ${thread.audience}`}><span className="sw" />{channelLabel(thread.audience)}</span>
          {solved && <span className="disc-solved">✓ Résolu</span>}
        </div>
        {editing ? (
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)} maxLength={140}
              style={{ background: 'var(--surface)', border: '1px solid hsl(var(--border))', borderRadius: 10, color: 'var(--font-color-text)', padding: '10px 12px', fontFamily: 'var(--font-heading)', fontWeight: 600 }} />
            <textarea value={editBody} onChange={e => setEditBody(e.target.value)} maxLength={2000}
              placeholder="Détaille si besoin (optionnel)"
              style={{ background: 'var(--surface)', border: '1px solid hsl(var(--border))', borderRadius: 10, color: 'var(--font-color-text)', padding: '10px 12px', minHeight: 60, fontFamily: 'var(--font-body)' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="da-btn da-btn-flat" onClick={saveEdit}>Enregistrer</button>
              <button className="da-btn" onClick={e => { e.stopPropagation(); setEditing(false) }}>Annuler</button>
            </div>
          </div>
        ) : (
          <>
            <div className="disc-q-title">{thread.title}</div>
            {open && thread.body && <div className="disc-q-body">{thread.body}</div>}
          </>
        )}
        <div className="disc-q-foot">
          {thread.reply_count > 0
            ? <span><b style={{ color: 'var(--accent-app)' }}>{thread.reply_count}</b> réponse{thread.reply_count > 1 ? 's' : ''}</span>
            : <span>Sans réponse · sois le premier à aider</span>}
          <span>· {thread.actor_label ?? 'Quelqu\'un'}</span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
            {canEditThis && !editing && <button className="disc-mark" onClick={startEdit}>Éditer</button>}
            {canDeleteThis && <button className="disc-mark" onClick={remove}>Supprimer</button>}
            <ReportButton targetType="event_thread" targetId={thread.id} targetLabel="cette question" targetOwnerId={thread.actor_id} title="Signaler" />
          </span>
        </div>
      </div>
      {open && <ThreadReplies thread={thread} onChanged={onChanged} />}
    </div>
  )
}
