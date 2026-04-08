import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Tag,
  Flag,
} from 'lucide-react'

const adminTabs = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/events', icon: CalendarDays, label: 'Événements' },
  { to: '/admin/users', icon: Users, label: 'Utilisateurs' },
  { to: '/admin/tags', icon: Tag, label: 'Tags' },
  { to: '/admin/reports', icon: Flag, label: 'Signalements' },
]

export function AdminLayout() {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-extrabold mb-4">Administration</h1>

      {/* Tabs sub-nav */}
      <nav className="flex gap-1 mb-6 overflow-x-auto border-b border-border pb-px">
        {adminTabs.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-card text-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            <Icon className="h-4 w-4" strokeWidth={1.5} />
            {label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  )
}
