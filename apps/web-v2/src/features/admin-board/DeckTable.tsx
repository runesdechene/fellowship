/**
 * QUOI     — mon paquet : la carte du dessus, posée sur les autres ; Plus tard, Fait, Mélanger ;
 *            la saisie d'une tâche (au hasard, ou sur le dessus) ; le paquet déplié à la demande.
 * POURQUOI — maquette 2432:306 : on ne choisit plus quoi faire dans une liste, on fait la carte
 *            du dessus. Une idée ou une carte lâchée sur la table entre dans mon paquet.
 * ATTENTION — le paquet déplié est la seule vue de toutes les cartes : on y remonte une carte
 *             dessus ou on la supprime.
 */
import { ArrowDown, ArrowUp, Check, CornerDownLeft, Layers, Shuffle, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { isStale, sinceLabel } from '@/lib/admin-board'
import type { Task } from './useAdminBoard'
import { useDropZone } from './useDropZone'

interface DeckTableProps {
  deck: Task[]
  now: Date
  onAdd: (body: string, urgent: boolean) => Promise<boolean>
  onFinish: (task: Task) => void
  onLater: (task: Task) => void
  onShuffle: () => void
  onToTop: (task: Task) => void
  onRemove: (task: Task) => void
  onDropTask: (taskId: string) => void
}

export function DeckTable({ deck, now, onAdd, onDropTask, ...on }: DeckTableProps) {
  const [draft, setDraft] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [open, setOpen] = useState(false)
  const drop = useDropZone(onDropTask)
  const [top, ...rest] = deck

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!draft.trim()) return
    if (await onAdd(draft, urgent)) {
      setDraft('')
      setUrgent(false)
    }
  }

  return (
    <section
      className={`deck-table${drop.over ? ' deck-table--over' : ''}`}
      aria-label="Maintenant"
      {...drop.handlers}
    >
      <header className="deck-table__head">
        <h2 className="board-zone__title">Maintenant</h2>
        <span className="board-zone__count">
          {deck.length} {deck.length > 1 ? 'cartes' : 'carte'}
        </span>
        {rest.length > 0 && (
          <button
            type="button"
            className="deck-table__see"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <Layers size={14} strokeWidth={2} aria-hidden />
            {open ? 'Replier le paquet' : 'Voir le paquet'}
          </button>
        )}
      </header>

      {top ? (
        <div className={`deck-pile${rest.length === 0 ? ' deck-pile--last' : ''}`}>
          <article
            key={top.id}
            className={`deck-card${isStale(top.movedAt, now) ? ' deck-card--stale' : ''}`}
            draggable
            onDragStart={(event) => event.dataTransfer.setData('text/plain', top.id)}
          >
            <p className="deck-card__text">{top.body}</p>
            <p className="deck-card__since">Dans ton paquet {sinceLabel(top.movedAt, now)}</p>
          </article>
        </div>
      ) : (
        <p className="deck-table__empty">
          Ton paquet est vide. Ajoute une tâche ou glisse une idée ici.
        </p>
      )}

      {top && (
        <div className="deck-table__actions">
          <button type="button" className="deck-action" onClick={() => on.onLater(top)}>
            <ArrowDown size={16} strokeWidth={2} aria-hidden />
            Plus tard
          </button>
          <button
            type="button"
            className="deck-action deck-action--done"
            onClick={() => on.onFinish(top)}
          >
            <Check size={16} strokeWidth={2} aria-hidden />
            Fait
          </button>
          <button
            type="button"
            className="deck-action"
            disabled={rest.length === 0}
            onClick={on.onShuffle}
          >
            <Shuffle size={16} strokeWidth={2} aria-hidden />
            Mélanger
          </button>
        </div>
      )}

      <form className="deck-table__add" onSubmit={(event) => void submit(event)}>
        <input
          className="deck-table__input"
          value={draft}
          placeholder="Ajouter une tâche au paquet"
          aria-label="Ajouter une tâche au paquet"
          onChange={(event) => setDraft(event.target.value)}
        />
        <label className="deck-table__urgent">
          <input
            type="checkbox"
            checked={urgent}
            onChange={(event) => setUrgent(event.target.checked)}
          />
          sur le dessus
        </label>
        <CornerDownLeft size={14} strokeWidth={2} aria-hidden />
      </form>

      {open && rest.length > 0 && (
        <ol className="deck-list">
          {rest.map((task) => (
            <li
              key={task.id}
              className="deck-list__item"
              draggable
              onDragStart={(event) => event.dataTransfer.setData('text/plain', task.id)}
            >
              <span className="deck-list__text">{task.body}</span>
              <button
                type="button"
                className="deck-list__icon"
                aria-label="Mettre sur le dessus"
                title="Mettre sur le dessus"
                onClick={() => on.onToTop(task)}
              >
                <ArrowUp size={14} strokeWidth={2} aria-hidden />
              </button>
              <button
                type="button"
                className="deck-list__icon"
                aria-label="Supprimer la carte"
                title="Supprimer"
                onClick={() => on.onRemove(task)}
              >
                <X size={14} strokeWidth={2} aria-hidden />
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
