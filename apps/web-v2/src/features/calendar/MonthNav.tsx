/**
 * QUOI     — la navigation des douze mois du calendrier : une barre par mois, et une fenêtre qui
 *            montre la part de l'année visible dans la frise.
 * POURQUOI — demandé par Uriel le 08/10/2026 : on saisit la fenêtre à la souris et la frise glisse
 *            en direct, comme un défilement horizontal ; au relâcher, elle se cale sur un mois.
 * ATTENTION — un geste de moins de quatre pixels reste un clic : il mène au mois cliqué, en
 *            glissant. Après un vrai glisser, le clic qui suit est avalé.
 */
import { useRef, type CSSProperties, type PointerEvent } from 'react'
import { formatMonthAbbr } from '@/lib/dates'
import type { CalendarMonth } from './useCalendar'

const DRAG_THRESHOLD = 4

interface MonthNavProps {
  months: CalendarMonth[]
  view: { start: number; size: number }
  /** Tire la frise : le pointeur et la prise, en fractions de la navigation. */
  onDrag: (pointer: number, grab: number) => void
  onPick: (key: string) => void
  onDragging: (dragging: boolean) => void
  onSettle: () => void
}

export function MonthNav({ months, view, onPick, onDrag, onDragging, onSettle }: MonthNavProps) {
  const nav = useRef<HTMLElement>(null)
  const drag = useRef<{ x: number; grab: number; moved: boolean } | null>(null)
  const swallowClick = useRef(false)

  const max = Math.max(
    1,
    ...months.map((m) => m.dates.filter((d) => d.status !== 'interesse').length),
  )

  /** La position du pointeur, en fraction de la largeur de la navigation. */
  function ratioAt(clientX: number): number {
    const box = nav.current?.getBoundingClientRect()
    return box ? (clientX - box.left) / box.width : 0
  }

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0) return
    const pointer = ratioAt(event.clientX)
    const inside = pointer >= view.start && pointer <= view.start + view.size
    // Saisie dans la fenêtre : elle garde sa prise. Ailleurs : elle vient se centrer sous le doigt.
    drag.current = {
      x: event.clientX,
      grab: inside ? pointer - view.start : view.size / 2,
      moved: false,
    }
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    const current = drag.current
    if (!current) return
    if (!current.moved) {
      if (Math.abs(event.clientX - current.x) < DRAG_THRESHOLD) return
      current.moved = true
      event.currentTarget.setPointerCapture(event.pointerId)
      onDragging(true)
    }
    onDrag(ratioAt(event.clientX), current.grab)
  }

  function onPointerUp() {
    const current = drag.current
    drag.current = null
    if (!current?.moved) return
    swallowClick.current = true
    onDragging(false)
    onSettle()
  }

  return (
    <nav
      ref={nav}
      className="month-nav"
      aria-label="Aller à un mois"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={(event) => {
        if (!swallowClick.current) return
        swallowClick.current = false
        event.stopPropagation()
      }}
      style={
        {
          '--window-start': String(view.start),
          '--window-size': String(view.size),
        } as CSSProperties
      }
    >
      <span className="month-nav__window" aria-hidden="true" />
      {months.map((month, index) => {
        const n = month.dates.filter((d) => d.status !== 'interesse').length
        const center = (index + 0.5) / months.length
        const inView = center >= view.start && center <= view.start + view.size
        return (
          <button
            key={month.key}
            type="button"
            className={inView ? 'month-nav__month month-nav__month--in-view' : 'month-nav__month'}
            onClick={() => {
              onPick(month.key)
            }}
            aria-label={`${month.label} : ${n} ${n === 1 ? 'date' : 'dates'}`}
          >
            <span
              className={n > 0 ? 'month-nav__bar' : 'month-nav__bar month-nav__bar--empty'}
              style={{ '--bar-ratio': String(n / max) } as CSSProperties}
            />
            <span className="month-nav__label">{formatMonthAbbr(month.date)}</span>
          </button>
        )
      })}
    </nav>
  )
}
