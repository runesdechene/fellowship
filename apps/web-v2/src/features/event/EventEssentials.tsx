/**
 * QUOI     — « L'essentiel » d'une fiche : une carte, une ligne par fait (quand, où, horaires, site…),
 *            et en pied, en inversé, la candidature du visiteur.
 * POURQUOI — maquette 2506:233 (25/10/2026) : chaque information n'apparaît qu'une fois, ici ; le
 *            haut de la fiche ne garde que le nom et les catégories.
 * ATTENTION — ce qui n'est pas renseigné n'a pas de ligne : le tri se fait à l'appel.
 */
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export interface Essential {
  Icon: LucideIcon
  label: string
  /** Ce qu'on vient lire. */
  value: string
  /** Ce qui le précise : la durée, la distance. */
  sub?: ReactNode
  /** L'action au bout de la ligne : « Ouvrir ». */
  action?: ReactNode
}

export function EventEssentials({ rows, footer }: { rows: Essential[]; footer?: ReactNode }) {
  return (
    <section className="essentials" aria-label="L’essentiel">
      {rows.map(({ Icon, label, value, sub, action }) => (
        <div key={label} className="essentials__row">
          <span className="essentials__label">
            <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
            {label}
          </span>
          <span className="essentials__body">
            <span className="essentials__value">{value}</span>
            {sub && <span className="essentials__sub">{sub}</span>}
          </span>
          {action}
        </div>
      ))}
      {footer}
    </section>
  )
}
