/**
 * QUOI     — les idées : des notes bleues posées de travers, qu'on glisse sur un paquet pour en
 *            faire une tâche, et de quoi en noter une.
 * POURQUOI — maquette 2432:306 : ce qui n'est pas encore une tâche ne va dans le paquet de
 *            personne.
 */
import { Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { Task } from './useAdminBoard'

interface IdeaNotesProps {
  ideas: Task[]
  onAdd: (body: string) => Promise<boolean>
  onRemove: (task: Task) => void
}

export function IdeaNotes({ ideas, onAdd, onRemove }: IdeaNotesProps) {
  const [draft, setDraft] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (draft?.trim() && (await onAdd(draft))) setDraft(null)
  }

  return (
    <section className="board-ideas" aria-label="Idées">
      <header className="board-zone__head">
        <h2 className="board-zone__title">Idées</h2>
        <span className="board-zone__count">{ideas.length}</span>
      </header>
      <ul className="board-ideas__notes">
        {ideas.map((idea) => (
          <li
            key={idea.id}
            className="board-idea"
            draggable
            onDragStart={(event) => event.dataTransfer.setData('text/plain', idea.id)}
          >
            {idea.body}
            <button
              type="button"
              className="board-idea__remove"
              aria-label="Supprimer l’idée"
              onClick={() => onRemove(idea)}
            >
              <X size={13} strokeWidth={2} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      {draft === null ? (
        <button type="button" className="board-ideas__add" onClick={() => setDraft('')}>
          <Plus size={14} strokeWidth={2} aria-hidden />
          Une idée
        </button>
      ) : (
        <form onSubmit={(event) => void submit(event)}>
          <input
            className="board-ideas__input"
            value={draft}
            placeholder="Une idée"
            aria-label="Noter une idée"
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => !draft.trim() && setDraft(null)}
          />
        </form>
      )}
    </section>
  )
}
