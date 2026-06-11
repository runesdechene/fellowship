# Explorer — vue Grille (slideshow / grille) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter à l'Explorer un sélecteur de vue (haut-gauche) basculant entre le coverflow actuel (« slideshow ») et une nouvelle vue **grille** d'affiches portrait, partageant les mêmes filtres et la même donnée.

**Architecture:** La grille réutilise la plomberie existante de l'Explorer (`displayed`, `partByEvent`, `actorKind`, `isSaved`/`toggleSave`, `participationChip`, `eventBadge`, tags). Trois composants neufs (`ViewToggle`, `EventGrid`, `EventGridCard`), un hook batché `useFriendsByEvent` (miroir du dock), et deux petits extraits dans `lib/explorer.ts` (format date + persistance du mode). Aucun changement DB, aucun nouveau gating.

**Tech Stack:** React 19 + TS, Vite, Tailwind v4 + CSS scopé `.explorer`, lucide-react, Supabase (REST + RPC `get_friend_ids`). Tests : Vitest (fonctions pures uniquement — RTL ne flush pas le sync sur cette stack).

**Réf. design :** `docs/superpowers/specs/2026-06-11-explorer-vue-grille-design.md`

---

## File Structure

| Fichier | Rôle |
|---|---|
| `src/lib/explorer.ts` *(modif)* | + `formatEventDateRange`, + type `ExplorerView` & `parseExplorerView`/`readExplorerView`/`writeExplorerView` |
| `src/components/explorer/EventDock.tsx` *(modif)* | consomme `formatEventDateRange` (supprime son `dateRange` local) |
| `src/hooks/use-friends-by-event.ts` *(neuf)* | charge en lot `Record<eventId, FriendAvatar[]>` (sémantique dock) |
| `src/components/explorer/ViewToggle.tsx` *(neuf)* | sélecteur segmenté Slideshow/Grille, haut-gauche |
| `src/components/explorer/EventGridCard.tsx` *(neuf)* | une carte affiche-pleine + overlay |
| `src/components/explorer/EventGrid.tsx` *(neuf)* | grille responsive scrollable de cartes |
| `src/pages/Explorer.tsx` *(modif)* | état `viewMode`, rendu conditionnel, hook amis |
| `src/pages/Explorer.css` *(modif)* | styles `.view-toggle`, `.egrid*` |

---

## Task 1 : Formateur de date partagé `formatEventDateRange`

**Files:**
- Modify: `src/lib/explorer.ts`
- Modify: `src/components/explorer/EventDock.tsx`
- Test: `src/lib/explorer.test.ts`

- [ ] **Step 1 : Écrire le test (échoue)**

Ajouter à la fin de `src/lib/explorer.test.ts` :

```ts
import { formatEventDateRange } from './explorer'

describe('formatEventDateRange', () => {
  it('un seul jour', () => {
    expect(formatEventDateRange('2026-06-12', '2026-06-12')).toBe('12 juin')
  })
  it('même mois', () => {
    expect(formatEventDateRange('2026-06-12', '2026-06-14')).toBe('12–14 juin')
  })
  it('mois différents', () => {
    expect(formatEventDateRange('2026-07-31', '2026-08-02')).toBe('31 juil – 2 août')
  })
})
```

- [ ] **Step 2 : Lancer le test (doit échouer)**

Run: `pnpm vitest run src/lib/explorer.test.ts`
Expected: FAIL — `formatEventDateRange is not a function`.

- [ ] **Step 3 : Implémenter dans `src/lib/explorer.ts`**

Ajouter (après `normalizeText`, avant `eventBadge`) :

