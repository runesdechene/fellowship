import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import {
  CalendarDays,
  Compass,
  User,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Users,
  Shield,
} from 'lucide-react'
import { SidebarActivity } from '@/components/notifications/SidebarActivity'
import './Sidebar.css'

const exposantNav = [
  { to: '/explorer', icon: Compass, label: 'Explorer' },
  { to: '/calendrier', icon: CalendarDays, label: 'Calendrier' },
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
  const { profile } = useAuth()
  const nav = profile?.type === 'exposant' ? exposantNav : publicNav

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Header: logo + collapse toggle */}
      <div className="sidebar-header">
        <Link
          to="/explorer"
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
        {profile?.role === 'admin' && (
          <NavLink
            to="/admin"
            title={collapsed ? 'Admin' : undefined}
            className={({ isActive }) =>
              `sidebar-nav-link ${isActive ? 'active' : ''}`
            }
          >
            <Shield strokeWidth={1.5} />
            {!collapsed && <span>Admin</span>}
          </NavLink>
        )}
      </nav>

      {/* Activity section */}
      <div className="sidebar-activity-section">
        <SidebarActivity collapsed={collapsed} />
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
    </aside>
  )
}
