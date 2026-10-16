/**
 * QUOI     — les quatre chiffres des prospects : total, contactés, ont répondu, ont créé leur compte.
 * POURQUOI — on voit d'un coup d'œil où en est la prospection (maquette 2343:2).
 */
import { CircleCheck, Reply, Send, Target, type LucideIcon } from 'lucide-react'
import { IconTile, type Tone } from '@/components/ui/IconTile'
import { percent } from '@/lib/prospect'
import type { ProspectStats } from './useProspects'

interface Figure {
  label: string
  Icon: LucideIcon
  tone: Tone
  value: number
  detail: string
}

export function ProspectsStats({ stats }: { stats: ProspectStats }) {
  const figures: Figure[] = [
    {
      label: 'Prospects',
      Icon: Target,
      tone: 'prune',
      value: stats.total,
      detail: `+${stats.semaine} cette semaine`,
    },
    {
      label: 'Contactés',
      Icon: Send,
      tone: 'bleu',
      value: stats.contactes,
      detail: `${percent(stats.contactes, stats.total)} %`,
    },
    {
      label: 'Ont répondu',
      Icon: Reply,
      tone: 'sauge',
      value: stats.repondu,
      detail: `${percent(stats.repondu, stats.contactes)} % des contactés`,
    },
    {
      label: 'Ont créé leur compte',
      Icon: CircleCheck,
      tone: 'terre',
      value: stats.comptes,
      detail: `dont ${stats.comptes_pro} en Pro`,
    },
  ]
  return (
    <section className="admin-stats" aria-label="Chiffres">
      {figures.map(({ label, Icon, tone, value, detail }) => (
        <div key={label} className="admin-stat">
          <div className="admin-stat__head">
            <IconTile Icon={Icon} tone={tone} />
            <span className="admin-stat__label">{label}</span>
          </div>
          <span className="admin-stat__value">{value}</span>
          <span className="admin-stat__detail">{detail}</span>
        </div>
      ))}
    </section>
  )
}
