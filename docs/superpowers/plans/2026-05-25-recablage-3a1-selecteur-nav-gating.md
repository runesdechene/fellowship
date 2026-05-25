# 3A.1 — Sélecteur + nav cible + gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser la nav cible pilotée par l'acteur courant (sélecteur d'entité, cadenas Pro, placeholders « Bientôt »), dans le style actuel de l'app.

**Architecture:** Logique de nav pure et testable (`src/lib/navModel.ts`) : items par type d'acteur + état d'entrée (active/lock-pro/bientot) + validité de route. La Sidebar/BottomBar consomment `currentActor` + `person.plan` (via `useAuth`) et un registre d'items. Composants `EntitySwitcher`, `ComingSoon`, `ProGate`. Au switch d'acteur, redirection `/explorer` si la route courante est invalide.

**Tech Stack:** React 19 + TS, React Router v7, `@/lib/auth` (currentActor/person/entities/switchActor), lucide-react, Vitest. Branche `feat/accounts-foundation`. **NE PAS git push.**

**Spec :** [`../specs/2026-05-25-recablage-coeur-3a-design.md`](../specs/2026-05-25-recablage-coeur-3a-design.md) (Partie 1).

> **Style :** style actuel de l'app (clair chaud). Pas de DA « Nuit de Festival » (refonte globale séparée). Post-commit hook imprime `[graphify]` — normal. Ne pas `git push`.

---

## File Structure
**Créer :** `src/lib/navModel.ts` (+ `src/lib/navModel.test.ts`), `src/components/layout/EntitySwitcher.tsx`, `src/components/layout/ComingSoon.tsx`, `src/components/layout/ProGate.tsx`.
**Modifier :** `src/components/layout/Sidebar.tsx`, `src/components/layout/BottomBar.tsx`, `src/App.tsx` (routes + redirect-on-switch).

---

## Task 1 : `navModel.ts` pur + tests (TDD)

**Files :** Create `src/lib/navModel.ts`, `src/lib/navModel.test.ts`

- [ ] **Step 1 : Tests qui échouent**

```typescript
// src/lib/navModel.test.ts
import { describe, it, expect } from 'vitest'
import { navItemsFor, entryState, isRouteValidFor, NAV_DEFS, type NavKey } from './navModel'

const person = { kind: 'person' as const, entityType: null }
const exposant = { kind: 'entity' as const, entityType: 'exposant' as const }

describe('navItemsFor', () => {
  it('personne → festivalier', () => expect(navItemsFor(person)).toEqual(['explorer','mes-dates','mes-createurs','profil','reglages']))
  it('entité exposant → cockpit', () => expect(navItemsFor(exposant)).toEqual(['explorer','dashboard','calendrier','communaute','vitrine','reglages']))
  it('null → explorer seul', () => expect(navItemsFor(null)).toEqual(['explorer']))
})

describe('entryState', () => {
  it('item Pro + plan free → lock-pro', () => expect(entryState('calendrier','free')).toBe('lock-pro'))
  it('item Pro + plan pro + construit → active', () => expect(entryState('calendrier','pro')).toBe('active'))
  it('item Pro + plan pro + non construit → bientot', () => expect(entryState('communaute','pro')).toBe('bientot'))
  it('item Pro + plan free (même non construit) → lock-pro', () => expect(entryState('communaute','free')).toBe('lock-pro'))
  it('item gratuit non construit → bientot', () => expect(entryState('mes-dates','free')).toBe('bientot'))
  it('item gratuit construit → active', () => expect(entryState('explorer','free')).toBe('active'))
})

describe('isRouteValidFor', () => {
  it('calendrier valide pour exposant', () => expect(isRouteValidFor('/calendrier', exposant)).toBe(true))
  it('calendrier invalide pour personne', () => expect(isRouteValidFor('/calendrier', person)).toBe(false))
  it('mes-dates valide pour personne', () => expect(isRouteValidFor('/mes-dates', person)).toBe(true))
  it('explorer valide pour les deux', () => {
    expect(isRouteValidFor('/explorer', person)).toBe(true)
    expect(isRouteValidFor('/explorer', exposant)).toBe(true)
  })
  it('route partagée (event) toujours valide', () => expect(isRouteValidFor('/evenement/abc', person)).toBe(true))
})

it('NAV_DEFS couvre toutes les clés utilisées', () => {
  const keys: NavKey[] = ['explorer','mes-dates','mes-createurs','profil','reglages','dashboard','calendrier','communaute','vitrine']
  keys.forEach(k => expect(NAV_DEFS[k]).toBeTruthy())
})
```

