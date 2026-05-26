# Sidebar « exacte maquette » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Refondre la sidebar de l'app pour coller exactement aux maquettes DA (logo `✦`, carte entité, nav avec locks/badges, carte upsell, fil d'activité « Activité du réseau », pied compte + toggle), en ne gardant de l'actuel que le replier/déplier.

**Architecture :** `Sidebar.tsx` orchestre des blocs restylés en classes maquette (CSS dans `Sidebar.css`) : logo+collapse, `<EntitySwitcher>` (=`.entity`+dropdown), `<nav>` (map `navModel`, locks via `entryState`, badge notifs), carte upsell (si entité free), `<SidebarActivity>` (=`.side-activity`), pied (`.side-foot` compte + `<ThemeToggle>`). On préserve les fonctionnalités (switch acteur, notifs, gating Pro, collapse).

**Tech Stack :** React 19, TS, Tailwind v4 (CSS-first), tokens DA. Référence visuelle : `docs/decisions/assets/communaute-fil.html` (+ `mes-dates.html` locks/upsell, `calendar-exposant.html` base).

**Mapping tokens maquette → DA :** `--cop`→`var(--copper)`, `--cop-d`→`var(--copper-d)`, `--amber`→`var(--amber)`, `--green`→`var(--forest)`, `--line`→`hsl(var(--border))`, `--surface`→`hsl(var(--secondary))`, `--surface2`→`hsl(var(--muted))`, `--text`→`hsl(var(--foreground))`, `--muted`→`hsl(var(--muted-foreground))`. Ink avatar `#1c1310` / `#2a1810` : littéraux conservés (ink sur fond brillant).

---

## File Structure
- **Modify** `src/components/layout/Sidebar.tsx` — orchestration, markup maquette.
- **Modify** `src/components/layout/Sidebar.css` — réécriture complète (classes maquette).
- **Modify** `src/components/layout/EntitySwitcher.tsx` — markup `.entity` + dropdown (classes CSS, plus de Tailwind inline).
- **Modify** `src/components/notifications/SidebarActivity.tsx` — markup `.side-activity`.
- **Remove import of** `src/components/notifications/SidebarActivity.css` (styles déplacés dans `Sidebar.css`).

---

## Task 1: `Sidebar.css` — réécriture sur les classes maquette

**Files:** Modify `src/components/layout/Sidebar.css`

- [ ] **Step 1: Remplacer le contenu de `src/components/layout/Sidebar.css` par** (classes maquette mappées tokens) :

