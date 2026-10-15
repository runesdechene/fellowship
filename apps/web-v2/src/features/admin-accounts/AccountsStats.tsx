/**
 * QUOI     — les quatre chiffres du haut de la liste : comptes, enseignes Pro, essais, paiements en échec.
 * POURQUOI — un coup d'œil dit si quelque chose demande l'attention de l'administrateur (maquette 2338:2).
 */
import { CircleAlert, Hourglass, Sparkles, Users, type LucideIcon } from 'lucide-react'
import { IconTile, type Tone } from '@/components/ui/IconTile'
import type { Stats } from './useAccounts'

interface Figure {
  label: string
  Icon: LucideIcon
  tone: Tone
  value: number
  detail: string
  alert?: boolean
}

export function AccountsStats({ stats }: { stats: Stats }) {
  const figures: Figure[] = [
    {
      label: 'Comptes',
      Icon: Users,
      tone: 'prune',
      value: stats.comptes,
      detail: `+${stats.comptes_semaine} cette semaine`,
    },
    {
      label: 'Enseignes Pro',
      Icon: Sparkles,
      tone: 'terre',
      value: stats.pro,
      detail: `dont ${stats.pro_offerts} offertes`,
    },
    {
      label: 'Essais en cours',
      Icon: Hourglass,
      tone: 'bleu',
      value: stats.essais,
      detail: `${stats.essais_bientot} finissent dans 3 jours`,
    },
    {
      label: 'Paiements en échec',
      Icon: CircleAlert,
      tone: 'brique',
      value: stats.echecs,
      detail: stats.echecs > 0 ? 'à relancer' : 'aucun',
      alert: stats.echecs > 0,
    },
  ]
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