```ts
/** Parse 'YYYY-MM-DD' comme date LOCALE (évite le décalage UTC→tz qui changeait le jour). */
function parseLocalDate(d: string): Date {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, (m || 1) - 1, day || 1)
}

/** Plage de dates affichée façon dock (« 12 juin », « 12–14 juin », « 31 juil – 2 août »). */
export function formatEventDateRange(start: string, end: string): string {
  const s = parseLocalDate(start), e = parseLocalDate(end)
  const day = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric' })
  const month = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'long' })
  if (start === end) return `${day(s)} ${month(s)}`
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) return `${day(s)}–${day(e)} ${month(s)}`
  const sm = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
  return `${day(s)} ${sm(s)} – ${day(e)} ${sm(e)}`
}
```

- [ ] **Step 4 : Lancer le test (doit passer)**

Run: `pnpm vitest run src/lib/explorer.test.ts`
Expected: PASS.

- [ ] **Step 5 : Refactor `EventDock.tsx` pour réutiliser le formateur**

Dans `src/components/explorer/EventDock.tsx` :
- Supprimer la fonction locale `dateRange` (lignes 7–15).
- Ajouter l'import : `import { formatEventDateRange } from '@/lib/explorer'` (regrouper avec les imports existants).
- Remplacer l'appel `dateRange(event.start_date, event.end_date)` par `formatEventDateRange(event.start_date, event.end_date)`.

- [ ] **Step 6 : Vérifier build + lint**

Run: `pnpm build` puis `pnpm lint`
Expected: build OK, pas de nouvelle erreur/warning.

- [ ] **Step 7 : Commit**

```bash
git add src/lib/explorer.ts src/lib/explorer.test.ts src/components/explorer/EventDock.tsx
git commit -m "refactor(explorer): extrait formatEventDateRange (partagé dock + grille)"
```

---

## Task 2 : Persistance du mode de vue

**Files:**
- Modify: `src/lib/explorer.ts`
- Test: `src/lib/explorer.test.ts`

- [ ] **Step 1 : Écrire le test (échoue)**

Ajouter à `src/lib/explorer.test.ts` :

```ts
import { parseExplorerView } from './explorer'

describe('parseExplorerView', () => {
  it('"grid" → grid', () => { expect(parseExplorerView('grid')).toBe('grid') })
  it('"slideshow" → slideshow', () => { expect(parseExplorerView('slideshow')).toBe('slideshow') })
  it('null → slideshow (défaut)', () => { expect(parseExplorerView(null)).toBe('slideshow') })
  it('valeur inconnue → slideshow', () => { expect(parseExplorerView('xxx')).toBe('slideshow') })
})
```

- [ ] **Step 2 : Lancer le test (doit échouer)**

Run: `pnpm vitest run src/lib/explorer.test.ts`
Expected: FAIL — `parseExplorerView is not a function`.

- [ ] **Step 3 : Implémenter dans `src/lib/explorer.ts`**

Ajouter (par ex. juste après `export type ActorKind = ...`) :

```ts
export type ExplorerView = 'slideshow' | 'grid'

/** Pur (testable) : tolère null / valeurs inconnues → défaut 'slideshow'. */
export function parseExplorerView(raw: string | null): ExplorerView {
  return raw === 'grid' ? 'grid' : 'slideshow'
}

export function readExplorerView(): ExplorerView {
  try { return parseExplorerView(localStorage.getItem('explorer-view')) } catch { return 'slideshow' }
}

export function writeExplorerView(v: ExplorerView): void {
  try { localStorage.setItem('explorer-view', v) } catch { /* ignore */ }
}
```

- [ ] **Step 4 : Lancer le test (doit passer)**

Run: `pnpm vitest run src/lib/explorer.test.ts`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/explorer.ts src/lib/explorer.test.ts
git commit -m "feat(explorer): persistance du mode de vue (localStorage explorer-view)"
```

---

## Task 3 : Hook `useFriendsByEvent` (compagnons groupés, sémantique dock)

**Files:**
- Create: `src/hooks/use-friends-by-event.ts`

> Pas de test unitaire (effet asynchrone + Supabase ; RTL ne flush pas sur cette stack).
> Vérification par build + contrôle visuel en Task 8. Le hook calque exactement
> `useFriendsOnEvent` (RPC `get_friend_ids`, tous statuts) mais en **un seul** chargement.

- [ ] **Step 1 : Créer le fichier**

`src/hooks/use-friends-by-event.ts` :

```ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { FriendAvatar } from '@/lib/map-data'

