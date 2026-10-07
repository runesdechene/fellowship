/**
 * QUOI     — la frise du calendrier (sa référence) et son glissement vers une cible, image par
 *            image, au lieu d'y sauter.
 * POURQUOI — demandé par Uriel le 08/10/2026 : quand on tire la fenêtre des mois, la frise rattrape
 *            le pointeur en douceur, comme un défilement qui a de l'élan.
 * ATTENTION — `prefers-reduced-motion` : la frise suit sans amorti. `stop()` coupe l'élan avant un
 *            défilement natif (le calage sur un mois), sinon les deux se disputeraient la frise ;
 *            le calage vise `destination()`, là où l'on a lâché, pas là où l'amorti en est.
 */
import { useCallback, useEffect, useRef } from 'react'
import { easeToward } from '@/lib/calendar'

const FACTOR = 0.2

export function useEasedScroll() {
  const frieze = useRef<HTMLDivElement>(null)
  const target = useRef(0)
  const frame = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
  }, [])

  const glideTo = useCallback((left: number) => {
    const el = frieze.current
    if (!el) return
    target.current = left
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.scrollLeft = left
      return
    }
    if (frame.current !== null) return

    const step = () => {
      const current = frieze.current
      if (!current) {
        frame.current = null
        return
      }
      const next = easeToward(current.scrollLeft, target.current, FACTOR)
      current.scrollLeft = next
      frame.current = next === target.current ? null : requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
  }, [])

  /** Où le glisser veut emmener la frise — même si l'amorti n'y est pas encore arrivé. */
  const destination = useCallback(() => target.current, [])

  // Une page quittée en plein glisser ne laisse pas tourner de boucle.
  useEffect(() => stop, [stop])

  return { frieze, glideTo, stop, destination }
}