```css
/* ── Sidebar (DA maquette) ───────────────────────────────────────────── */
.sidebar {
  display: none;
  flex-direction: column;
  width: 262px;
  height: 100vh;
  background: hsl(var(--card));
  border-right: 1px solid hsl(var(--border));
  padding: 18px 14px;
  transition: width 0.3s ease-in-out;
}
@media (min-width: 768px) { .sidebar { display: flex; } }
.sidebar.collapsed { width: 76px; }

/* Header / logo */
.sidebar-header { display: flex; align-items: center; justify-content: space-between; padding: 6px 8px 16px; }
.sidebar-logo { font-family: var(--font-heading); font-weight: 800; font-size: 20px; display: flex; align-items: center; gap: 9px; color: hsl(var(--foreground)); text-decoration: none; }
.sidebar-logo .mark { width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg, var(--copper), var(--amber)); display: flex; align-items: center; justify-content: center; color: #2a1810; font-size: 14px; flex-shrink: 0; }
.sidebar.collapsed .sidebar-logo-text { display: none; }
.sidebar-collapse-btn { background: none; border: none; color: hsl(var(--muted-foreground)); cursor: pointer; display: flex; padding: 4px; border-radius: 8px; }
.sidebar-collapse-btn:hover { background: hsl(var(--muted)); color: hsl(var(--foreground)); }
.sidebar-collapse-btn svg { width: 18px; height: 18px; }

/* Carte entité */
.entity { display: flex; align-items: center; gap: 10px; padding: 10px; border: 1px solid hsl(var(--border)); border-radius: 12px; background: hsl(var(--secondary)); margin-bottom: 16px; width: 100%; cursor: pointer; text-align: left; }
.entity:hover { background: hsl(var(--muted)); }
.entity .av { width: 34px; height: 34px; border-radius: 9px; background: linear-gradient(135deg, #6b4a2e, #3c2a1a); display: flex; align-items: center; justify-content: center; font-weight: 700; color: #ffd9a8; font-size: 14px; flex-shrink: 0; }
.entity .nm { flex: 1; min-width: 0; }
.entity .nm b { font-family: var(--font-heading); font-size: 14px; display: block; color: hsl(var(--foreground)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.entity .nm span { font-size: 11px; color: hsl(var(--muted-foreground)); }
.entity .chev { color: hsl(var(--muted-foreground)); flex-shrink: 0; }
.sidebar.collapsed .entity .nm, .sidebar.collapsed .entity .chev { display: none; }
.entity-menu { position: relative; }
.entity-dropdown { position: absolute; left: 0; right: 0; z-index: 50; margin-top: 4px; overflow: hidden; border-radius: 12px; border: 1px solid hsl(var(--border)); background: hsl(var(--card)); box-shadow: 0 12px 30px rgba(0,0,0,.3); }
.entity-dropdown button { display: flex; width: 100%; align-items: center; gap: 8px; padding: 10px 12px; text-align: left; font-size: 13px; color: hsl(var(--foreground)); background: none; border: none; cursor: pointer; }
.entity-dropdown button:hover { background: hsl(var(--muted)); }
.entity-dropdown svg { width: 16px; height: 16px; flex-shrink: 0; }

/* Nav */
.sidebar-nav { display: flex; flex-direction: column; gap: 3px; }
.sidebar-nav a, .sidebar-nav button.navlink { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; color: hsl(var(--muted-foreground)); text-decoration: none; font-weight: 500; font-size: 14px; font-family: var(--font-body); background: none; border: none; cursor: pointer; width: 100%; text-align: left; }
.sidebar-nav a svg, .sidebar-nav button.navlink svg { width: 18px; height: 18px; stroke: currentColor; stroke-width: 2; fill: none; flex-shrink: 0; }
.sidebar-nav a:hover, .sidebar-nav button.navlink:hover { background: hsl(var(--secondary)); color: hsl(var(--foreground)); }
.sidebar-nav a.active { background: color-mix(in srgb, var(--copper) 16%, transparent); color: var(--amber); }
.light .sidebar-nav a.active { color: hsl(22 78% 42%); }
.sidebar-nav .navlabel { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sidebar.collapsed .sidebar-nav .navlabel, .sidebar.collapsed .navbadge, .sidebar.collapsed .lock { display: none; }
.navbadge { margin-left: auto; background: #e5484d; color: #fff; font-size: 10.5px; font-weight: 800; min-width: 19px; height: 19px; border-radius: 99px; display: flex; align-items: center; justify-content: center; padding: 0 5px; }
.navlink.locked { opacity: .5; }
.navlink.locked:hover { opacity: .8; background: hsl(var(--secondary)); }
.navlink.locked .lock { margin-left: auto; }
.navlink.locked .lock svg { width: 14px; height: 14px; stroke-width: 2.2; }

/* Upsell (entité free) */
.sidebar-upsell { margin-top: 10px; background: linear-gradient(150deg, color-mix(in srgb, var(--copper) 22%, hsl(var(--secondary))), hsl(var(--secondary))); border: 1px solid color-mix(in srgb, var(--copper) 32%, transparent); border-radius: 13px; padding: 13px; }
.sidebar-upsell b { font-family: var(--font-heading); font-size: 13px; color: hsl(var(--foreground)); display: block; margin-bottom: 3px; }
.sidebar-upsell span { font-size: 11.5px; color: hsl(var(--muted-foreground)); display: block; margin-bottom: 10px; line-height: 1.4; }
.sidebar-upsell .ubtn { display: block; text-align: center; background: linear-gradient(135deg, var(--copper), var(--copper-d)); color: #fff; font-weight: 700; font-size: 12.5px; padding: 9px; border-radius: 9px; text-decoration: none; }
.sidebar.collapsed .sidebar-upsell { display: none; }

/* Fil d'activité */
.side-activity { margin-top: auto; padding-top: 14px; border-top: 1px solid hsl(var(--border)); display: flex; flex-direction: column; }
.sa-head { font-size: 10.5px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; color: hsl(var(--muted-foreground)); display: flex; align-items: center; gap: 7px; padding: 0 6px 10px; }
.sa-head .live { width: 6px; height: 6px; border-radius: 50%; background: var(--forest); box-shadow: 0 0 7px var(--forest); }
.sa-item { display: flex; align-items: center; gap: 9px; padding: 7px 6px; border-radius: 9px; text-decoration: none; cursor: pointer; }
.sa-item:hover { background: hsl(var(--secondary)); }
.sa-item .sav { width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #1c1310; }
.sa-item .sat { font-size: 12px; color: hsl(var(--muted-foreground)); line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sa-item .sat b { color: hsl(var(--foreground)); font-weight: 600; }
.sa-all { font-size: 12px; color: var(--amber); font-weight: 600; padding: 8px 6px 0; cursor: pointer; text-decoration: none; }
.sa-bell { display: flex; align-items: center; justify-content: center; padding: 10px; color: hsl(var(--muted-foreground)); }
.sidebar.collapsed .side-activity { align-items: center; }
.sidebar.collapsed .sa-head span:not(.live), .sidebar.collapsed .sa-item .sat, .sidebar.collapsed .sa-all { display: none; }

/* Pied compte + toggle */
.side-foot { border-top: 1px solid hsl(var(--border)); padding-top: 12px; margin-top: 12px; display: flex; align-items: center; gap: 10px; }
.side-foot .av { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--forest), hsl(92 40% 46%)); flex-shrink: 0; overflow: hidden; }
.side-foot .av img { width: 100%; height: 100%; object-fit: cover; }
.side-foot .nm { flex: 1; min-width: 0; text-decoration: none; }
.side-foot .nm b { font-size: 13px; font-family: var(--font-heading); color: hsl(var(--foreground)); display: block; }
.side-foot .nm span { font-size: 11px; color: hsl(var(--muted-foreground)); display: block; }
.sidebar.collapsed .side-foot { justify-content: center; }
.sidebar.collapsed .side-foot .nm { display: none; }
```

