import { useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { CalendarDays, CalendarClock, Compass, User, Settings, Heart, LayoutDashboard, Store, Users, Shield, Lock, Sparkles, PanelLeftClose, PanelLeft, type LucideIcon } from 'lucide-react'
import { navItemsFor, entryState, planForActor, vitrineHref, NAV_DEFS } from '@/lib/navModel'
import { EntitySwitcher } from './EntitySwitcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { SidebarNetworkActivity } from '@/components/community/SidebarNetworkActivity'
import './Sidebar.css'

const ICONS: Record<string, LucideIcon> = { Compass, CalendarClock, Heart, LayoutDashboard, CalendarDays, Users, Store, User, Settings }

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { currentActor, currentActorRow, person, isAdmin } = useAuth()
  const navigate = useNavigate()
  const plan = planForActor(currentActor, currentActorRow)
  const keys = navItemsFor(currentActor)
  const isFreeEntity = currentActor?.kind === 'entity' && plan === 'free'
  const accountName = person?.display_name ?? 'Mon compte'

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <Link to="/explorer" className="sidebar-logo">
          <img className="mark" src="/icon.png" alt="" />
          {!collapsed && <span className="sidebar-logo-text">Fellowship</span>}
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
            return (
              <NavLink key={key} to={to} title={collapsed ? def.label : undefined}
                className={({ isActive }) => (isActive ? 'active' : '')}>
                <Icon strokeWidth={2} />
                <span className="navlabel">{def.label}</span>
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
          </NavLink>
        )}
      </nav>

      {isFreeEntity && !collapsed && (
        <div className="sidebar-upsell">
          <b>Passe en Pro</b>
          <span>Saison complète, cockpit de pilotage &amp; fil de ta tribu.</span>
          <Link className="ubtn" to="/reglages">Découvrir Pro — dès 9,99 € HT/mois</Link>
        </div>
      )}

      <div className="sidebar-bottom">
        <SidebarNetworkActivity collapsed={collapsed} />
        <div className="side-foot">
          <Link to="/reglages" className="av" aria-label="Mon compte" />
          {!collapsed && <Link to="/reglages" className="nm"><b>{accountName}</b><span>Mon compte</span></Link>}
          <ThemeToggle />
        </div>
      </div>

      {collapsed && (
        <button className="sidebar-collapse-btn" style={{ marginTop: 8, alignSelf: 'center' }} onClick={() => setCollapsed(false)} aria-label="Déplier"><PanelLeft strokeWidth={1.5} /></button>
      )}
    </aside>
  )
}