- [ ] **Step 2 : Lancer → FAIL** : `pnpm test src/lib/navModel.test.ts`

- [ ] **Step 3 : Implémenter**

```typescript
// src/lib/navModel.ts
export type NavKey = 'explorer' | 'mes-dates' | 'mes-createurs' | 'profil' | 'reglages' | 'dashboard' | 'calendrier' | 'communaute' | 'vitrine'
export type EntryState = 'active' | 'lock-pro' | 'bientot'
export type Plan = 'free' | 'pro'

export interface NavDef {
  key: NavKey
  to: string
  label: string
  icon: string   // nom d'icône lucide (mappé en composant côté UI)
  pro: boolean   // surface Pro (cadenas si plan free)
  built: boolean // page réellement construite
}

export const NAV_DEFS: Record<NavKey, NavDef> = {
  explorer:        { key: 'explorer',        to: '/explorer',        label: 'Explorer',       icon: 'Compass',         pro: false, built: true },
  'mes-dates':     { key: 'mes-dates',       to: '/mes-dates',       label: 'Mes dates',      icon: 'CalendarClock',   pro: false, built: false },
  'mes-createurs': { key: 'mes-createurs',   to: '/mes-createurs',   label: 'Mes créateurs',  icon: 'Heart',           pro: false, built: false },
  dashboard:       { key: 'dashboard',       to: '/tableau-de-bord', label: 'Tableau de bord',icon: 'LayoutDashboard', pro: true,  built: false },
  calendrier:      { key: 'calendrier',      to: '/calendrier',      label: 'Calendrier',     icon: 'CalendarDays',    pro: true,  built: true },
  communaute:      { key: 'communaute',      to: '/communaute',      label: 'Communauté',     icon: 'Users',           pro: true,  built: false },
  vitrine:         { key: 'vitrine',         to: '/profil',          label: 'Ma vitrine',     icon: 'Store',           pro: false, built: true },
  profil:          { key: 'profil',          to: '/profil',          label: 'Profil',         icon: 'User',            pro: false, built: true },
  reglages:        { key: 'reglages',        to: '/reglages',        label: 'Réglages',       icon: 'Settings',        pro: false, built: true },
}

const PERSON_NAV: NavKey[] = ['explorer', 'mes-dates', 'mes-createurs', 'profil', 'reglages']
const EXPOSANT_NAV: NavKey[] = ['explorer', 'dashboard', 'calendrier', 'communaute', 'vitrine', 'reglages']

/** Items de nav selon le type d'acteur. (Toute entité = nav exposant en V1 ; festival/orga = V2.) */
export function navItemsFor(actor: { kind: string; entityType: string | null } | null): NavKey[] {
  if (!actor) return ['explorer']
  return actor.kind === 'entity' ? EXPOSANT_NAV : PERSON_NAV
}

/** État d'une entrée : cadenas Pro prioritaire, puis « Bientôt » si non construite, sinon active. */
export function entryState(key: NavKey, plan: Plan): EntryState {
  const def = NAV_DEFS[key]
  if (def.pro && plan !== 'pro') return 'lock-pro'
  if (!def.built) return 'bientot'
  return 'active'
}

const SHARED_PREFIXES = ['/explorer', '/profil', '/reglages', '/evenement', '/notifications']

/** Une route est valide pour un acteur si elle est dans sa nav ou si c'est une surface partagée. */
export function isRouteValidFor(path: string, actor: { kind: string; entityType: string | null } | null): boolean {
  const navPaths = navItemsFor(actor).map(k => NAV_DEFS[k].to)
  return navPaths.some(p => path.startsWith(p)) || SHARED_PREFIXES.some(p => path.startsWith(p))
}
```

- [ ] **Step 4 : Lancer → PASS** : `pnpm test src/lib/navModel.test.ts`
- [ ] **Step 5 : Commit**

```bash
git add src/lib/navModel.ts src/lib/navModel.test.ts
git commit -m "feat(nav): pure nav model (items by actor, gating state, route validity) + tests"
```

---

## Task 2 : Composants `ComingSoon` + `ProGate` + routes

**Files :** Create `src/components/layout/ComingSoon.tsx`, `src/components/layout/ProGate.tsx` ; Modify `src/App.tsx`

- [ ] **Step 1 : `ComingSoon.tsx`**

```tsx
import { Sparkles } from 'lucide-react'

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles strokeWidth={1.5} className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <p className="max-w-sm text-muted-foreground">Bientôt disponible. On y travaille — cette section arrive très vite.</p>
    </div>
  )
}
```

- [ ] **Step 2 : `ProGate.tsx`** (cadenas si plan free)

