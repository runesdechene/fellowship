import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import {
  LayoutDashboard,
  CalendarDays,
  Compass,
  Bell,
  User,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Users,
} from 'lucide-react'

const exposantNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/calendrier', icon: CalendarDays, label: 'Calendrier' },
  { to: '/explorer', icon: Compass, label: 'Explorer' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/profil', icon: User, label: 'Profil' },
  { to: '/reglages', icon: Settings, label: 'Réglages' },
]

const publicNav = [
  { to: '/explorer', icon: Compass, label: 'Explorer' },
  { to: '/suivis', icon: Users, label: 'Mes suivis' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/profil', icon: User, label: 'Profil' },
  { to: '/reglages', icon: Settings, label: 'Réglages' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { profile } = useAuth()
  const nav = profile?.type === 'exposant' ? exposantNav : publicNav

  return (
    <aside
      className={`hidden md:flex flex-col bg-card shadow-[2px_0_40px_-10px_rgba(0,0,0,0.06)] transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[60px]' : 'w-60'
      }`}
    >
      {/* Header: logo + collapse toggle */}
      <div className="flex h-14 items-center justify-between px-3">
        <Link
          to={profile?.type === 'exposant' ? '/dashboard' : '/explorer'}
          className="flex items-center overflow-hidden"
        >
          {collapsed ? (
            <img src="/icon.png" alt="Fellowship" className="h-7 w-7 shrink-0" />
          ) : (
            <img src="/logo.png" alt="Fellowship" className="h-7 shrink-0" />
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-2 pt-2">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-lg px-2.5 py-2 text-[0.8125rem] font-medium ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              } ${collapsed ? 'justify-center px-0' : ''}`
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Expand button (only visible when collapsed) */}
      {collapsed && (
        <div className="px-2 pb-3">
          <button
            onClick={() => setCollapsed(false)}
            className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>
      )}
    </aside>
  )
}
