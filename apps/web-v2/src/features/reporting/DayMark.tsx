/**
 * QUOI     — la forme d'un jour : coche verte (envoyée), point d'exclamation brique (à vérifier),
 *            demi-cercle (en attente), tiret (aucune vente), cercle vide (à venir).
 * POURQUOI — les statuts se lisent par la forme et la couleur (langage « 2027 », règle 7) ; la même
 *            forme sert aux décades, au tableau, à « À traiter » et à la légende.
 */
import { Check } from 'lucide-react'
import type { DayMark as Mark } from '@/lib/reporting'

export function DayMark({ mark, size = 'm' }: { mark: Mark; size?: 's' | 'm' | 'l' }) {
  return (
    <span className={`day-mark day-mark--${mark} day-mark--${size}`} aria-hidden="true">
      {mark === 'envoyee' && <Check strokeWidth={3} />}
      {mark === 'verifier' && '!'}
    </span>
  )
}
