/**
 * QUOI     — douze papiers scotchés qu'on attrape et qu'on jette, et de quoi les recoller.
 * POURQUOI — maquette du 26/11/2026 (Uriel : « super audacieux ») : lâcher la paperasse, en vrai.
 * ATTENTION — au clavier, Entrée jette le papier (un clic sans pointeur a `detail` à 0). Lâché
 *            trop près de sa place, un papier y revient.
 */
import { useRef, useState, type CSSProperties, type PointerEvent } from 'react'

const MONTHS =
  'Janvier Février Mars Avril Mai Juin Juillet Août Septembre Octobre Novembre Décembre'.split(' ')
const KINDS = ['Tableur des stands', 'Relance à faire', 'Dossier papier', 'Post-it « payer ? »']
/** En deçà de cette distance, en pixels, le geste ne jette pas. */
const THROW_AFTER = 50

interface Move {
  x: number
  y: number
  state: 'rest' | 'held' | 'gone'
}
const REST: Move = { x: 0, y: 0, state: 'rest' }

function Paper({ title, month, side }: { title: string; month: string; side: 1 | -1 }) {
  const [move, setMove] = useState<Move>(REST)
  const start = useRef<{ x: number; y: number } | null>(null)

  const offset = (event: PointerEvent) =>
    start.current && { x: event.clientX - start.current.x, y: event.clientY - start.current.y }

  const release = (event: PointerEvent) => {
    const by = offset(event)
    start.current = null
    if (!by) return
    const thrown = Math.hypot(by.x, by.y) > THROW_AFTER
    setMove(thrown ? { x: by.x * 3, y: by.y * 3 + 160, state: 'gone' } : REST)
  }

  return (
    <li>
      <button
        type="button"
        className={`discover-paper discover-paper--${move.state}`}
        style={
          {
            '--paper-x': `${String(move.x)}px`,
            '--paper-y': `${String(move.y)}px`,
          } as CSSProperties
        }
        aria-label={`Jeter : ${title}, ${month}`}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          start.current = { x: event.clientX, y: event.clientY }
          setMove({ ...REST, state: 'held' })
        }}
        onPointerMove={(event) => {
          const by = offset(event)
          if (by) setMove({ ...by, state: 'held' })
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onClick={(event) => {
          if (event.detail === 0) setMove({ x: side * 260, y: 220, state: 'gone' })
        }}
      >
        <strong>{title}</strong>
        <span>{month}</span>
      </button>
    </li>
  )
}

export function PaperToss() {
  // Changer de tirage recrée les douze papiers, à leur place.
  const [round, setRound] = useState(0)

  return (
    <div className="discover-toss">
      <p className="discover-toss__title">Voilà ce que ça fait de lâcher la paperasse.</p>
      <p className="discover-toss__hint">Attrape un papier et jette-le.</p>
      <ul key={round} className="discover-toss__papers">
        {MONTHS.map((month, index) => (
          <Paper
            key={month}
            month={month}
            title={KINDS[index % KINDS.length] ?? ''}
            side={index % 2 ? 1 : -1}
          />
        ))}
      </ul>
      <button
        type="button"
        className="discover-toss__again"
        onClick={() => {
          setRound(round + 1)
        }}
      >
        Recoller les papiers
      </button>
    </div>
  )
}
