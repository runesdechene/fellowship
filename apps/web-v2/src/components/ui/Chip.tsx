/**
 * QUOI     — la pastille d'état (un mot, une icône, un ton).
 * POURQUOI — la couleur dit qui doit bouger : blé = à toi de jouer, terre = chez l'autre,
 *            olive = acquis (décision du 19/08/2026). Le ton est un état, pas une décoration.
 */
import type { ReactNode } from 'react'

/**
 * Les registres de l’app, dans l’ordre où on les traverse :
 *   neutral — une information, pas un état
 *   todo    — à TOI de jouer (blé)
 *   pending — c’est parti, ça attend chez quelqu’un d’autre (terre du logo)
 *   ok      — c’est acquis (olive)
 */
export type ChipTone = 'neutral' | 'todo' | 'pending' | 'ok'

interface ChipProps {
  tone?: ChipTone
  icon?: ReactNode
  children: ReactNode
}

export function Chip({ tone = 'neutral', icon, children }: ChipProps) {
  return (
    <span className={`chip chip--${tone}`}>
      {icon ? <span className="chip__icon">{icon}</span> : null}
      {children}
    </span>
  )
}
