import { useState, useEffect } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { CalendarDays, CalendarClock, Compass, User, Settings, Heart, LayoutDashboard, Store, Users, Shield, Lock, Sparkles, PanelLeftClose, PanelLeft, Map, type LucideIcon } from 'lucide-react'
import { navItemsFor, entryState, planForActor, vitrineHref, NAV_DEFS } from '@/lib/navModel'
import { useMyParticipations } from '@/hooks/use-participations'
import { useAdminPendingReportsCount } from '@/hooks/use-content-reports'
import { useCommunityBadge } from '@/hooks/use-community-badge'
import { EntitySwitcher } from './EntitySwitcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { V2Toggle } from './V2Toggle'
import './SidebarV2.css'

const ICONS: Record<string, LucideIcon> = { Compass, CalendarClock, Heart, LayoutDashboard, CalendarDays, Users, Store, User, Settings, Map }

export function SidebarV2() {
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    // 262px = largeur exacte du rail V1 (Sidebar.css) : même largeur des deux
    // côtés de l'interrupteur, pas de saut de mise en page en basculant.
    document.documentElement.style.setProperty('--sidebar2-w', collapsed ? '76px' : '262px')
  }, [collapsed])

  const { currentActor, currentActorRow, person, isAdmin } = useAuth()
  const navigate = useNavigate()
  const plan = planForActor(currentActor, currentActorRow)
  const keys = navItemsFor(currentActor)
  const accountName = person?.display_name ?? 'Mon compte'

  const { participations } = useMyParticipations()
  const myDatesCount = participations.filter(p => {
    if (p.status === 'refuse') return false
    const start = p.events?.start_date
    return start != null && new Date(start) >= new Date(new Date().toDateString())
  }).length

  const communityBadge = useCommunityBadge()
  const { count: pendingReportsCount } = useAdminPendingReportsCount()
  const personalAvatar = person?.avatar_url ?? null
  const personalInitial = (accountName !== 'Mon compte' ? accountName : 'M')[0]?.toUpperCase() ?? 'M'

  return (
    <aside className={`sd2 ${collapsed ? 'sd2-collapsed' : ''}`}>
      <div className="sd2-head">
        <Link to="/explorer" className="sd2-brand">
          {/* Pictogramme SEUL, affiché entier : hauteur fixée, largeur libre.
              Jamais de cadre, jamais de recadrage, JAMAIS de border-radius. */}
          <img className="sd2-mark" src="/icon.png" alt="" />
          {!collapsed && <span className="sd2-name">Fellowship<span className="sd2-dot">.</span></span>}
        </Link>
        <button className="sd2-fold" onClick={() => setCollapsed(c => !c)} aria-label={collapsed ? 'Déplier' : 'Replier'}>
          {collapsed ? <PanelLeft strokeWidth={1.5} /> : <PanelLeftClose strokeWidth={1.5} />}
        </button>
      </div>

      <EntitySwitcher collapsed={collapsed} />

      <nav className="sd2-nav">
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
                className={({ isActive }) => `sd2-link${isActive ? ' sd2-on' : ''}`}>
                <Icon strokeWidth={2} />
                <span className="sd2-lab">{def.label}</span>
                {showCount && <span className="sd2-count">{myDatesCount}</span>}
                {showCommBadge && <span className="sd2-badge">{communityBadge > 9 ? '9+' : communityBadge}</span>}
              </NavLink>
            )
          }
          const Badge = state === 'lock-pro' ? Lock : Sparkles
          // Le dim ne s'applique qu'au verrou Pro (V1 : .navlink.locked ne couvre que
          // ce cas) — « bientôt » reste à pleine intensité, seul son badge le distingue.
          return (
            <button key={key} className={`sd2-link${state === 'lock-pro' ? ' sd2-locked' : ''}`} onClick={() => navigate(to)} title={collapsed ? def.label : undefined}>
              <Icon strokeWidth={2} />
              <span className="sd2-lab">{def.label}</span>
              <span className="sd2-lock"><Badge strokeWidth={2} /></span>
            </button>
          )
        })}
        {isAdmin && (
          <NavLink to="/admin" title={collapsed ? 'Admin' : undefined}
            className={({ isActive }) => `sd2-link${isActive ? ' sd2-on' : ''}`}>
            <Shield strokeWidth={2} />
            <span className="sd2-lab">Admin</span>
            {pendingReportsCount > 0 && <span className="sd2-badge">{pendingReportsCount}</span>}
          </NavLink>
        )}
      </nav>

      <div className="sd2-foot">
        <Link to="/reglages" className="sd2-av" aria-label="Mon compte">
          {personalAvatar ? <img src={personalAvatar} alt="" /> : <span>{personalInitial}</span>}
        </Link>
        {!collapsed && (
          <Link to="/reglages" className="sd2-who">
            <b>{accountName}</b>
            <span>Mon compte</span>
          </Link>
        )}
        <ThemeToggle />
        <V2Toggle />
      </div>
    </aside>
  )
}
