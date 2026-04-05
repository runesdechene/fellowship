import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import {
  LayoutDashboard,
  CalendarDays,
  Compass,
  User,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Users,
} from 'lucide-react'
import { SidebarActivity } from '@/components/notifications/SidebarActivity'
import { NotificationSlidePanel } from '@/components/notifications/NotificationSlidePanel'
import './Sidebar.css'

const exposantNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/calendrier', icon: CalendarDays, label: 'Calendrier' },
  { to: '/explorer', icon: Compass, label: 'Explorer' },
  { to: '/profil', icon: User, label: 'Profil' },
  { to: '/reglages', icon: Settings, label: 'Réglages' },
]

const publicNav = [
  { to: '/explorer', icon: Compass, label: 'Explorer' },
  { to: '/suivis', icon: Users, label: 'Mes suivis' },
  { to: '/profil', icon: User, label: 'Profil' },
  { to: '/reglages', icon: Settings, label: 'Réglages' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [wasCollapsed, setWasCollapsed] = useState(false)
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const { profile } = useAuth()
  const nav = profile?.type === 'exposant' ? exposantNav : publicNav

  const openNotifPanel = () => {
    setWasCollapsed(collapsed)
    setCollapsed(false)
    setShowNotifPanel(true)
  }

  const closeNotifPanel = () => {
    setShowNotifPanel(false)
    if (wasCollapsed) setCollapsed(true)
  }

  return (
    <aside className={`sidebar ${collapsed && !showNotifPanel ? 'collapsed' : ''}`}>
      {showNotifPanel ? (
        <NotificationSlidePanel onClose={closeNotifPanel} />
      ) : (
        <>
          {/* Header: logo + collapse toggle */}
          <div className="sidebar-header">
            <Link
              to={profile?.type === 'exposant' ? '/dashboard' : '/explorer'}
              className="sidebar-logo-link"
            >
              {collapsed ? (
                <img src="/icon.png" alt="Fellowship" className="sidebar-logo-icon" />
              ) : (
                <img src="/logo.png" alt="Fellowship" style={{ height: 36 }} />
              )}
            </Link>
            {!collapsed && (
              <button
                onClick={() => setCollapsed(true)}
                className="sidebar-collapse-btn"
              >
                <PanelLeftClose strokeWidth={1.5} />
              </button>
            )}
          </div>

          {/* Nav */}
          <nav className="sidebar-nav">
            {nav.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  `sidebar-nav-link ${isActive ? 'active' : ''}`
                }
              >
                <Icon strokeWidth={1.5} />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </nav>

          {/* Activity section */}
          <div className="sidebar-activity-section">
            <SidebarActivity collapsed={collapsed} onShowAll={openNotifPanel} />
          </div>

          {/* Expand button (only visible when collapsed) */}
          {collapsed && (
            <div className="sidebar-expand">
              <button
                onClick={() => setCollapsed(false)}
                className="sidebar-expand-btn"
              >
                <PanelLeft strokeWidth={1.5} />
              </button>
            </div>
          )}
        </>
      )}
    </aside>
  )
}
