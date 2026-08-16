import {
  ChevronDown,
  CircleGauge,
  PanelRightClose,
  PanelRightOpen,
  Telescope,
} from 'lucide-react'
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

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { actor } = useAuth()
  const ToggleIcon = collapsed ? PanelRightClose : PanelRightOpen

  return (
    <aside className="sidebar">
      <button
        type="button"
        className="sidebar__collapse"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Déplier le menu' : 'Replier le menu'}
      >
        <ToggleIcon size={17} strokeWidth={1.75} />
      </button>

      {/* La marque seule — /logo.png est le lockup complet, réservé à la connexion */}
      <img className="sidebar__logo" src="/icon.png" alt="Fellowship" />

      <button type="button" className="sidebar__account">
        <Avatar
          className="sidebar__account-avatar"
          src={actor?.avatarUrl}
          name={actor?.label}
        />
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
            <span key={label} className="sidebar__item sidebar__item--inert">
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
