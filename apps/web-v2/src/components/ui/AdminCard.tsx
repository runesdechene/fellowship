/**
 * QUOI     — un bloc de fiche d'administration : carte blanche bordée, titre précédé de son icône
 *            teintée, une action à droite (« Corriger », « Tout voir »).
 * POURQUOI — les deux fiches (enseigne, personne) sont faites de ces blocs (maquettes 2342:2, 2344:2).
 */
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { IconTile, type Tone } from './IconTile'

interface AdminCardProps {
  title: string
  Icon: LucideIcon
  tone: Tone
  action?: ReactNode
  children: ReactNode
}

export function AdminCard({ title, Icon, tone, action, children }: AdminCardProps) {
  return (
    <section className="admin-card" aria-label={title}>
      <header className="admin-card__head">
        <IconTile Icon={Icon} tone={tone} />
        <h2 className="admin-card__title">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  )
}