```tsx
import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useAuth } from '@/lib/auth'

/** Enveloppe une surface Pro : si la personne n'est pas Pro, affiche un teaser « Passe en Pro ». */
export function ProGate({ title, children }: { title: string; children: ReactNode }) {
  const { person } = useAuth()
  if (person?.plan === 'pro') return <>{children}</>
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Lock strokeWidth={1.5} className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-extrabold">{title} — réservé au Pro</h1>
      <p className="max-w-sm text-muted-foreground">Pour vivre de ton art : passe en Pro pour débloquer cette section.</p>
      <Link to="/reglages" className="mt-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground">Passer en Pro — dès 9,99 € HT/mois</Link>
    </div>
  )
}
```

> Le détail floutté riche par surface vient aux Plans 5-8 ; ici un teaser simple suffit (principe « teaser, pas cacher »). Le lien pointe `/reglages` (la boutique réelle = Plan 9).

- [ ] **Step 3 : Routes dans `src/App.tsx`.**
Ajouter les imports en tête : `import { ComingSoon } from '@/components/layout/ComingSoon'` et `import { ProGate } from '@/components/layout/ProGate'`.
Ajouter ces routes dans le bloc « Authenticated routes » (après la ligne `/suivis`) :

```tsx
          <Route path="/mes-dates" element={<AuthenticatedApp><ComingSoon title="Mes dates" /></AuthenticatedApp>} />
          <Route path="/mes-createurs" element={<AuthenticatedApp><ComingSoon title="Mes créateurs" /></AuthenticatedApp>} />
          <Route path="/communaute" element={<AuthenticatedApp><ProGate title="Communauté"><ComingSoon title="Communauté" /></ProGate></AuthenticatedApp>} />
          <Route path="/tableau-de-bord" element={<AuthenticatedApp><ProGate title="Tableau de bord"><ComingSoon title="Tableau de bord" /></ProGate></AuthenticatedApp>} />
```
Et envelopper la page Calendrier de `ProGate` (remplacer la ligne `/calendrier`) :
```tsx
          <Route path="/calendrier" element={<AuthenticatedApp><ProGate title="Calendrier"><CalendarPage /></ProGate></AuthenticatedApp>} />
```

- [ ] **Step 4 : Build** — `pnpm build && pnpm lint` → 0 erreur.
- [ ] **Step 5 : Commit**

```bash
git add src/components/layout/ComingSoon.tsx src/components/layout/ProGate.tsx src/App.tsx
git commit -m "feat(nav): ComingSoon + ProGate + target routes (mes-dates, mes-createurs, communaute, tableau-de-bord, calendrier Pro-gated)"
```

---

## Task 3 : `EntitySwitcher`

**Files :** Create `src/components/layout/EntitySwitcher.tsx`

- [ ] **Step 1 : Implémenter**