/**
 * Charge EN LOT, par event, les amis (RPC get_friend_ids — même source que le dock du
 * slideshow) qui ont une participation, avec leur avatar. Activé seulement en mode grille
 * (`enabled`) pour ne pas tirer le graphe social en mode slideshow (le dock a son propre fetch).
 * Retourne `Record<event_id, FriendAvatar[]>`.
 */
export function useFriendsByEvent(enabled: boolean): Record<string, FriendAvatar[]> {
  const { currentActor } = useAuth()
  const [byEvent, setByEvent] = useState<Record<string, FriendAvatar[]>>({})

  useEffect(() => {
    if (!enabled || !currentActor) { setByEvent({}); return }
    let cancelled = false
    const me = currentActor.id
    async function run() {
      const { data: friendIds } = await supabase.rpc('get_friend_ids', { p_user_id: me })
      const ids = (friendIds ?? []) as string[]
      if (ids.length === 0) { if (!cancelled) setByEvent({}); return }

      const [partRes, pubRes] = await Promise.all([
        supabase.from('participations').select('actor_id, event_id').in('actor_id', ids),
        supabase.from('actor_public').select('actor_id, label, avatar_url').in('actor_id', ids),
      ])

      const avatars = new Map<string, FriendAvatar>()
      for (const a of pubRes.data ?? []) {
        if (a.actor_id) avatars.set(a.actor_id, { avatarUrl: a.avatar_url, label: a.label ?? '—' })
      }
      const out: Record<string, FriendAvatar[]> = {}
      const seen = new Set<string>() // un ami compté une seule fois par event
      for (const p of (partRes.data ?? []) as Array<{ actor_id: string | null; event_id: string }>) {
        if (!p.actor_id) continue
        const key = `${p.event_id}|${p.actor_id}`
        if (seen.has(key)) continue
        seen.add(key)
        const av = avatars.get(p.actor_id)
        if (!av) continue
        ;(out[p.event_id] ??= []).push(av)
      }
      if (!cancelled) setByEvent(out)
    }
    run()
    return () => { cancelled = true }
  }, [enabled, currentActor])

  return byEvent
}
```

- [ ] **Step 2 : Vérifier build + lint**

Run: `pnpm build` puis `pnpm lint`
Expected: build OK ; aucun warning nouveau (le pattern `setByEvent({})` en début d'effet calque `useMapFriends`, déjà accepté par la config).

- [ ] **Step 3 : Commit**

```bash
git add src/hooks/use-friends-by-event.ts
git commit -m "feat(explorer): hook useFriendsByEvent (compagnons groupés, sémantique dock)"
```

---

## Task 4 : Composant `ViewToggle` + styles

**Files:**
- Create: `src/components/explorer/ViewToggle.tsx`
- Modify: `src/pages/Explorer.css`

- [ ] **Step 1 : Créer le composant**

`src/components/explorer/ViewToggle.tsx` :

```tsx
import { LayoutGrid, GalleryHorizontalEnd } from 'lucide-react'
import type { ExplorerView } from '@/lib/explorer'

