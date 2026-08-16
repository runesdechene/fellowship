import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { CalendarDays, CalendarClock, Compass, User, Heart, LayoutDashboard, Store, Users, type LucideIcon } from 'lucide-react'
import { mobilePrimaryFor, entryState, planForActor, NAV_DEFS } from '@/lib/navModel'
import { AccountSheet } from './AccountSheet'
import './BottomBarV2.css'

const ICONS: Record<string, LucideIcon> = { Compass, CalendarClock, Heart, LayoutDashboard, CalendarDays, Users, Store, User }

function initials(label: string): string {
  return label.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?'
}

export function BottomBarV2() {
  const { currentActor, currentActorRow, person } = useAuth()
  const navigate = useNavigate()
  const [sheetOpen, setSheetOpen] = useState(false)
  const plan = planForActor(currentActor, currentActorRow)
  const keys = mobilePrimaryFor(currentActor)   // 3 liens principaux
  const acctLabel = currentActor?.label ?? person?.display_name ?? 'Moi'
  const acctAvatar = (currentActorRow as { avatar_url?: string | null } | null)?.avatar_url ?? null

  return (
    <>
      <nav className="bb2">
        {keys.map(key => {
          const def = NAV_DEFS[key]
          const Icon = ICONS[def.icon] ?? Compass
          const state = entryState(key, plan)
          const label = def.shortLabel ?? def.label
          if (state === 'active') {
            return (
              <NavLink key={key} to={def.to} className={({ isActive }) => `bb2-link${isActive ? ' bb2-on' : ''}`}>
                <Icon strokeWidth={1.5} />
                <span>{label}</span>
              </NavLink>
            )
          }
          return (
            <button key={key} onClick={() => navigate(def.to)} className="bb2-link bb2-muted">
              <Icon strokeWidth={1.5} />
              <span>{label}</span>
            </button>
          )
        })}
        <button
          className={`bb2-link bb2-account${sheetOpen ? ' bb2-on' : ''}`}
          onClick={() => setSheetOpen(true)}
          aria-label="Compte et options"
        >
          <span className="bb2-av">
            {acctAvatar ? <img src={acctAvatar} alt="" /> : initials(acctLabel)}
          </span>
          <span>Compte</span>
        </button>
      </nav>
      {/* AccountSheet est un composant PARTAGÉ qui porte les jetons de l'app.
          On ne le modifie pas ; le repeint sous .app2 (comme le theme-toggle
          et EntitySwitcher) reste À FAIRE — il est derrière un clic, hors
          scope de ce lot. Ne pas lire ce commentaire comme un travail fait. */}
      <AccountSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  )
}
