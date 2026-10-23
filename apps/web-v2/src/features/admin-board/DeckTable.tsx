/**
 * QUOI     — mon paquet : la carte du dessus, posée sur les autres ; Plus tard, Fait, Mélanger ;
 *            la saisie d'une tâche (au hasard, ou sur le dessus) ; le paquet déplié à la demande.
 * POURQUOI — maquette 2432:306 : on ne choisit plus quoi faire dans une liste, on fait la carte
 *            du dessus. Une idée ou une carte lâchée sur la table entre dans mon paquet.
 *            « Fait » joue la victoire (victory.ts, board-sound.ts) avant d'écrire en base.
 * ATTENTION — le paquet déplié est la seule vue de toutes les cartes : on y remonte une carte
 *             dessus ou on la supprime.
 */
import {
  ArrowDown,
  ArrowUp,
  Check,
  CornerDownLeft,
  Layers,
  Shuffle,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { isStale, sinceLabel } from '@/lib/admin-board'
import { isSoundOn, playChime, playShuffle, setSoundOn } from '@/lib/board-sound'
import type { Task } from './useAdminBoard'
import { useDropZone } from './useDropZone'
import { celebrate, shake, slideUnder } from './victory'

interface DeckTableProps {
  deck: Task[]
  now: Date
  /** Cartes déjà faites aujourd'hui : le carillon monte d'autant de demi-tons. */
  doneToday: number
  onAdd: (body: string, urgent: boolean) => Promise<boolean>
  /** Écrit la carte faite ; rend false si la base a refusé. */
  onFinish: (task: Task, emptied: boolean) => Promise<boolean>
  /** La phrase qui salue la dernière carte faite. */
  cheer: { id: string; text: string; emptied: boolean } | null
  onLater: (task: Task) => void
  onShuffle: () => void
  onToTop: (task: Task) => void
  onRemove: (task: Task) => void
  onDropTask: (taskId: string) => void
}

export function DeckTable({
  deck,
  now,
  doneToday,
  cheer,
  onAdd,
  onDropTask,
  ...on
}: DeckTableProps) {
  const [draft, setDraft] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [open, setOpen] = useState(false)
  const [sound, setSound] = useState(isSoundOn)
  // Une carte à la fois : un geste ne part pas pendant qu'un autre se joue.
  const [playing, setPlaying] = useState(false)
  // Un appui sur le texte d'une tâche le sélectionne : la carte ne se glisse plus le temps du geste.
  const [onText, setOnText] = useState(false)
  const card = useRef<HTMLElement>(null)
  const pile = useRef<HTMLDivElement>(null)
  const drop = useDropZone(onDropTask)
  const [top, ...rest] = deck

  async function play(job: () => Promise<void>) {
    if (playing) return
    setPlaying(true)
    try {
      await job()
    } finally {
      setPlaying(false)
    }
  }

  function finish(task: Task) {
    void play(async () => {
      playChime(doneToday)
      const today =
        document.querySelector('[data-board-today]') ?? document.querySelector('.board-done')
      if (card.current) await celebrate(card.current, today, rest.length === 0)
      // Refusée en base : la carte revient à sa place.
      if (!(await on.onFinish(task, rest.length === 0))) {
        card.current?.getAnimations({ subtree: true }).forEach((a) => a.cancel())
        card.current?.classList.remove('deck-card--lifted')
      }
    })
  }

  function later(task: Task) {
    void play(async () => {
      if (card.current) await slideUnder(card.current)
      on.onLater(task)
    })
  }

  function shuffle() {
    playShuffle()
    if (pile.current) shake(pile.current)
    on.onShuffle()
  }

  function toggleSound() {
    setSoundOn(!sound)
    setSound(!sound)
  }

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
      onPointerDownCapture={(event) =>
        setOnText(
          event.target instanceof Element &&
            event.target.closest('.deck-card__text, .deck-list__text') !== null,
        )
      }
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
        <button
          type="button"
          className="deck-table__see deck-table__sound"
          aria-pressed={sound}
          onClick={toggleSound}
        >
          {sound ? (
            <Volume2 size={14} strokeWidth={2} aria-hidden />
          ) : (
            <VolumeX size={14} strokeWidth={2} aria-hidden />
          )}
          {sound ? 'Son activé' : 'Son coupé'}
        </button>
      </header>
      {cheer && (
        <p
          key={cheer.id}
          className={`deck-cheer${cheer.emptied ? ' deck-cheer--long' : ''}`}
          role="status"
        >
          {cheer.text}
        </p>
      )}

      {top ? (
        <div ref={pile} className={`deck-pile${rest.length === 0 ? ' deck-pile--last' : ''}`}>
          <article
            key={top.id}
            ref={card}
            className={`deck-card${isStale(top.movedAt, now) ? ' deck-card--stale' : ''}`}
            draggable={!onText}
            onDragStart={(event) => event.dataTransfer.setData('text/plain', top.id)}
          >
            <p className="deck-card__text">{top.body}</p>
            <p className="deck-card__since">Dans ton paquet {sinceLabel(top.movedAt, now)}</p>
            <span className="deck-card__wash" aria-hidden />
            <span className="deck-seal" aria-hidden>
              <svg viewBox="0 0 24 24">
                <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} />
              </svg>
            </span>
          </article>
        </div>
      ) : (
        <p className="deck-table__empty">
          Ton paquet est vide. Ajoute une tâche ou glisse une idée ici.
        </p>
      )}

      {top && (
        <div className="deck-table__actions">
          <button
            type="button"
            className="deck-action"
            disabled={playing || rest.length === 0}
            onClick={() => later(top)}
          >
            <ArrowDown size={16} strokeWidth={2} aria-hidden />
            Plus tard
          </button>
          <button
            type="button"
            className="deck-action deck-action--done"
            disabled={playing}
            onClick={() => finish(top)}
          >
            <Check size={16} strokeWidth={2} aria-hidden />
            Fait
          </button>
          <button
            type="button"
            className="deck-action"
            disabled={playing || rest.length === 0}
            onClick={shuffle}
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
              draggable={!onText}
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