interface ViewToggleProps {
  mode: ExplorerView
  onChange: (mode: ExplorerView) => void
}

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="view-toggle" role="group" aria-label="Mode d'affichage">
      <button
        type="button"
        className={'view-toggle-btn' + (mode === 'slideshow' ? ' on' : '')}
        aria-pressed={mode === 'slideshow'}
        onClick={() => onChange('slideshow')}
      >
        <GalleryHorizontalEnd size={17} strokeWidth={2} />
        <span className="view-toggle-label">Slideshow</span>
      </button>
      <button
        type="button"
        className={'view-toggle-btn' + (mode === 'grid' ? ' on' : '')}
        aria-pressed={mode === 'grid'}
        onClick={() => onChange('grid')}
      >
        <LayoutGrid size={17} strokeWidth={2} />
        <span className="view-toggle-label">Grille</span>
      </button>
    </div>
  )
}
```

- [ ] **Step 2 : Ajouter les styles dans `src/pages/Explorer.css`**

À la fin du fichier :

```css
/* ── Sélecteur de vue (haut-gauche) ───────────────────────────────── */
.explorer .view-toggle {
  position: absolute;
  top: px;
  left: 14px;
  z-index: 30;
  display: inline-flex;
  gap: 4px;
  padding: 5px;
  background: rgba(20, 14, 12, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 99px;
  backdrop-filter: blur(8px);
}
.light .explorer .view-toggle {
  background: rgba(248, 242, 232, 0.7);
  border-color: rgba(60, 45, 35, 0.12);
}
.explorer .view-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: none;
  cursor: pointer;
  background: transparent;
  color: hsl(var(--muted-foreground));
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 99px;
  transition: 0.15s;
}
.explorer .view-toggle-btn.on {
  background: var(--gradient-primary);
  color: #fff;
  box-shadow: 0 2px 10px hsl(20 65% 32% / 0.4);
}
.explorer .view-toggle-btn svg { width: 17px; height: 17px; }

@media (max-width: 640px) {
  .explorer .view-toggle { top: 12px; left: 12px; }
  .explorer .view-toggle-label { display: none; }
  .explorer .view-toggle-btn { padding: 8px; }
}
```

- [ ] **Step 3 : Vérifier build**

Run: `pnpm build`
Expected: build OK (composant non encore monté, mais doit compiler).

- [ ] **Step 4 : Commit**

```bash
git add src/components/explorer/ViewToggle.tsx src/pages/Explorer.css
git commit -m "feat(explorer): composant ViewToggle (slideshow/grille) + styles"
```

---

## Task 5 : Composant `EventGridCard` + styles

**Files:**
- Create: `src/components/explorer/EventGridCard.tsx`
- Modify: `src/pages/Explorer.css`

- [ ] **Step 1 : Créer le composant**

`src/components/explorer/EventGridCard.tsx` :

```tsx
import { Star } from 'lucide-react'
import { getTagEmoji, getTagLandingColor } from '@/components/ui/TagBadge'
import { eventBadge, participationChip, formatEventDateRange, type ActorKind } from '@/lib/explorer'
import type { PartLite } from './EventDeck'
import type { FriendAvatar } from '@/lib/map-data'
import type { EventWithScore } from '@/types/database'

interface EventGridCardProps {
  event: EventWithScore
  now: Date
  /** Label affiché du tag (résolu depuis la table tags ; fallback = slug). */
  tagLabel: string
  part?: PartLite
  actorKind: ActorKind
  friends: FriendAvatar[]
  saved: boolean
  onToggleSave: (event: EventWithScore) => void
  onClick: (event: EventWithScore) => void
}