- [ ] **Step 2: Build + lint** → vert (le markup arrive aux tasks suivantes ; le CSS seul ne casse rien). Run: `pnpm build && pnpm lint`

- [ ] **Step 3: Commit.**
```bash
git add src/components/layout/Sidebar.css
git commit -m "feat(sidebar): rewrite Sidebar.css on DA maquette classes (logo/entity/nav/upsell/activity/foot)"
```

---

## Task 2: `EntitySwitcher.tsx` — markup `.entity` + dropdown

**Files:** Modify `src/components/layout/EntitySwitcher.tsx`

- [ ] **Step 1: Réécrire `EntitySwitcher.tsx`** en classes maquette (garder la logique `switchActor`/`open`) :

```tsx
import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { ChevronDown, Check } from 'lucide-react'

function initials(label: string): string {
  return label.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?'
}

export function EntitySwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { person, entities, currentActor, switchActor } = useAuth()
  const [open, setOpen] = useState(false)

  const label = currentActor?.kind === 'entity'
    ? entities.find(e => e.actor_id === currentActor.id)?.brand_name ?? 'Entité'
    : person?.display_name ?? 'Moi'
  const sub = currentActor?.kind === 'entity' ? 'Exposant · toi' : 'Festivalier'

  if (!person || entities.length === 0) {
    return (
      <div className="entity" style={{ cursor: 'default' }}>
        <div className="av">{initials(label)}</div>
        {!collapsed && <div className="nm"><b>{label}</b><span>{sub}</span></div>}
      </div>
    )
  }

  return (
    <div className="entity-menu">
      <button className="entity" onClick={() => setOpen(o => !o)}>
        <div className="av">{initials(label)}</div>
        {!collapsed && <div className="nm"><b>{label}</b><span>{sub}</span></div>}
        {!collapsed && <ChevronDown className="chev" strokeWidth={1.5} width={16} height={16} />}
      </button>
      {open && !collapsed && (
        <div className="entity-dropdown">
          <button onClick={() => { switchActor(null); setOpen(false) }}>
            <span style={{ flex: 1 }}>{person.display_name ?? 'Moi'} · Festivalier</span>
            {currentActor?.kind === 'person' && <Check strokeWidth={2} />}
          </button>
          {entities.map(e => (
            <button key={e.actor_id} onClick={() => { switchActor(e.actor_id); setOpen(false) }}>
              <span style={{ flex: 1 }}>{e.brand_name} · {e.type}</span>
              {currentActor?.id === e.actor_id && <Check strokeWidth={2} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build + lint** → vert.
- [ ] **Step 3: Commit.**
```bash
git add src/components/layout/EntitySwitcher.tsx
git commit -m "feat(sidebar): EntitySwitcher in maquette .entity markup (keeps actor switch)"
```

---

## Task 3: `SidebarActivity.tsx` — markup `.side-activity`

**Files:** Modify `src/components/notifications/SidebarActivity.tsx`

- [ ] **Step 1: D'ABORD lire** `src/components/notifications/SidebarActivity.tsx`, `src/components/notifications/NotificationItem.tsx` et `src/hooks/use-notifications.ts` pour connaître la forme réelle d'une `activity` (champs : id, acteur/nom, type, libellé, lu/non-lu) et la fonction `markAsRead`.

- [ ] **Step 2: Réécrire le rendu** en classes maquette. Garder `useNotifications`, `recent = activities.slice(0,3)`, le mode `collapsed`. Composer le texte de chaque item **en JSX** (jamais d'injection HTML brute) : `<b>{nom}</b> <action courte>`. Avatar `.sav` = initiale de l'acteur, fond via une petite palette (hash du nom). Retirer l'import de `./SidebarActivity.css`.

```tsx
import { Link } from 'react-router-dom'
import { Activity } from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import { NotificationItem } from './NotificationItem' // si encore utilisé ailleurs ; sinon retirer

