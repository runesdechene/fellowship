/**
 * QUOI     — une carte de lignes d'information : chaque ligne a son icône, un libellé discret, une
 *            valeur, et parfois une précision dessous.
 * POURQUOI — « Mon dossier » et « Pour candidater » se lisent pareil : on balaie les libellés,
 *            on s'arrête sur la valeur (maquette 2027, fiche événement).
 * ATTENTION — la valeur est un nœud : elle peut être un lien ou un champ à remplir sur place.
 */
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function InfoRows({ children }: { children: ReactNode }) {
  return <ul className="info-rows">{children}</ul>
}

interface InfoRowProps {
  Icon: LucideIcon
  label: string
  children: ReactNode
  sub?: ReactNode
}

export function InfoRow({ Icon, label, children, sub }: InfoRowProps) {
  return (
    <li className="info-row">
      <Icon className="info-row__icon" size={16} strokeWidth={1.8} />
      <span className="info-row__body">
        <span className="info-row__label">{label}</span>
        <span className="info-row__value">{children}</span>
        {sub && <span className="info-row__sub">{sub}</span>}
      </span>
    </li>
  )
}
