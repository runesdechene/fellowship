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
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const { profile } = useAuth()
  const nav = profile?.type === 'exposant' ? exposantNav : publicNav

  return (
    <aside
      className={`hidden md:flex flex-col bg-card transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[60px]' : 'w-72'
      }`}
    >
      {showNotifPanel ? (
        <NotificationSlidePanel onClose={() => setShowNotifPanel(false)} />
      ) : (
        <>
          {/* Header: logo + collapse toggle */}
          <div className="flex h-16 items-center justify-between px-4">
            <Link
              to={profile?.type === 'exposant' ? '/dashboard' : '/explorer'}
              className="flex items-center overflow-hidden"
            >
              {collapsed ? (
                <img src="/icon.png" alt="Fellowship" className="h-7 w-7 shrink-0" />
              ) : (
                <span className="text-lg font-extrabold text-primary tracking-tight">fellowship</span>
              )}
            </Link>
            {!collapsed && (
              <button
                onClick={() => setCollapsed(true)}
                className="rounded-xl p-2 text-muted-foreground hover:bg-card hover:text-foreground"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1 px-3 pt-2">
            {nav.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground/40 hover:bg-card hover:text-foreground'
                  } ${collapsed ? 'justify-center px-0' : ''}`
                }
              >
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </nav>

          {/* Activity section */}
          <div className="mt-2 pt-2">
            <div className="mx-3 mb-2 h-px bg-foreground/5" />
            <SidebarActivity collapsed={collapsed} onShowAll={() => setShowNotifPanel(true)} />
          </div>

          {/* Expand button (only visible when collapsed) */}
          {collapsed && (
            <div className="px-3 pb-3">
              <button
                onClick={() => setCollapsed(false)}
                className="flex w-full items-center justify-center rounded-xl p-2 text-muted-foreground hover:bg-card hover:text-foreground"
              >
                <PanelLeft className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          )}
        </>
      )}
    </aside>
  )
}
