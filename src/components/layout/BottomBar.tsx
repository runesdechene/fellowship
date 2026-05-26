import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import {
  CalendarDays, CalendarClock, Compass, User, Heart,
  LayoutDashboard, Store, Users, Shield, type LucideIcon,
} from 'lucide-react'
import { navItemsFor, entryState, planForActor, NAV_DEFS } from '@/lib/navModel'
import './BottomBar.css'

const ICONS: Record<string, LucideIcon> = {
  Compass, CalendarClock, Heart, LayoutDashboard, CalendarDays, Users, Store, User,
}

export function BottomBar() {
  const { currentActor, currentActorRow, isAdmin } = useAuth()
  const navigate = useNavigate()
  const plan = planForActor(currentActor, currentActorRow)
  // 4 premières entrées de la nav de l'acteur (mobile), + Admin si applicable.
  const keys = navItemsFor(currentActor).slice(0, 4)

  return (
    <nav className="bottom-bar">
      {keys.map(key => {
        const def = NAV_DEFS[key]
        const Icon = ICONS[def.icon] ?? Compass
        const state = entryState(key, plan)
        if (state === 'active') {
          return (
            <NavLink key={key} to={def.to} className={({ isActive }) => `bottom-bar-link ${isActive ? 'active' : ''}`}>
              <Icon strokeWidth={1.5} />
              <span>{def.label}</span>
            </NavLink>
          )
        }
        return (
          <button key={key} onClick={() => navigate(def.to)} className="bottom-bar-link bottom-bar-link--muted">
            <Icon strokeWidth={1.5} />
            <span>{def.label}</span>
          </button>
        )
      })}
      {isAdmin && (
        <NavLink to="/admin" className={({ isActive }) => `bottom-bar-link ${isActive ? 'active' : ''}`}>
          <Shield strokeWidth={1.5} />
          <span>Admin</span>
        </NavLink>
      )}
    </nav>
  )
}
