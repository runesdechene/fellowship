import { NavLink } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import {
  CalendarDays,
  Compass,
  User,
  Bell,
  Users,
} from 'lucide-react'

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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex bg-card/90 backdrop-blur-xl md:hidden">
      {nav.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-semibold tracking-wide uppercase ${
              isActive ? 'text-primary' : 'text-muted-foreground'
            }`
          }
        >
          <Icon className="h-5 w-5" strokeWidth={1.5} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
