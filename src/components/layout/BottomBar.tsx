import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import {
  CalendarDays, CalendarClock, Compass, User, Heart,
  LayoutDashboard, Store, Users, type LucideIcon,
} from 'lucide-react'
import { mobilePrimaryFor, entryState, planForActor, NAV_DEFS } from '@/lib/navModel'
import { AccountSheet } from './AccountSheet'
import './BottomBar.css'

const ICONS: Record<string, LucideIcon> = {
  Compass, CalendarClock, Heart, LayoutDashboard, CalendarDays, Users, Store, User,
}

function initials(label: string): string {
  return label.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?'
}

export function BottomBar() {
  const { currentActor, currentActorRow, person } = useAuth()
  const navigate = useNavigate()
  const [sheetOpen, setSheetOpen] = useState(false)
  const plan = planForActor(currentActor, currentActorRow)
  const keys = mobilePrimaryFor(currentActor)   // 3 liens principaux
  const acctLabel = currentActor?.label ?? person?.display_name ?? 'Moi'
  // Avatar de l'acteur actif (entité ou personne) — comme le sélecteur desktop (EntitySwitcher).
  const acctAvatar = (currentActorRow as { avatar_url?: string | null } | null)?.avatar_url ?? null

  return (
    <>
      <nav className="bottom-bar">
        {keys.map(key => {
          const def = NAV_DEFS[key]
          const Icon = ICONS[def.icon] ?? Compass
          const state = entryState(key, plan)
          const label = def.shortLabel ?? def.label
          if (state === 'active') {
            return (
              <NavLink key={key} to={def.to} className={({ isActive }) => `bottom-bar-link ${isActive ? 'active' : ''}`}>
                <Icon strokeWidth={1.5} />
                <span>{label}</span>
              </NavLink>
            )
          }
          return (
            <button key={key} onClick={() => navigate(def.to)} className="bottom-bar-link bottom-bar-link--muted">
              <Icon strokeWidth={1.5} />
              <span>{label}</span>
            </button>
          )
        })}
        <button
          className={`bottom-bar-link bottom-bar-account${sheetOpen ? ' active' : ''}`}
          onClick={() => setSheetOpen(true)}
          aria-label="Compte et options"
        >
          <span className="bottom-bar-avatar">
            {acctAvatar ? <img src={acctAvatar} alt="" /> : initials(acctLabel)}
          </span>
          <span>Compte</span>
        </button>
      </nav>
      <AccountSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  )
}
