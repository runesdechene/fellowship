import type { ReactNode } from 'react'

/** neutral = compte à rebours · ok = inscrit · pending = dossier en cours */
export type ChipTone = 'neutral' | 'ok' | 'pending'

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
