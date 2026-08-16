import { ChevronDown, CircleGauge, PanelRightOpen, Telescope } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/lib/auth'

/**
 * Les deux entrées de la maquette, dans l'ordre de la maquette.
 * `to: null` = l'entrée existe visuellement mais aucun écran n'est encore
 * intégré (Explorer). Le jour où il l'est, on renseigne son chemin ici.
 */
const NAV_ITEMS: ReadonlyArray<{
  to: string | null
  label: string
  Icon: typeof Telescope
}> = [
  { to: null, label: 'Explorer', Icon: Telescope },
  { to: '/', label: 'Tableau de bord', Icon: CircleGauge },
]

export function Sidebar() {
  const { actor } = useAuth()

  return (
    <aside className="sidebar">
      <button type="button" className="sidebar__collapse" aria-label="Replier le menu">
        <PanelRightOpen size={17} strokeWidth={1.75} />
      </button>

      <img className="sidebar__logo" src="/logo.png" alt="Fellowship" />

      <button type="button" className="sidebar__account">
        <Avatar src={actor?.avatarUrl} name={actor?.label} size={35} />
        <span className="sidebar__account-identity">
          <span className="sidebar__account-name">{actor?.label ?? '—'}</span>
          <span className="sidebar__account-role">{actor?.roleLabel ?? ''}</span>
        </span>
        <ChevronDown className="sidebar__account-chevron" size={19} strokeWidth={1.75} />
      </button>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map(({ to, label, Icon }) => {
          const content = (
            <>
              <Icon className="sidebar__item-icon" size={24} strokeWidth={1.75} />
              <span className="sidebar__item-label">{label}</span>
            </>
          )

          return to === null ? (
            <span key={label} className="sidebar__item">
              {content}
            </span>
          ) : (
            <NavLink
              key={label}
              to={to}
              end
              className={({ isActive }) =>
                isActive ? 'sidebar__item sidebar__item--active' : 'sidebar__item'
              }
            >
              {content}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