export function EventGridCard({ event, now, tagLabel, part, actorKind, friends, saved, onToggleSave, onClick }: EventGridCardProps) {
  const tag = event.tags?.[0] ?? 'autre'
  const color = getTagLandingColor(tag)
  const badge = eventBadge(event, now)
  const chip = participationChip(part?.status, part?.payment_status, actorKind, { isPast: new Date(event.end_date) < now })
  const shown = friends.slice(0, 4)

  return (
    <div className="egrid-card" onClick={() => onClick(event)}>
      {chip && <span className={'card-status ' + chip.variant}>{chip.label}</span>}
      {badge && <span className={'card-badge ' + badge}>{badge === 'nouveau' ? '✨  Nouveau' : '🔥 Populaire'}</span>}

      {event.image_url
        ? <img className="egrid-img" src={event.image_url} alt={event.name} loading="lazy" />
        : <div className="egrid-img egrid-img--empty" aria-hidden="true">{getTagEmoji(tag)}</div>}
      <div className="egrid-scrim" aria-hidden="true" />

      <div className="egrid-ov">
        <span className="dock-tag" style={{ '--c': color } as React.CSSProperties}>
          <span aria-hidden="true">{getTagEmoji(tag)}</span>{tagLabel}
        </span>
        <div className="egrid-name">{event.name}</div>
        <div className="egrid-meta">
          <span aria-hidden="true">📅</span><b>{formatEventDateRange(event.start_date, event.end_date)}</b>
          <span aria-hidden="true">📍</span><b>{event.city}</b>
        </div>
        <div className="egrid-bottom">
          <div className="egrid-friends">
            {shown.length > 0 && (
              <span className="egrid-avs">
                {shown.map((f, i) => (
                  <span
                    key={i}
                    className="egrid-av"
                    style={f.avatarUrl ? { backgroundImage: `url(${JSON.stringify(f.avatarUrl)})` } : undefined}
                  >
                    {!f.avatarUrl && (f.label.trim()[0] ?? '?').toUpperCase()}
                  </span>
                ))}
              </span>
            )}
            {friends.length > 0 && (
              <span className="egrid-fcount">
                {friends.length === 1 ? `${friends[0].label} y va` : `${friends.length} compagnons y vont`}
              </span>
            )}
          </div>
          <button
            type="button"
            className={'egrid-star' + (saved ? ' on' : '')}
            aria-label={saved ? 'Ne plus repérer' : 'Repérer'}
            aria-pressed={saved}
            onClick={(e) => { e.stopPropagation(); onToggleSave(event) }}
          >
            <Star size={17} strokeWidth={2} fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Ajouter les styles dans `src/pages/Explorer.css`**

À la fin du fichier :

```css
/* ── Carte grille (affiche pleine + overlay) ──────────────────────── */
.explorer .egrid-card {
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  aspect-ratio: 2 / 3;
  background: hsl(var(--card));
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  transition: transform 0.14s;
}
.explorer .egrid-card:hover { transform: translateY(-4px); }
.light .explorer .egrid-card { box-shadow: 0 14px 34px rgba(60, 45, 35, 0.16); }

.explorer .egrid-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.explorer .egrid-img--empty {
  display: flex; align-items: center; justify-content: center;
  font-size: 52px; background: hsl(var(--secondary));
}
.explorer .egrid-scrim {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(10, 7, 5, 0.95) 6%, rgba(10, 7, 5, 0.55) 38%, transparent 62%);
}

.explorer .egrid-ov {
  position: absolute; left: 0; right: 0; bottom: 0;
  padding: 16px; display: flex; flex-direction: column; gap: 9px;
}
.explorer .egrid-name {
  font-family: var(--font-heading); font-weight: 800; font-size: 20px;
  line-height: 1.1; color: #fff; letter-spacing: -0.01em;
}
.explorer .egrid-meta { display: flex; align-items: center; gap: 11px; color: rgba(255, 255, 255, 0.92); font-size: 13px; }
.explorer .egrid-meta b { font-family: var(--font-heading); font-weight: 800; }

.explorer .egrid-bottom { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.explorer .egrid-friends { display: flex; align-items: center; gap: 8px; min-width: 0; }
.explorer .egrid-avs { display: flex; flex: none; }
.explorer .egrid-av {
  width: 28px; height: 28px; border-radius: 50%;
  border: 2px solid hsl(var(--copper, 24 85% 56%));
  background: #2a1c16 center / cover;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: #f3d9b8; flex: none;
}
.explorer .egrid-av:not(:first-child) { margin-left: -9px; }
.explorer .egrid-fcount {
  color: rgba(255, 255, 255, 0.92); font-size: 12.5px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.explorer .egrid-star {
  flex: none; width: 38px; height: 38px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  background: rgba(255, 255, 255, 0.14); border: 1px solid rgba(255, 255, 255, 0.24);
  backdrop-filter: blur(6px); color: #fff; transition: 0.15s;
}
.explorer .egrid-star:hover { background: rgba(255, 255, 255, 0.24); }
.explorer .egrid-star.on { background: hsl(44 89% 71%); border-color: hsl(44 89% 71%); color: #41351c; }

/* Statut/badge en coin : on réutilise les COULEURS .card-status/.card-badge mais on
   repositionne (les versions coverflow débordent à -7px, ce qui serait clippé ici par
   overflow:hidden). Spécificité .egrid-card > base .explorer .card-status. */
.explorer .egrid-card .card-status { top: 11px; left: 11px; }
.explorer .egrid-card .card-badge { top: 11px; right: 11px; }
```

- [ ] **Step 3 : Vérifier build**

Run: `pnpm build`
Expected: build OK.

- [ ] **Step 4 : Commit**

```bash
git add src/components/explorer/EventGridCard.tsx src/pages/Explorer.css
git commit -m "feat(explorer): EventGridCard (affiche + overlay, statut/badge/tag/amis/repérer)"
```

---

## Task 6 : Composant `EventGrid` (conteneur scrollable) + styles

**Files:**
- Create: `src/components/explorer/EventGrid.tsx`
- Modify: `src/pages/Explorer.css`

- [ ] **Step 1 : Créer le composant**

`src/components/explorer/EventGrid.tsx` :

```tsx
import { EventGridCard } from './EventGridCard'
import type { PartLite } from './EventDeck'
import type { ActorKind } from '@/lib/explorer'
import type { FriendAvatar } from '@/lib/map-data'
import type { EventWithScore } from '@/types/database'

interface EventGridProps {
  events: EventWithScore[]
  now: Date
  partByEvent: Map<string, PartLite>
  actorKind: ActorKind
  friendsByEvent: Record<string, FriendAvatar[]>
  /** Résout le label affiché d'un slug de tag. */
  tagLabel: (slug: string) => string
  isSaved: (eventId: string) => boolean
  onToggleSave: (event: EventWithScore) => void
  onCardClick: (event: EventWithScore) => void
}

export function EventGrid({ events, now, partByEvent, actorKind, friendsByEvent, tagLabel, isSaved, onToggleSave, onCardClick }: EventGridProps) {
  return (
    <div className="egrid-scroll">
      <div className="egrid">
        {events.map(ev => (
          <EventGridCard
            key={ev.id}
            event={ev}
            now={now}
            tagLabel={tagLabel(ev.tags?.[0] ?? 'autre')}
            part={partByEvent.get(ev.id)}
            actorKind={actorKind}
            friends={friendsByEvent[ev.id] ?? []}
            saved={isSaved(ev.id)}
            onToggleSave={onToggleSave}
            onClick={onCardClick}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Ajouter les styles (grille responsive + scroll) dans `src/pages/Explorer.css`**

À la fin du fichier :

```css
/* ── Grille : conteneur scrollable + colonnes responsives (max 6) ──── */
.explorer .egrid-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 4px 24px;
}
.explorer .egrid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 20px;
}
@media (max-width: 1400px) { .explorer .egrid { grid-template-columns: repeat(5, 1fr); } }
@media (max-width: 1150px) { .explorer .egrid { grid-template-columns: repeat(4, 1fr); } }
@media (max-width: 880px)  { .explorer .egrid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 640px)  { .explorer .egrid { grid-template-columns: repeat(2, 1fr); gap: 14px; } }
```

- [ ] **Step 3 : Vérifier build**

Run: `pnpm build`
Expected: build OK.

- [ ] **Step 4 : Commit**

```bash
git add src/components/explorer/EventGrid.tsx src/pages/Explorer.css
git commit -m "feat(explorer): EventGrid (grille responsive 6→2 colonnes, scroll interne)"
```

---

## Task 7 : Câblage dans `Explorer.tsx`

**Files:**
- Modify: `src/pages/Explorer.tsx`

- [ ] **Step 1 : Mettre à jour les imports**

Dans `src/pages/Explorer.tsx` :

Remplacer la ligne d'import `lib/explorer` :
```ts
import { composeFilter, monthRangeFor, type Zone, type Period, type ActorKind } from '@/lib/explorer'
```
par :
```ts
import { composeFilter, monthRangeFor, readExplorerView, writeExplorerView, type Zone, type Period, type ActorKind, type ExplorerView } from '@/lib/explorer'
```

Ajouter (avec les autres imports de composants explorer) :
```ts
import { EventGrid } from '@/components/explorer/EventGrid'
import { ViewToggle } from '@/components/explorer/ViewToggle'
import { useFriendsByEvent } from '@/hooks/use-friends-by-event'
```

- [ ] **Step 2 : Ajouter l'état viewMode + le hook amis + le résolveur de tag**

Juste après la ligne `const [scrubbing, setScrubbing] = useState(false)` (≈ ligne 101) :
```ts
  // ---------- Mode de vue (slideshow / grille), persisté ----------
  const [viewMode, setViewMode] = useState<ExplorerView>(() => readExplorerView())
  const changeView = (v: ExplorerView) => { setViewMode(v); writeExplorerView(v) }
  // Compagnons groupés : chargés uniquement en mode grille (le dock a son propre fetch).
  const friendsByEvent = useFriendsByEvent(viewMode === 'grid')
