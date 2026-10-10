/**
 * QUOI     — la barre latérale : repli, marque, carte de compte, les entrées de la maquette, et le
 *            fil « Activité du réseau » et l'interrupteur Clair / Sombre en bas.
 * POURQUOI — la navigation est une liste figée (NAV_ITEMS), dans l'ordre de la maquette ; une
 *            entrée sans écran intégré reste visible mais inerte.
 */
import {
  CalendarDays,
  CircleGauge,
  PanelRightClose,
  PanelRightOpen,
  Settings,
  Telescope,
  Users,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { ThemeSwitch } from '@/components/ui/ThemeSwitch'
import { NetworkActivity } from '@/features/activity/NetworkActivity'
import { AccountSwitcher } from './AccountSwitcher'

/**
 * Les entrées de la maquette, Tableau de bord en tête, puis Réglages (Uriel, 10/10/2026).
 * `to: null` = l'entrée existe visuellement mais aucun écran n'est encore
 * intégré (Explorer). Le jour où il l'est, on renseigne son chemin ici.
 */
const NAV_ITEMS: ReadonlyArray<{
  to: string | null
  label: string
  Icon: typeof Telescope
}> = [
  { to: '/', label: 'Tableau de bord', Icon: CircleGauge },
  { to: '/explorer', label: 'Explorer', Icon: Telescope },
  { to: '/calendrier', label: 'Calendrier', Icon: CalendarDays },
  { to: null, label: 'Communauté', Icon: Users },
  { to: '/reglages', label: 'Réglages', Icon: Settings },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
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

      {/* La marque seule — logo.png est le lockup complet, réservé à la connexion */}
      <img className="sidebar__logo" src={`${import.meta.env.BASE_URL}icon.png`} alt="Fellowship" />

      <AccountSwitcher collapsed={collapsed} onExpand={onToggle} />

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

      <div className="sidebar__foot">
        {!collapsed && <NetworkActivity />}
        <ThemeSwitch compact={collapsed} />
      </div>
    </aside>
  )
}
