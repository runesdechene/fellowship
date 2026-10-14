/**
 * QUOI     — la barre latérale : repli, marque, carte de compte, les entrées de la maquette, et le
 *            fil « Activité du réseau » et l'interrupteur Clair / Sombre en bas.
 * POURQUOI — la navigation est une liste figée (NAV_ITEMS), dans l'ordre de la maquette ; « Ma
 *            vitrine » s'y glisse avant Réglages quand l'acteur actif en a une (Uriel, 11/10/2026 :
 *            on ne pouvait pas accéder à sa propre vitrine). « Revenir à la V1 » ferme la liste : ceux
 *            qui ont la V2 passent de l'une à l'autre, comme chez Runes de Chêne (Uriel, 14/10/2026).
 */
import {
  ArrowLeftRight,
  CalendarDays,
  CircleGauge,
  PanelRightClose,
  PanelRightOpen,
  Settings,
  Store,
  Telescope,
  Users,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { ThemeSwitch } from '@/components/ui/ThemeSwitch'
import { useAuth } from '@/lib/auth'
import { NetworkActivity } from '@/features/activity/NetworkActivity'
import { AccountSwitcher } from './AccountSwitcher'

/**
 * Les entrées de la maquette, Tableau de bord en tête, puis Réglages (Uriel, 10/10/2026).
 */
interface NavItem {
  to: string
  label: string
  Icon: typeof Telescope
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Tableau de bord', Icon: CircleGauge },
  { to: '/explorer', label: 'Explorer', Icon: Telescope },
  { to: '/calendrier', label: 'Calendrier', Icon: CalendarDays },
  { to: '/communaute', label: 'Communauté', Icon: Users },
  { to: '/reglages', label: 'Réglages', Icon: Settings },
]

/** La navigation de l'acteur actif : « Ma vitrine » avant Réglages, s'il en a une. */
function navFor(vitrine: string | null | undefined): NavItem[] {
  if (!vitrine) return [...NAV_ITEMS]
  const mine = { to: `/${vitrine}`, label: 'Ma vitrine', Icon: Store }
  return [...NAV_ITEMS.slice(0, -1), mine, ...NAV_ITEMS.slice(-1)]
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const ToggleIcon = collapsed ? PanelRightClose : PanelRightOpen
  const { actor, entities } = useAuth()
  const items = navFor(entities.find((entity) => entity.actor_id === actor?.id)?.public_slug)

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
        {items.map(({ to, label, Icon }) => {
          const content = (
            <>
              <Icon className="sidebar__item-icon" size={24} strokeWidth={1.75} />
              <span className="sidebar__item-label">{label}</span>
            </>
          )

          return (
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
        {/* La V1 est une autre application : un lien plein, pas une route de la V2. */}
        <a className="sidebar__item" href="/">
          <ArrowLeftRight className="sidebar__item-icon" size={24} strokeWidth={1.75} />
          <span className="sidebar__item-label">Revenir à la V1</span>
        </a>
      </nav>

      <div className="sidebar__foot">
        {!collapsed && <NetworkActivity />}
        <ThemeSwitch compact={collapsed} />
      </div>
    </aside>
  )
}
