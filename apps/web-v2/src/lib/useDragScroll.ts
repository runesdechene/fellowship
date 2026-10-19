/**
 * QUOI     — tirer une zone à défilement horizontal à la souris, comme on le fait au doigt.
 * POURQUOI — demandé par Uriel le 19/10/2026 : la frise du calendrier et les rangées de l'Explorer
 *            se parcourent en les saisissant, pas seulement par les flèches ou la navigation.
 * ATTENTION — la souris seule : le tactile défile déjà de lui-même. Un geste de moins de quatre
 *            pixels reste un clic ; après un vrai glisser, le clic qui suit est avalé (sinon on
 *            ouvrirait la carte sur laquelle on a lâché).
 */
import { useRef, useState, type MouseEvent, type PointerEvent } from 'react'

const DRAG_THRESHOLD = 4

interface DragScrollOptions {
  /** Où mener la zone ; par défaut, elle suit la souris sans amorti. */
  pull?: (left: number) => void
  /** Au relâcher d'un vrai glisser. */
  settle?: () => void
}

export function useDragScroll({ pull, settle }: DragScrollOptions = {}) {
  const grab = useRef<{ x: number; left: number; moved: boolean } | null>(null)
  const swallowClick = useRef(false)
  const [dragging, setDragging] = useState(false)

  function release() {
    const current = grab.current
    grab.current = null
    if (!current?.moved) return
    swallowClick.current = true
    setDragging(false)
    settle?.()
  }

  const handlers = {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (event.pointerType !== 'mouse' || event.button !== 0) return
      grab.current = { x: event.clientX, left: event.currentTarget.scrollLeft, moved: false }
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const current = grab.current
      if (!current) return
      if (!current.moved) {
        if (Math.abs(event.clientX - current.x) < DRAG_THRESHOLD) return
        current.moved = true
        event.currentTarget.setPointerCapture(event.pointerId)
        setDragging(true)
      }
      const left = current.left - (event.clientX - current.x)
      if (pull) pull(left)
      else event.currentTarget.scrollLeft = left
    },
    onPointerUp: release,
    onPointerCancel: release,
    // Le navigateur glisserait l'image ou le lien saisi au lieu de la zone.
    onDragStart(event: MouseEvent<HTMLElement>) {
      event.preventDefault()
    },
    onClickCapture(event: MouseEvent<HTMLElement>) {
      if (!swallowClick.current) return
      swallowClick.current = false
      event.stopPropagation()
      event.preventDefault()
    },
  }

  return { dragging, handlers }
}
