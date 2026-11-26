/**
 * QUOI     — un index qui avance seul, de 0 à `count` - 1, toutes les `delay` millisecondes.
 * POURQUOI — le mot du titre, l'écran de l'application et les aides tournent de la même façon.
 *            Choisir un index à la main relance l'attente entière.
 * ATTENTION — rien ne tourne pour qui a demandé moins de mouvement.
 */
import { useEffect, useState } from 'react'

export function useCycle(count: number, delay: number): [number, (index: number) => void] {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setTimeout(() => setIndex((index + 1) % count), delay)
    return () => window.clearTimeout(timer)
  }, [index, count, delay])

  return [index, setIndex]
}