```tsx
import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { ChevronDown, User, Store, Check } from 'lucide-react'

/** Sélecteur d'acteur courant : Personne + entités. Visible seulement si ≥1 entité. */
export function EntitySwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { person, entities, currentActor, switchActor } = useAuth()
  const [open, setOpen] = useState(false)

  if (!person || entities.length === 0) {
    // Festivalier pur : pas de sélecteur, juste le nom.
    return (
      <div className="flex items-center gap-2 px-2 py-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"><User strokeWidth={1.5} className="h-4 w-4" /></div>
        {!collapsed && <span className="truncate text-sm font-semibold">{person?.display_name ?? 'Moi'}</span>}
      </div>
    )
  }

  const currentLabel = currentActor?.kind === 'entity'
    ? entities.find(e => e.actor_id === currentActor.id)?.brand_name ?? 'Entité'
    : person.display_name ?? 'Moi'

  return (
    <div className="relative px-2 py-2">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-left hover:bg-muted">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {currentActor?.kind === 'entity' ? <Store strokeWidth={1.5} className="h-4 w-4" /> : <User strokeWidth={1.5} className="h-4 w-4" />}
        </div>
        {!collapsed && <span className="flex-1 truncate text-sm font-semibold">{currentLabel}</span>}
        {!collapsed && <ChevronDown strokeWidth={1.5} className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="absolute left-2 right-2 z-50 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <button onClick={() => { switchActor(null); setOpen(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted">
            <User strokeWidth={1.5} className="h-4 w-4" />
            <span className="flex-1 truncate">{person.display_name ?? 'Moi'} · Festivalier</span>
            {currentActor?.kind === 'person' && <Check strokeWidth={2} className="h-4 w-4 text-primary" />}
          </button>
          {entities.map(e => (
            <button key={e.actor_id} onClick={() => { switchActor(e.actor_id); setOpen(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted">
              <Store strokeWidth={1.5} className="h-4 w-4" />
              <span className="flex-1 truncate">{e.brand_name} · {e.type}</span>
              {currentActor?.id === e.actor_id && <Check strokeWidth={2} className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2 : Build** — `pnpm build && pnpm lint` → 0 erreur.
- [ ] **Step 3 : Commit**

```bash
git add src/components/layout/EntitySwitcher.tsx
git commit -m "feat(nav): EntitySwitcher (person + entities, visible if >=1 entity)"
```

---

## Task 4 : Sidebar pilotée par `currentActor` + switcher + gating

**Files :** Modify `src/components/layout/Sidebar.tsx`

- [ ] **Step 1 : Remplacer le contenu**

```tsx
import { useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import {
  CalendarDays, CalendarClock, Compass, User, Settings, Heart,
  LayoutDashboard, Store, Users, Shield, Lock, Sparkles,
  PanelLeftClose, PanelLeft, type LucideIcon,
} from 'lucide-react'
import { navItemsFor, entryState, NAV_DEFS } from '@/lib/navModel'
import { EntitySwitcher } from './EntitySwitcher'
import { SidebarActivity } from '@/components/notifications/SidebarActivity'
import './Sidebar.css'

const ICONS: Record<string, LucideIcon> = {
  Compass, CalendarClock, Heart, LayoutDashboard, CalendarDays, Users, Store, User, Settings,
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { currentActor, person, isAdmin } = useAuth()
  const navigate = useNavigate()
  const plan = person?.plan === 'pro' ? 'pro' : 'free'
  const keys = navItemsFor(currentActor)

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <Link to="/explorer" className="sidebar-logo-link">
          {collapsed ? <img src="/icon.png" alt="Fellowship" className="sidebar-logo-icon" /> : <img src="/logo.png" alt="Fellowship" style={{ height: 36 }} />}
        </Link>
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} className="sidebar-collapse-btn"><PanelLeftClose strokeWidth={1.5} /></button>
        )}
      </div>

      {/* Sélecteur d'entité */}
      <EntitySwitcher collapsed={collapsed} />

      <nav className="sidebar-nav">
        {keys.map(key => {
          const def = NAV_DEFS[key]
          const Icon = ICONS[def.icon] ?? Compass
          const state = entryState(key, plan)
          if (state === 'active') {
            return (
              <NavLink key={key} to={def.to} title={collapsed ? def.label : undefined}
                className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                <Icon strokeWidth={1.5} />
                {!collapsed && <span>{def.label}</span>}
              </NavLink>
            )
          }
          // lock-pro ou bientot : on navigue quand même vers la route (ProGate/ComingSoon gère l'écran),
          // avec un marqueur visuel.
          const Badge = state === 'lock-pro' ? Lock : Sparkles
          return (
            <button key={key} onClick={() => navigate(def.to)} title={collapsed ? def.label : undefined}
              className="sidebar-nav-link sidebar-nav-link--muted">
              <Icon strokeWidth={1.5} />
              {!collapsed && <span style={{ flex: 1 }}>{def.label}</span>}
              {!collapsed && <Badge strokeWidth={1.5} className="h-3.5 w-3.5 opacity-70" />}
            </button>
          )
        })}
        {isAdmin && (
          <NavLink to="/admin" title={collapsed ? 'Admin' : undefined}
            className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
            <Shield strokeWidth={1.5} />
            {!collapsed && <span>Admin</span>}
          </NavLink>
        )}
      </nav>

      <div className="sidebar-activity-section">
        <SidebarActivity collapsed={collapsed} />
      </div>

      {collapsed && (
        <div className="sidebar-expand">
          <button onClick={() => setCollapsed(false)} className="sidebar-expand-btn"><PanelLeft strokeWidth={1.5} /></button>
        </div>
      )}
    </aside>
  )
}
```

- [ ] **Step 2 : Ajouter le style `--muted`** dans `src/components/layout/Sidebar.css` (append) :

```css
.sidebar-nav-link--muted { width: 100%; background: none; border: none; cursor: pointer; opacity: .72; font: inherit; color: inherit; }
.sidebar-nav-link--muted:hover { opacity: 1; }
```

- [ ] **Step 3 : Build + lint** — `pnpm build && pnpm lint` → 0 erreur.
- [ ] **Step 4 : Commit**

```bash
git add src/components/layout/Sidebar.tsx src/components/layout/Sidebar.css
git commit -m "feat(nav): sidebar driven by currentActor + entity switcher + Pro/Bientot markers"
```

---

## Task 5 : BottomBar pilotée par `currentActor`

**Files :** Modify `src/components/layout/BottomBar.tsx`

- [ ] **Step 1 : Remplacer le contenu** (mobile = 4 entrées max ; on prend les 4 premières clés actives/visibles de la nav de l'acteur + admin)

```tsx
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import {
  CalendarDays, CalendarClock, Compass, User, Heart,
  LayoutDashboard, Store, Users, Shield, type LucideIcon,
} from 'lucide-react'
import { navItemsFor, entryState, NAV_DEFS } from '@/lib/navModel'
import './BottomBar.css'

