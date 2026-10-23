/**
 * QUOI     — la barre latérale : repli, marque, carte de compte, les entrées de la maquette, et le
 *            fil « Activité du réseau », la ligne de version (les Nouveautés) et l'interrupteur
 *            Clair / Sombre en bas.
 * POURQUOI — la navigation est une liste figée (NAV_ITEMS), dans l'ordre de la maquette ; « Ma
 *            vitrine » s'y glisse avant Réglages quand l'acteur actif en a une (Uriel, 11/10/2026 :
 *            on ne pouvait pas accéder à sa propre vitrine).
 *            En mode admin (une adresse `/admin…`, choisie dans le sélecteur d'identité), la barre
 *            garde son allure et ne liste que les sections de l'administration (Uriel, 16/10/2026).
 * ATTENTION — Signalements porte le nombre en attente (maquette 2338:23), relu à chaque changement
 *            d'adresse ; Communauté, en rouge, les demandes d'ami en attente (Uriel, 19/10/2026).
 */
import {
  CalendarDays,
  CircleGauge,
  Flag,
  Megaphone,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  Settings,
  SquareKanban,
  House,
  Store,
  Tag,
  Target,
  Telescope,
  Users,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { isAdminPath } from '@/lib/admin-mode'
import { ThemeSwitch } from '@/components/ui/ThemeSwitch'
import { Wordmark } from '@/components/ui/Wordmark'
import { useAuth } from '@/lib/auth'
import { requestsLabel } from '@/lib/network'
import { NetworkActivity } from '@/features/activity/NetworkActivity'
import { usePendingReports } from '@/features/admin-moderation/usePendingReports'
import { AccountSwitcher } from './AccountSwitcher'
import { VersionLine } from './VersionLine'

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

/** Les sections de l'administration ; « Comptes » reste allumé sur les fiches qui en descendent. */
const ADMIN_ITEMS = [
  { to: '/admin/accueil', label: 'Accueil', Icon: House, prefixes: ['/admin/accueil'] },
  { to: '/admin/taches', label: 'Tâches', Icon: SquareKanban, prefixes: ['/admin/taches'] },
  {
    to: '/admin/comptes',
    label: 'Comptes',
    Icon: Users,
    prefixes: ['/admin/comptes', '/admin/enseignes', '/admin/personnes'],
  },
  { to: '/admin/prospects', label: 'Prospects', Icon: Target, prefixes: ['/admin/prospects'] },
  {
    to: '/admin/signalements',
    label: 'Signalements',
    Icon: Flag,
    prefixes: ['/admin/signalements'],
  },
  {
    to: '/admin/evenements',
    label: 'Événements',
    Icon: CalendarDays,
    prefixes: ['/admin/evenements'],
  },
  { to: '/admin/categories', label: 'Catégories', Icon: Tag, prefixes: ['/admin/categories'] },
  {
    to: '/admin/temoignages',
    label: 'Témoignages',
    Icon: MessageSquare,
    prefixes: ['/admin/temoignages'],
  },
  {
    to: '/admin/mises-a-jour',
    label: 'Mises à jour',
    Icon: Megaphone,
    prefixes: ['/admin/mises-a-jour'],
  },
] as const

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  friendRequests: number
  updatesUnread: boolean
}

export function Sidebar({ collapsed, onToggle, friendRequests, updatesUnread }: SidebarProps) {
  const ToggleIcon = collapsed ? PanelRightClose : PanelRightOpen
  const { actor, entities } = useAuth()
  const { pathname, search } = useLocation()
  const items = navFor(entities.find((entity) => entity.actor_id === actor?.id)?.public_slug)
  const adminMode = isAdminPath(pathname)
  const pendingReports = usePendingReports(adminMode ? pathname + search : '')

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

      {/* La marque écrite, comme sur la landing ; repliée, le pictogramme seul (sidebar.css). */}
      <Wordmark className="sidebar__logo" />

      <AccountSwitcher collapsed={collapsed} onExpand={onToggle} />

      {adminMode ? (
        <nav className="sidebar__nav">
          {ADMIN_ITEMS.map(({ to, label, Icon, prefixes }) => {
            const active = prefixes.some((prefix) => pathname.startsWith(prefix))
            return (
              <NavLink
                key={to}
                to={to}
                className={active ? 'sidebar__item sidebar__item--active' : 'sidebar__item'}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="sidebar__item-icon" size={24} strokeWidth={1.75} />
                <span className="sidebar__item-label">{label}</span>
                {to === '/admin/signalements' && pendingReports > 0 && (
                  <span className="sidebar__count">{pendingReports}</span>
                )}
              </NavLink>
            )
          })}
        </nav>
      ) : (
        <nav className="sidebar__nav">
          {items.map(({ to, label, Icon }) => {
            const content = (
              <>
                <Icon className="sidebar__item-icon" size={24} strokeWidth={1.75} />
                <span className="sidebar__item-label">{label}</span>
                {to === '/communaute' && friendRequests > 0 && (
                  <span
                    className="sidebar__count sidebar__count--alert"
                    aria-label={requestsLabel(friendRequests)}
                  >
                    {friendRequests}
                  </span>
                )}
              </>
            )

            return (
              <NavLink
                key={label}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  isActive ? 'sidebar__item sidebar__item--active' : 'sidebar__item'
                }
              >
                {content}
              </NavLink>
            )
          })}
        </nav>
      )}

      <div className="sidebar__foot">
        {/* En admin, le fil vit sur l'accueil : ici il débordait sur la navigation des petits écrans. */}
        {!collapsed && !adminMode && <NetworkActivity />}
        <VersionLine unread={updatesUnread} />
        <ThemeSwitch compact={collapsed} />
      </div>
    </aside>
  )
}
