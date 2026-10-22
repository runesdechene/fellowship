/**
 * QUOI     — une carte du tableau : son texte (un clic pour le corriger sur place), son porteur et
 *            son âge, et au survol de quoi la reculer, l'avancer, la prendre ou la supprimer.
 * POURQUOI — maquette 2417:233 : saisir et déplacer sans formulaire. Les flèches doublent le
 *            glisser-déposer pour le clavier et le téléphone, où elles restent visibles.
 * ATTENTION — une carte « Maintenant » ne se lâche pas : elle a toujours un porteur (règle en base).
 */
import { ChevronLeft, ChevronRight, Trash2, UserRound } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { ageLabel, isStale, neighbours, STATUS_LABELS } from '@/lib/admin-board'
import type { Task } from './useAdminBoard'

interface TaskCardProps {
  task: Task
  now: Date
  me: string | null
  landed: boolean
  onMove: (status: Task['status']) => void
  onRename: (body: string) => void
  onTake: () => void
  onRemove: () => void
}

export function TaskCard({ task, now, me, landed, ...on }: TaskCardProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const { back, next } = neighbours(task.status)
  const age = ageLabel(task.movedAt, now)
  const mine = task.ownerId !== null && task.ownerId === me

  function save() {
    if (draft !== null && draft.trim() && draft.trim() !== task.body) on.onRename(draft)
    setDraft(null)
  }

  function onKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      save()
    }
    if (event.key === 'Escape') setDraft(null)
  }

  const classes = [
    'board-card',
    task.status === 'now' && 'board-card--now',
    task.status === 'done' && 'board-card--done',
    isStale(task.status, task.movedAt, now) && 'board-card--stale',
    landed && 'board-card--landed',
  ]

  return (
    <article
      className={classes.filter(Boolean).join(' ')}
      draggable={draft === null}
      onDragStart={(event) => event.dataTransfer.setData('text/plain', task.id)}
    >
      {draft === null ? (
        <button type="button" className="board-card__text" onClick={() => setDraft(task.body)}>
          {task.body}
        </button>
      ) : (
        <textarea
          className="board-card__input"
          aria-label="Texte de la carte"
          value={draft}
          autoFocus
          rows={2}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKey}
          onBlur={save}
        />
      )}
      {(task.owner || age) && (
        <p className="board-card__meta">
          {task.owner && (
            <span className="board-card__owner" title={task.owner.name ?? undefined}>
              <Avatar src={task.owner.avatarUrl} name={task.owner.name} />
            </span>
          )}
          {age}
        </p>
      )}
      <div className="board-card__actions">
        {back && (
          <button type="button" className="board-card__move" onClick={() => on.onMove(back)}>
            <ChevronLeft size={14} strokeWidth={2} aria-hidden />
            {STATUS_LABELS[back]}
          </button>
        )}
        {next && (
          <button type="button" className="board-card__move" onClick={() => on.onMove(next)}>
            {STATUS_LABELS[next]}
            <ChevronRight size={14} strokeWidth={2} aria-hidden />
          </button>
        )}
        {!(task.status === 'now' && mine) && (
          <button
            type="button"
            className="board-card__icon"
            aria-label={mine ? 'Lâcher la carte' : 'Prendre la carte'}
            title={mine ? 'Lâcher' : 'Prendre'}
            onClick={on.onTake}
          >
            <UserRound size={14} strokeWidth={2} aria-hidden />
          </button>
        )}
        <button
          type="button"
          className="board-card__icon"
          aria-label="Supprimer la carte"
          title="Supprimer"
          onClick={on.onRemove}
        >
          <Trash2 size={14} strokeWidth={2} aria-hidden />
        </button>
      </div>
    </article>
  )
}
