import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import {
  LayoutDashboard,
  Compass,
  Bell,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react'

const exposantNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
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
      className={`hidden md:flex flex-col border-r border-border bg-card transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      <Link to={profile?.type === 'exposant' ? '/dashboard' : '/explorer'} className="flex h-16 items-center justify-between px-3 border-b border-border hover:bg-muted/50 transition-colors">
        {collapsed ? (
          <img src="/icon.png" alt="Fellowship" className="h-8 w-8 mx-auto" />
        ) : (
          <img src="/logo.png" alt="Fellowship" className="h-8" />
        )}
      </Link>

      <nav className="flex-1 space-y-1 p-2">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              } ${collapsed ? 'justify-center' : ''}`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center border-t border-border p-3 text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  )
}