const SA_COLORS = ['#3d9970', '#f0a060', '#6c5ce7', '#e84393', '#f39c12']
function saColor(name: string): string {
  let h = 0; for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return SA_COLORS[Math.abs(h) % SA_COLORS.length]
}

export function SidebarActivity({ collapsed }: { collapsed: boolean }) {
  const { activities, markAsRead } = useNotifications()
  const recent = activities.slice(0, 3)

  if (collapsed) {
    return <Link to="/notifications" className="sa-bell" aria-label="Activité"><Activity strokeWidth={1.5} /></Link>
  }
  if (recent.length === 0) return null

  return (
    <div className="side-activity">
      <div className="sa-head"><span className="live" /> <span>Activité du réseau</span></div>
      {recent.map(a => {
        // ADAPTER aux champs réels lus en Step 1 : nom de l'acteur + action courte.
        const name = /* ex. */ (a as { actor_name?: string }).actor_name ?? 'Quelqu’un'
        const action = /* ex. */ ''
        return (
          <Link key={a.id} to="/notifications" className="sa-item" onClick={() => markAsRead?.(a.id)}>
            <span className="sav" style={{ background: saColor(name), color: '#fff' }}>{name[0]?.toUpperCase() ?? '?'}</span>
            <span className="sat"><b>{name}</b> {action}</span>
          </Link>
        )
      })}
      <Link to="/notifications" className="sa-all">Tout voir →</Link>
    </div>
  )
}
```

> L'agent remplace les `/* ex. */` par les vrais champs (vus en Step 1). Garder une **action courte** d'une ligne (ex. « a noté Pérouges », « va à Crémieu »). Si `NotificationItem` n'est plus utilisé, retirer son import.

- [ ] **Step 3: Build + lint** → vert.
- [ ] **Step 4: Commit.**
```bash
git add src/components/notifications/SidebarActivity.tsx
git commit -m "feat(sidebar): SidebarActivity in maquette .side-activity markup"
```

---

## Task 4: `Sidebar.tsx` — orchestration maquette

**Files:** Modify `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Réécrire `Sidebar.tsx`** :

