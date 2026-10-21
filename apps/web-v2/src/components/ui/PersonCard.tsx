/**
 * QUOI     — la carte d'une personne : grand visage, nom, ville ou métier, la raison de la
 *            proposition, puis son action (« Suivre »).
 * POURQUOI — maquette 2363:2, posée à l'arrivée (« Tu les connais peut-être », 2392:65).
 */
import type { ReactNode } from 'react'
import { Avatar } from './Avatar'

interface PersonCardProps {
  name: string
  meta: string
  avatarUrl: string | null
  reason: string
  action: ReactNode
}

export function PersonCard({ name, meta, avatarUrl, reason, action }: PersonCardProps) {
  return (
    <article className="person-card">
      <Avatar className="person-card__avatar" src={avatarUrl} name={name} />
      <p className="person-card__name">{name}</p>
      {meta && <p className="person-card__meta">{meta}</p>}
      <p className="person-card__reason">{reason}</p>
      {action}
    </article>
  )
}
