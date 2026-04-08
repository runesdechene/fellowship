import { NavLink } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import {
  CalendarDays,
  Compass,
  User,
  Bell,
  Users,
  Shield,
} from 'lucide-react'
import './BottomBar.css'

const exposantNav = [
  { to: '/explorer', icon: Compass, label: 'Explorer' },
  { to: '/calendrier', icon: CalendarDays, label: 'Calendrier' },
  { to: '/profil', icon: User, label: 'Profil' },
]

const publicNav = [
  { to: '/explorer', icon: Compass, label: 'Explorer' },
  { to: '/suivis', icon: Users, label: 'Suivis' },
  { to: '/notifications', icon: Bell, label: 'Notifs' },
  { to: '/profil', icon: User, label: 'Profil' },
]

export function BottomBar() {
  const { profile } = useAuth()
  const nav = profile?.type === 'exposant' ? exposantNav : publicNav
  const allNav = profile?.role === 'admin'
    ? [...nav, { to: '/admin', icon: Shield, label: 'Admin' }]
    : nav

  return (
    <nav className="bottom-bar">
      {allNav.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `bottom-bar-link ${isActive ? 'active' : ''}`
          }
        >
          <Icon strokeWidth={1.5} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
