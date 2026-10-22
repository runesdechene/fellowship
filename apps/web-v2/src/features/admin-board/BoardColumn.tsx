/**
 * QUOI     — une colonne du tableau : sa pastille de couleur, son titre et son compteur, la saisie
 *            rapide, ses cartes, et ce qui la distingue (« À faire » replie après cinq cartes,
 *            « Fait » compte la semaine).
 * POURQUOI — maquette 2417:233 : chaque colonne porte un ton de l'administration (bleu, ocre,
 *            terre, sauge) ; on y lâche une carte glissée depuis une autre.
 */
import { CornerDownLeft, Plus } from 'lucide-react'
import { useState, type DragEvent, type FormEvent } from 'react'
import { STATUS_LABELS, TODO_VISIBLE, type TaskStatus } from '@/lib/admin-board'
import type { Tone } from '@/components/ui/IconTile'
import type { Task } from './useAdminBoard'

interface BoardColumnProps {
  status: TaskStatus
  tone: Tone
  tasks: Task[]
  count: number
  hint?: string
  footer?: string
  onAdd?: (body: string) => Promise<boolean>
  onDrop: (taskId: string) => void
  renderCard: (task: Task) => React.ReactNode
}

export function BoardColumn({ status, tone, tasks, count, hint, footer, ...on }: BoardColumnProps) {
  const [draft, setDraft] = useState('')
  // « À réfléchir » cache sa saisie derrière « Une idée » ; « À faire » l'a toujours ouverte.
  const [open, setOpen] = useState(status === 'todo')
  const [unfolded, setUnfolded] = useState(false)
  const [over, setOver] = useState(false)
  const folds = status === 'todo' && !unfolded && tasks.length > TODO_VISIBLE
  const shown = folds ? tasks.slice(0, TODO_VISIBLE) : tasks

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (draft.trim() && on.onAdd && (await on.onAdd(draft))) setDraft('')
  }

  function drop(event: DragEvent) {
    event.preventDefault()
    setOver(false)
    on.onDrop(event.dataTransfer.getData('text/plain'))
  }

  const input = on.onAdd && open && (
    <form className="board-column__add" onSubmit={(event) => void submit(event)}>
      <input
        className="board-column__input"
        value={draft}
        placeholder={status === 'todo' ? 'Ajouter une tâche…' : 'Une idée…'}
        aria-label={status === 'todo' ? 'Ajouter une tâche' : 'Ajouter une idée'}
        autoFocus={status === 'think'}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => status === 'think' && !draft && setOpen(false)}
      />
      <CornerDownLeft size={14} strokeWidth={2} aria-hidden />
    </form>
  )

  return (
    <section
      className={`board-column board-column--${tone}${over ? ' board-column--over' : ''}`}
      aria-label={STATUS_LABELS[status]}
      onDragOver={(event) => {
        event.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
    >
      <header className="board-column__head">
        <span className="board-column__dot" aria-hidden />
        <h2 className="board-column__title">{STATUS_LABELS[status]}</h2>
        <span className="board-column__count">{count}</span>
        {hint && <span className="board-column__hint">{hint}</span>}
      </header>
      {status === 'todo' && input}
      {shown.map(on.renderCard)}
      {folds && (
        <button type="button" className="board-column__more" onClick={() => setUnfolded(true)}>
          + {tasks.length - TODO_VISIBLE} autres
        </button>
      )}
      {status === 'think' &&
        (input || (
          <button type="button" className="board-column__more" onClick={() => setOpen(true)}>
            <Plus size={14} strokeWidth={2} aria-hidden />
            Une idée
          </button>
        ))}
      {footer && <p className="board-column__footer">{footer}</p>}
    </section>
  )
}
