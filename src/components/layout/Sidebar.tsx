import { useState, useEffect } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { CalendarDays, CalendarClock, Compass, User, Settings, Heart, LayoutDashboard, Store, Users, Shield, Lock, Sparkles, PanelLeftClose, PanelLeft, Map, Gift, type LucideIcon } from 'lucide-react'
import { navItemsFor, entryState, planForActor, vitrineHref, NAV_DEFS } from '@/lib/navModel'
import { useMyParticipations } from '@/hooks/use-participations'
import { useAdminPendingReportsCount } from '@/hooks/use-content-reports'
import { useCommunityBadge } from '@/hooks/use-community-badge'
import { EntitySwitcher } from './EntitySwitcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { SidebarNetworkActivity } from '@/components/community/SidebarNetworkActivity'
import './Sidebar.css'

const ICONS: Record<string, LucideIcon> = { Compass, CalendarClock, Heart, LayoutDashboard, CalendarDays, Users, Store, User, Settings, Map }

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  // Publie la largeur courante de la sidebar pour que le contenu (scroll document)
  // se décale via margin-left: var(--sidebar-w). Cf. plan scroll document.
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', collapsed ? '76px' : '262px')
  }, [collapsed])
  const { currentActor, currentActorRow, person, isAdmin } = useAuth()
  const navigate = useNavigate()
  const plan = planForActor(currentActor, currentActorRow)
  const keys = navItemsFor(currentActor)
  const isFreeEntity = currentActor?.kind === 'entity' && plan === 'free'
  const accountName = person?.display_name ?? 'Mon compte'

  // Compteur « Mes dates » → nombre d'événements à venir (start_date >= aujourd'hui)
  // dans les participations de l'acteur actif, hors refuse.
  const { participations } = useMyParticipations()
  const myDatesCount = participations.filter(p => {
    if (p.status === 'refuse') return false
    const start = p.events?.start_date
    return start != null && new Date(start) >= new Date(new Date().toDateString())
  }).length

  const communityBadge = useCommunityBadge()

  // Compteur de signalements pending pour le badge rouge sur l'entrée Admin.
  // Renvoie 0 si non-admin (RLS bloque la lecture côté DB anyway).
  const { count: pendingReportsCount } = useAdminPendingReportsCount()
  // Avatar perso : la personne (users) est la source de vérité (Settings y écrit).
  const personalAvatar = person?.avatar_url ?? null
  const personalInitial = (accountName !== 'Mon compte' ? accountName : 'M')[0]?.toUpperCase() ?? 'M'

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <Link to="/explorer" className="sidebar-logo">
          <img className="mark" src="/icon.png" alt="" />
          {!collapsed && <span className="sidebar-logo-text">Fellowship<span className="brand-dot">.</span></span>}
        </Link>
        {!collapsed && (
          <button className="sidebar-collapse-btn" onClick={() => setCollapsed(true)} aria-label="Replier"><PanelLeftClose strokeWidth={1.5} /></button>
        )}
      </div>

      <EntitySwitcher collapsed={collapsed} />

      <nav className="sidebar-nav">
        {keys.map(key => {
          const def = NAV_DEFS[key]
          const Icon = ICONS[def.icon] ?? Compass
          const state = entryState(key, plan)
          const to = key === 'vitrine' ? vitrineHref((currentActorRow as { public_slug?: string | null })?.public_slug) : def.to
          if (state === 'active') {
            const showCount = key === 'calendrier' && myDatesCount > 0
            const showCommBadge = key === 'communaute' && communityBadge > 0
            return (
              <NavLink key={key} to={to} title={collapsed ? def.label : undefined}
                className={({ isActive }) => (isActive ? 'active' : '')}>
                <Icon strokeWidth={2} />
                <span className="navlabel">{def.label}</span>
                {showCount && <span className="nav-count">{myDatesCount}</span>}
                {showCommBadge && <span className="navbadge">{communityBadge > 9 ? '9+' : communityBadge}</span>}
              </NavLink>
            )
          }
          const Badge = state === 'lock-pro' ? Lock : Sparkles
          return (
            <button key={key} className={`navlink ${state === 'lock-pro' ? 'locked' : ''}`} onClick={() => navigate(to)} title={collapsed ? def.label : undefined}>
              <Icon strokeWidth={2} />
              <span className="navlabel">{def.label}</span>
              <span className="lock"><Badge strokeWidth={2} /></span>
            </button>
          )
        })}
        {isAdmin && (
          <NavLink to="/admin" title={collapsed ? 'Admin' : undefined} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Shield strokeWidth={2} />
            <span className="navlabel">Admin</span>
            {pendingReportsCount > 0 && <span className="navbadge">{pendingReportsCount}</span>}
          </NavLink>
        )}
      </nav>

      {currentActor?.kind === 'entity' && (
        <NavLink
          to="/abonnement"
          className={({ isActive }) => `sidebar-referral${isActive ? ' active' : ''}`}
          title={collapsed ? 'Parrainage — 1 mois offert' : undefined}
        >
          <Gift strokeWidth={2} />
          <span className="navlabel">Parrainage</span>
          <span className="ref-pill">1 mois offert</span>
        </NavLink>
      )}

      {isFreeEntity && !collapsed && (
        <div className="sidebar-upsell">
          <b>Passe en Pro</b>
          <span>Saison complète, cockpit de pilotage &amp; fil de ta tribu.</span>
          <Link className="ubtn" to="/boutique">Découvrir Pro — dès 9,99 € HT/mois</Link>
        </div>
      )}

      <div className="sidebar-bottom">
        <SidebarNetworkActivity collapsed={collapsed} />
        <div className="side-foot">
          <Link to="/reglages" className="av" aria-label="Mon compte">
            {personalAvatar ? <img src={personalAvatar} alt="" /> : <span className="av-initial">{personalInitial}</span>}
          </Link>
          {!collapsed && <Link to="/reglages" className="nm"><b>{accountName}</b><span>Mon compte</span></Link>}
          <ThemeToggle />
        </div>
        {!collapsed && (
          <div className="sidebar-legal">
            <Link to="/legal/mentions-legales">Mentions</Link>
            <span className="sep">·</span>
            <Link to="/legal/confidentialite">Confidentialité</Link>
            <span className="sep">·</span>
            <Link to="/legal/cgv">CGV</Link>
          </div>
        )}
      </div>

      {collapsed && (
        <button className="sidebar-collapse-btn" style={{ marginTop: 8, alignSelf: 'center' }} onClick={() => setCollapsed(false)} aria-label="Déplier"><PanelLeft strokeWidth={1.5} /></button>
      )}
    </aside>
  )
}
