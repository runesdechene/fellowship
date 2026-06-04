import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import {
  Compass, CalendarClock, Heart, LayoutDashboard, CalendarDays, Users, Store, User, Settings,
  Shield, Check, LogOut, Lock, Sparkles, Map, type LucideIcon,
} from 'lucide-react'
import { mobileSecondaryFor, entryState, planForActor, vitrineHref, NAV_DEFS } from '@/lib/navModel'
import { ThemeToggle } from '@/components/theme-toggle'
import './AccountSheet.css'

const ICONS: Record<string, LucideIcon> = {
  Compass, CalendarClock, Heart, LayoutDashboard, CalendarDays, Users, Store, User, Settings, Map,
}

function initials(label: string): string {
  return label.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?'
}

/** Feuille (bottom sheet) ouverte depuis la tête de compte de la BottomBar mobile :
 *  switch d'acteur + liens secondaires + thème + déconnexion. Remplace la sidebar (absente sur mobile). */
export function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { person, entities, currentActor, currentActorRow, switchActor, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  const plan = planForActor(currentActor, currentActorRow)
  const secondary = mobileSecondaryFor(currentActor)
  const go = (to: string) => { navigate(to); onClose() }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="account-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-grab" aria-hidden="true" />

        {/* Sélecteur d'acteur */}
        <div className="sheet-label">Compte</div>
        {person && (
          <button
            className={'sheet-actor' + (currentActor?.kind === 'person' ? ' on' : '')}
            onClick={() => { switchActor(null); onClose() }}
          >
            <span className="sheet-av person"><User strokeWidth={2} /></span>
            <span className="sheet-actor-nm"><b>{person.display_name ?? 'Moi'}</b><span>Festivalier</span></span>
            {currentActor?.kind === 'person' && <Check className="sheet-check" strokeWidth={2.5} />}
          </button>
        )}
        {entities.map(e => (
          <button
            key={e.actor_id}
            className={'sheet-actor' + (currentActor?.id === e.actor_id ? ' on' : '')}
            onClick={() => { switchActor(e.actor_id); onClose() }}
          >
            <span className="sheet-av entity">{initials(e.brand_name)}</span>
            <span className="sheet-actor-nm"><b>{e.brand_name}</b><span>Exposant · {e.type}</span></span>
            {currentActor?.id === e.actor_id && <Check className="sheet-check" strokeWidth={2.5} />}
          </button>
        ))}

        {/* Liens secondaires (hors BottomBar) */}
        {secondary.length > 0 && <div className="sheet-divider" />}
        {secondary.map(key => {
          const def = NAV_DEFS[key]
          const Icon = ICONS[def.icon] ?? Compass
          const state = entryState(key, plan)
          const to = key === 'vitrine' ? vitrineHref((currentActorRow as { public_slug?: string | null })?.public_slug) : def.to
          return (
            <button key={key} className="sheet-item" onClick={() => go(to)}>
              <Icon strokeWidth={1.8} />
              <span className="sheet-item-lbl">{def.label}</span>
              {state === 'lock-pro' && <Lock className="sheet-badge" strokeWidth={2} />}
              {state === 'bientot' && <Sparkles className="sheet-badge" strokeWidth={2} />}
            </button>
          )
        })}
        {isAdmin && (
          <button className="sheet-item" onClick={() => go('/admin')}>
            <Shield strokeWidth={1.8} />
            <span className="sheet-item-lbl">Admin</span>
          </button>
        )}

        <div className="sheet-divider" />

        {/* Thème + déconnexion */}
        <div className="sheet-theme">
          <span>Thème clair / sombre</span>
          <ThemeToggle />
        </div>
        <button className="sheet-item sheet-logout" onClick={() => { onClose(); signOut() }}>
          <LogOut strokeWidth={1.8} />
          <span className="sheet-item-lbl">Déconnexion</span>
        </button>

        <div className="sheet-divider" />
        <div className="sheet-legal">
          <Link to="/legal/mentions-legales" onClick={onClose}>Mentions</Link>
          <span>·</span>
          <Link to="/legal/confidentialite" onClick={onClose}>Confidentialité</Link>
          <span>·</span>
          <Link to="/legal/cgv" onClick={onClose}>CGV</Link>
        </div>
      </div>
    </div>
  )
}