```tsx
import { useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { CalendarDays, CalendarClock, Compass, User, Settings, Heart, LayoutDashboard, Store, Users, Shield, Lock, Sparkles, PanelLeftClose, PanelLeft, type LucideIcon } from 'lucide-react'
import { navItemsFor, entryState, planForActor, NAV_DEFS } from '@/lib/navModel'
import { EntitySwitcher } from './EntitySwitcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { SidebarActivity } from '@/components/notifications/SidebarActivity'
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
          <span className="mark">✦</span>
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
          if (state === 'active') {
            return (
              <NavLink key={key} to={def.to} title={collapsed ? def.label : undefined}
                className={({ isActive }) => (isActive ? 'active' : '')}>
                <Icon strokeWidth={2} />
                <span className="navlabel">{def.label}</span>
              </NavLink>
            )
          }
          const Badge = state === 'lock-pro' ? Lock : Sparkles
          return (
            <button key={key} className={`navlink ${state === 'lock-pro' ? 'locked' : ''}`} onClick={() => navigate(def.to)} title={collapsed ? def.label : undefined}>
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

      <SidebarActivity collapsed={collapsed} />

      <div className="side-foot">
        <Link to="/reglages" className="av" aria-label="Mon compte" />
        {!collapsed && <Link to="/reglages" className="nm"><b>{accountName}</b><span>Mon compte</span></Link>}
        <ThemeToggle />
      </div>

      {collapsed && (
        <button className="sidebar-collapse-btn" style={{ marginTop: 8, alignSelf: 'center' }} onClick={() => setCollapsed(false)} aria-label="Déplier"><PanelLeft strokeWidth={1.5} /></button>
      )}
    </aside>
  )
}
```

> `lock-pro` → cadenas ; `bientot` (non construit) → icône `Sparkles`, clic = route (ComingSoon gère). `.navbadge` (compteur notifs) **optionnel** : si câblé, lire le nombre de notifs non lues via `useNotifications` et l'ajouter sur l'item Communauté quand `n>0` ; sinon l'omettre (pas de chiffre en dur). Ne PAS réintroduire l'ancien `.sidebar-activity-section` / `.sidebar-footer`.

- [ ] **Step 2: Build + lint** → vert.
- [ ] **Step 3: Commit.**
```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(sidebar): orchestrate maquette layout (logo/entity/nav/upsell/activity/foot + collapse)"
```

---

## Task 5: Vérification + bump

- [ ] **Step 1: Build + lint + tests** verts. Run: `pnpm build && pnpm lint && pnpm vitest run`
- [ ] **Step 2: Vérification visuelle** (local, Docker, `pnpm dev`) en **nuit + jour** et **plié + déplié**, en **entité Pro** (calendrier débloqué) puis **entité free** (locks + upsell) : logo `✦`, carte entité + switch, nav (actif ambre, locks cadenas), upsell si free, fil « Activité du réseau » en bas, pied « Mon compte » + toggle. Comparer à `communaute-fil.html` / `mes-dates.html`.
- [ ] **Step 3: Grep cohérence.** Run: `pnpm exec grep -nE "rgba\(61, 48, 40|: var\(--(foreground|card|muted|border|secondary)\)" src/components/layout/Sidebar.css` → attendu : aucun token-triplet nu (tout en `hsl(var(--…))`).
- [ ] **Step 4: Bump version + commit + push.** `package.json` 0.7.39 → 0.7.40.
```bash
git add -A
git commit -m "chore(sidebar): bump version after maquette sidebar redesign"
git push
```

---

## Self-Review
**Couverture spec :** logo ✦ (T4) · carte entité + switch (T2) · nav locks/badge (T1+T4) · upsell entité-free (T1+T4) · fil activité (T1+T3) · pied compte+toggle (T1+T4) · collapse conservé (T4) · dual thème (T1). ✓
**Placeholders :** CSS (T1) + markup Sidebar/EntitySwitcher (T2/T4) complets ; T3 exige une lecture préalable des champs `useNotifications` avant d'écrire le libellé (instruction explicite + squelette fourni). 
**Cohérence :** classes CSS (T1) = classes markup (T2/T3/T4). `planForActor`/`entryState`/`navItemsFor`/`ThemeToggle` réutilisés. 
**Risques :** wrapper les triplets ; tester tous les blocs **pliés** ; festivalier (pas de dropdown/upsell) ; ne pas casser la `BottomBar` ; `.navbadge` optionnel (pas de chiffre en dur).
```
