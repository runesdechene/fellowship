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