const ICONS: Record<string, LucideIcon> = {
  Compass, CalendarClock, Heart, LayoutDashboard, CalendarDays, Users, Store, User,
}

export function BottomBar() {
  const { currentActor, person, isAdmin } = useAuth()
  const navigate = useNavigate()
  const plan = person?.plan === 'pro' ? 'pro' : 'free'
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
```

- [ ] **Step 2 : Style `--muted`** dans `src/components/layout/BottomBar.css` (append) :

```css
.bottom-bar-link--muted { background: none; border: none; cursor: pointer; opacity: .6; font: inherit; color: inherit; }
```

- [ ] **Step 3 : Build + lint** — `pnpm build && pnpm lint` → 0 erreur.
- [ ] **Step 4 : Commit**

```bash
git add src/components/layout/BottomBar.tsx src/components/layout/BottomBar.css
git commit -m "feat(nav): bottom bar driven by currentActor"
```

---

## Task 6 : Redirection au switch d'acteur + vérif

**Files :** Modify `src/components/layout/AppLayout.tsx`

> Quand l'acteur courant change, si la route courante n'est pas valide pour le nouvel acteur (ex. on était sur /calendrier en exposant puis on bascule en personne), on redirige vers `/explorer`.

- [ ] **Step 1 : Ajouter l'effet de redirection dans `AppLayout`** (en tête du composant, avant le `return`)

```tsx
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { isRouteValidFor } from '@/lib/navModel'
// ... (imports existants conservés)

// dans AppLayout, après `const [showCreate, setShowCreate] = useState(false)` :
  const { currentActor } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    if (currentActor && !isRouteValidFor(location.pathname, currentActor)) {
      navigate('/explorer', { replace: true })
    }
  }, [currentActor, location.pathname, navigate])
```

- [ ] **Step 2 : Build + lint + tests** — `pnpm build && pnpm lint && pnpm test` → 0 erreur, tous tests verts.
- [ ] **Step 3 : Smoke visuel (manuel — à faire avec Uriel).** Pointer l'app sur le Supabase local (`.env.local`), `pnpm dev`. Vérifier : festivalier voit Explorer/Mes dates(Bientôt)/Mes créateurs(Bientôt)/Profil/Réglages, pas de sélecteur si 0 entité ; un exposant voit le sélecteur + nav cockpit avec cadenas sur Calendrier/Communauté/Tableau de bord en gratuit ; bascule d'acteur depuis /calendrier vers personne → redirige /explorer.
- [ ] **Step 4 : Commit**

```bash
git add src/components/layout/AppLayout.tsx
git commit -m "feat(nav): redirect to /explorer when current route invalid for the switched actor"
```

---

## Auto-vérification (après écriture)
- **Couverture spec (Partie 1)** : nav cible par acteur (`navItemsFor` + Sidebar/BottomBar) ✓ ; sélecteur visible si ≥1 entité (`EntitySwitcher`) ✓ ; gating Pro cadenas (`entryState` + `ProGate`) ✓ ; placeholders « Bientôt » (`ComingSoon`) ✓ ; redirection au switch (`isRouteValidFor` + AppLayout) ✓ ; plan lu sur `person.plan` ✓ ; style actuel (pas de DA) ✓.
- **Hors périmètre** : data layer (3A.2, fait), invitations (3C), admin (3D), pages réelles Bientôt (Plans 5-8), boutique réelle (Plan 9).

## Risques
| Risque | Mitigation |
|---|---|
| Icône lucide manquante dans le map | Fallback `?? Compass`. |
| `currentActor` null transitoire → nav = explorer seul | Acceptable (chargement) ; se stabilise. |
| Redirection en boucle | `isRouteValidFor` autorise toujours `/explorer` (surface partagée). |
| `Ma vitrine` → `/profil` partagé avec « Profil » personne | Même route, libellé contextualisé par acteur (acceptable en 3A.1 ; vitrine dédiée = Plan 6). |