```

Après le calcul de `partByEvent` (≈ ligne 262), ajouter le résolveur de label de tag :
```ts
  const tagLabelOf = useCallback(
    (slug: string) => dynamicTags.find(d => d.value === slug)?.label ?? slug,
    [dynamicTags],
  )
```

- [ ] **Step 3 : Monter le `ViewToggle` dans le rendu**

Dans le `return`, juste avant `<div className="stagewrap">` (après le `<input>` caché) :
```tsx
      <ViewToggle mode={viewMode} onChange={changeView} />

```

- [ ] **Step 4 : Conditionner le ScrubBar au mode slideshow**

Remplacer le bloc :
```tsx
        {!loading && displayed.length > 1 && (
          <ScrubBar
```
par :
```tsx
        {viewMode === 'slideshow' && !loading && displayed.length > 1 && (
          <ScrubBar
```

- [ ] **Step 5 : Rendu conditionnel du corps (grille vs coverflow)**

Remplacer tout le bloc `<div className="stagebody"> … </div>` (≈ lignes 322–352) par :
```tsx
        <div className="stagebody">
          {loading ? (
            <DeckSkeleton />
          ) : displayed.length === 0 ? (
            <ExplorerEmpty />
          ) : viewMode === 'grid' ? (
            <EventGrid
              events={displayed}
              now={now}
              partByEvent={partByEvent}
              actorKind={actorKind}
              friendsByEvent={friendsByEvent}
              tagLabel={tagLabelOf}
              isSaved={isSaved}
              onToggleSave={toggleSave}
              onCardClick={ev => navigate(eventPath(ev))}
            />
          ) : currentEvent ? (
            <>
              <EventDeck
                events={displayed}
                activeIndex={safeIndex}
                canAddImage={canAddImage}
                now={now}
                partByEvent={partByEvent}
                actorKind={actorKind}
                onSelect={i => setActiveIndex(i)}
                onPrev={() => go(-1)}
                onNext={() => go(1)}
                onSwipe={go}
                onCardClick={ev => navigate(eventPath(ev))}
                onAddImage={onAddImage}
              />
              <div className="infozone">
                <EventDock
                  event={currentEvent}
                  tagInfo={activeTagInfo}
                  animate={!scrubbing}
                />
              </div>
            </>
          ) : (
            <ExplorerEmpty />
          )}
        </div>
```

- [ ] **Step 6 : Masquer les CTA du bas en mode grille**

Remplacer :
```tsx
        <div className="bottombar">
          {currentEvent && (
            <div className="dock-cta">
```
par :
```tsx
        <div className="bottombar">
          {viewMode === 'slideshow' && currentEvent && (
            <div className="dock-cta">
```

- [ ] **Step 7 : Vérifier build + lint**

Run: `pnpm build` puis `pnpm lint`
Expected: build OK ; aucun warning nouveau dans `Explorer.tsx` (vérifier notamment que `useCallback` est bien importé — il l'est déjà).

- [ ] **Step 8 : Commit**

```bash
git add src/pages/Explorer.tsx
git commit -m "feat(explorer): câble le sélecteur de vue + rendu grille dans Explorer"
```

---

## Task 8 : Vérification finale, bump version, push

**Files:**
- Modify: `package.json`

- [ ] **Step 1 : Suite complète**

Run: `pnpm vitest run` puis `pnpm build` puis `pnpm lint`
Expected: tous les tests PASS, build OK, pas de nouveau warning.

- [ ] **Step 2 : Contrôle visuel manuel**

Lancer l'app (`pnpm dev`), se connecter, aller sur **Explorer** :
- Le toggle apparaît en haut à gauche ; défaut = Slideshow (coverflow inchangé).
- Cliquer **Grille** : grille d'affiches portrait, 6 colonnes en grand écran.
- Vérifier sur les cartes : pilule tag (emoji + label + couleur), nom, date 📅 + ville 📍,
  pastilles de statut réelles (Repéré/Accepté/…), badges Nouveau/Populaire, avatars
  « X compagnons y vont ».
- Cliquer l'**étoile** d'une carte → bascule Repéré (jaune) sans ouvrir le festival ;
  cliquer ailleurs sur la carte → ouvre le festival.
- Recharger la page : le mode grille est **mémorisé**.
- Réduire la fenêtre : colonnes 6→5→4→3→2 ; toggle en icônes seules sous 640px.
- Repasser en **Slideshow** : tout est comme avant.

> Si un souci visuel apparaît, corriger le CSS/JSX concerné, re-commit, puis reprendre ce contrôle.

- [ ] **Step 3 : Bump version**

Dans `package.json`, incrémenter le patch (ex. `0.7.253` → `0.7.254`).

- [ ] **Step 4 : Commit + push**

```bash
git add package.json
git commit -m "chore(explorer): bump version — vue grille livrée"
git push
```

---

## Self-review (couverture spec)

- Sélecteur haut-gauche slideshow/grille → Task 4 + Task 7 (montage).
- Carte option B (affiche pleine + overlay, 2/3) → Task 5.
- Mêmes infos que le dock (tag emoji/label/couleur, nom, date, lieu) → Task 5 (+ `formatEventDateRange` Task 1, `tagLabel` Task 6/7).
- Statuts/badges réutilisés à l'identique → Task 5 (`card-status`/`card-badge` + repositionnement).
- Repérer étoile bas-droite (toggle, stopPropagation, réutilise toggleSave/isSaved) → Task 5 + Task 7.
- Compagnons pour tous, sémantique dock, chargement groupé → Task 3 + Task 7.
- 6 colonnes max, dégressif → Task 6.
- Scroll interne grille (AppLayout inchangé) → Task 6 (`egrid-scroll`) + Task 7 (rendu).
- Persistance localStorage → Task 2 + Task 7.
- Mobile (toggle icônes seules, 2 colonnes) → Task 4 + Task 6.
- Pas de nouveau gating → aucun code de gating ajouté (conforme).
