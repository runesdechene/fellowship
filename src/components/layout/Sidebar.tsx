import { useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import {
  CalendarDays, CalendarClock, Compass, User, Settings, Heart,
  LayoutDashboard, Store, Users, Shield, Lock, Sparkles,
  PanelLeftClose, PanelLeft, type LucideIcon,
} from 'lucide-react'
import { navItemsFor, entryState, NAV_DEFS } from '@/lib/navModel'
import { EntitySwitcher } from './EntitySwitcher'
import { SidebarActivity } from '@/components/notifications/SidebarActivity'
import './Sidebar.css'

const ICONS: Record<string, LucideIcon> = {
  Compass, CalendarClock, Heart, LayoutDashboard, CalendarDays, Users, Store, User, Settings,
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { currentActor, person, isAdmin } = useAuth()
  const navigate = useNavigate()
  const plan = person?.plan === 'pro' ? 'pro' : 'free'
  const keys = navItemsFor(currentActor)

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <Link to="/explorer" className="sidebar-logo-link">
          {collapsed ? <img src="/icon.png" alt="Fellowship" className="sidebar-logo-icon" /> : <img src="/logo.png" alt="Fellowship" style={{ height: 36 }} />}
        </Link>
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} className="sidebar-collapse-btn"><PanelLeftClose strokeWidth={1.5} /></button>
        )}
      </div>

      {/* Sélecteur d'entité */}
      <EntitySwitcher collapsed={collapsed} />

      <nav className="sidebar-nav">
        {keys.map(key => {
          const def = NAV_DEFS[key]
          const Icon = ICONS[def.icon] ?? Compass
          const state = entryState(key, plan)
          if (state === 'active') {
            return (
              <NavLink key={key} to={def.to} title={collapsed ? def.label : undefined}
                className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                <Icon strokeWidth={1.5} />
                {!collapsed && <span>{def.label}</span>}
              </NavLink>
            )
          }
          // lock-pro ou bientot : on navigue quand même vers la route (ProGate/ComingSoon gère l'écran),
          // avec un marqueur visuel.
          const Badge = state === 'lock-pro' ? Lock : Sparkles
          return (
            <button key={key} onClick={() => navigate(def.to)} title={collapsed ? def.label : undefined}
              className="sidebar-nav-link sidebar-nav-link--muted">
              <Icon strokeWidth={1.5} />
              {!collapsed && <span style={{ flex: 1 }}>{def.label}</span>}
              {!collapsed && <Badge strokeWidth={1.5} className="h-3.5 w-3.5 opacity-70" />}
            </button>
          )
        })}
        {isAdmin && (
          <NavLink to="/admin" title={collapsed ? 'Admin' : undefined}
            className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
            <Shield strokeWidth={1.5} />
            {!collapsed && <span>Admin</span>}
          </NavLink>
        )}
      </nav>

      <div className="sidebar-activity-section">
        <SidebarActivity collapsed={collapsed} />
      </div>

      {collapsed && (
        <div className="sidebar-expand">
          <button onClick={() => setCollapsed(false)} className="sidebar-expand-btn"><PanelLeft strokeWidth={1.5} /></button>
        </div>
      )}
    </aside>
  )
}
