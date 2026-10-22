/**
 * QUOI     — « À traiter » : signalements, messages de prospects à classer, essais qui finissent.
 *            Une ligne à zéro s'éteint et ne mène nulle part.
 * POURQUOI — l'accueil dit d'abord s'il y a quelque chose à faire (maquette 2448:233).
 */
import { ChevronRight, Flag, Hourglass, Inbox, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { HomeCard } from './HomeCard'
import type { HomeFigures } from './useAdminHome'

interface Task {
  label: string
  Icon: LucideIcon
  count: number
  to: string
}

export function HomeTodo({ figures }: { figures: HomeFigures }) {
  const tasks: Task[] = [
    { label: 'Signalements', Icon: Flag, count: figures.signalements, to: '/admin/signalements' },
    {
      label: 'Messages de prospects à classer',
      Icon: Inbox,
      count: figures.messages_a_classer,
      to: '/admin/prospects/non-classes',
    },
    {
      label: 'Essais qui finissent dans 3 jours',
      Icon: Hourglass,
      count: figures.essais_bientot,
      to: '/admin/comptes?filtre=essai',
    },
  ]
  return (
    <HomeCard title="À traiter">
      <ul className="home-todo">
        {tasks.map(({ label, Icon, count, to }) => (
          <li key={label}>
            {count > 0 ? (
              <Link to={to} className="home-todo__row">
                <Icon size={16} strokeWidth={2} aria-hidden="true" />
                <span className="home-todo__label">{label}</span>
                <span className="home-todo__count">{count}</span>
                <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
              </Link>
            ) : (
              <span className="home-todo__row home-todo__row--done">
                <Icon size={16} strokeWidth={2} aria-hidden="true" />
                <span className="home-todo__label">{label}</span>
                <span>aucun</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </HomeCard>
  )
}
