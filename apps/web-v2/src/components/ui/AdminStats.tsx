/**
 * QUOI     — la rangée de chiffres d'une page d'administration : pastille, libellé, grand chiffre,
 *            une ligne de détail, en rouge brique quand elle demande d'agir.
 * POURQUOI — les Comptes et l'accueil de l'administration posent la même rangée (maquettes 2338:2,
 *            2448:233) ; chacun ne fournit que ses chiffres.
 */
import type { LucideIcon } from 'lucide-react'
import { IconTile, type Tone } from './IconTile'

export interface AdminFigure {
  label: string
  Icon: LucideIcon
  tone: Tone
  value: number
  detail: string
  alert?: boolean
}

export function AdminStats({ figures }: { figures: AdminFigure[] }) {
  return (
    <section className="admin-stats" aria-label="Chiffres">
      {figures.map(({ label, Icon, tone, value, detail, alert }) => (
        <div key={label} className="admin-stat">
          <div className="admin-stat__head">
            <IconTile Icon={Icon} tone={tone} />
            <span className="admin-stat__label">{label}</span>
          </div>
          <span className="admin-stat__value">{value}</span>
          <span
            className={
              alert ? 'admin-stat__detail admin-stat__detail--alert' : 'admin-stat__detail'
            }
          >
            {detail}
          </span>
        </div>
      ))}
    </section>
  )
}
