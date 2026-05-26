# Explorer « Nuit de Festival » (coverflow) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Remplacer la grille Explorer par le **coverflow** de la maquette (deck 3D + barre Quoi/Où/Quand + fond ambiant + dock), branché sur les données/hooks réels, en DA Nuit de Festival.

**Architecture :** Logique pure isolée et testée dans `src/lib/explorer.ts` (math du deck, mapping période, composition des filtres). UI décomposée en composants focalisés sous `src/components/explorer/` (AmbientBackground, EventDeck, DeckCard, SearchSegments, EventDock), orchestrés par `src/pages/Explorer.tsx`. Styles portés de la maquette vers les tokens DA dans `src/pages/Explorer.css`. Réutilise `useEvents`, `useTags`, `useMyParticipations`/`useFriendsOnEvent`/`addParticipation`/`removeParticipation`, `useAuth`. **Aucun backend** (édition events déjà collaborative).

**Tech Stack :** React 19 + TS, Tailwind v4 tokens DA, CSS scopé `.explorer`, Vitest.

**Spec :** `docs/superpowers/specs/2026-05-25-explorer-da-integration-design.md`. **Maquette :** `docs/decisions/assets/explorer.html`.

---

## File Structure
- **Modify** `src/lib/explorer.ts` — ajoute `deckCardStyle`, `periodToRange`, `PERIODS`, `composeFilter` (garde `applyViewMode`/`VIEW_MODES`).
- **Modify** `src/lib/explorer.test.ts` — tests des nouveaux helpers.
- **Create** `src/components/explorer/AmbientBackground.tsx`
- **Create** `src/components/explorer/DeckCard.tsx`
- **Create** `src/components/explorer/EventDeck.tsx`
- **Create** `src/components/explorer/SearchSegments.tsx`
- **Create** `src/components/explorer/EventDock.tsx`
- **Rewrite** `src/pages/Explorer.tsx`
- **Rewrite** `src/pages/Explorer.css`

Types: `EventWithScore` (`@/types/database`) a `id, name, description, image_url, city, department, start_date, end_date, tags, created_at, avg_overall, review_count`.

---

## Task 1: Helpers purs (`explorer.ts`) + tests

**Files:** Modify `src/lib/explorer.ts` · Modify `src/lib/explorer.test.ts`

- [ ] **Step 1: Écrire les tests (append à `explorer.test.ts`)**

```ts
import { describe, it, expect } from 'vitest'
import { deckCardStyle, periodToRange, composeFilter } from './explorer'
import type { EventWithScore } from '@/types/database'

const ev = (p: Partial<EventWithScore>): EventWithScore => ({
  id: p.id ?? crypto.randomUUID(), name: p.name ?? 'E', description: null, image_url: null,
  city: p.city ?? 'Lyon', department: p.department ?? '69',
  start_date: p.start_date ?? '2026-07-01', end_date: p.end_date ?? '2026-07-02',
  tags: p.tags ?? [], created_at: p.created_at ?? '2026-01-01',
  avg_overall: null, review_count: null, registration_deadline: null,
  registration_url: null, external_url: null, contact_email: null, registration_note: null,
} as EventWithScore)

describe('deckCardStyle', () => {
  it('centre (offset 0) : pas de rotation, scale 1, is-center', () => {
    const s = deckCardStyle(0)
    expect(s.isCenter).toBe(true)
    expect(s.transform).toContain('rotateY(0deg)')
    expect(s.transform).toContain('scale(1)')
    expect(s.opacity).toBe(1)
  })
  it('voisin droit (offset +1) : décalé positif, tourné, atténué', () => {
    const s = deckCardStyle(1)
    expect(s.isCenter).toBe(false)
    expect(s.transform).toContain('translateX(104%)')
    expect(s.transform).toContain('rotateY(-18deg)')
    expect(s.filter).toBe('brightness(.45)')
  })
  it('hors fenêtre (offset 3) : invisible, non cliquable', () => {
    const s = deckCardStyle(3)
    expect(s.opacity).toBe(0)
    expect(s.pointerEvents).toBe('none')
  })
})

describe('periodToRange', () => {
  const now = new Date('2026-06-15T12:00:00')
  it('next-3 : de maintenant à +3 mois', () => {
    const r = periodToRange('next-3', now)
    expect(r.from?.getTime()).toBe(now.getTime())
    expect(r.to?.getMonth()).toBe(8) // sept (juin+3)
    expect(r.past).toBeFalsy()
  })
  it('past : terminés (to = maintenant, past=true)', () => {
    const r = periodToRange('past', now)
    expect(r.past).toBe(true)
  })
  it('recent : flag recent, fenêtre future', () => {
    expect(periodToRange('recent', now).recent).toBe(true)
  })
})

describe('composeFilter', () => {
  const now = new Date('2026-06-15')
  const events = [
    ev({ id: 'a', tags: ['medieval'], department: '69', start_date: '2026-07-10' }),
    ev({ id: 'b', tags: ['musique'], department: '75', start_date: '2026-07-10' }),
    ev({ id: 'c', tags: ['medieval'], department: '69', start_date: '2026-01-10' }), // passé
  ]
  it('filtre par tag', () => {
    const r = composeFilter(events, { tags: new Set(['medieval']), zone: 'france', period: 'next-12' }, { department: '69', now })
    expect(r.map(e => e.id)).toEqual(['a', 'c'].filter(id => id !== 'c')) // c est passé -> exclu par période
  })
  it('filtre par zone (dept utilisateur)', () => {
    const r = composeFilter(events, { tags: new Set(), zone: 'mine', period: 'next-12' }, { department: '69', now })
    expect(r.every(e => e.department === '69')).toBe(true)
    expect(r.find(e => e.id === 'b')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Lancer → échoue**

Run: `pnpm vitest run src/lib/explorer.test.ts`
Expected: FAIL (`deckCardStyle`/`periodToRange`/`composeFilter` not exported).

- [ ] **Step 3: Implémenter (append à `explorer.ts`)**

```ts
export interface DeckStyle {
  transform: string; opacity: number; filter: string; zIndex: number;
  pointerEvents: 'auto' | 'none'; isCenter: boolean
}

/** Coverflow : style d'une carte selon son décalage à la carte active (porté du layout() maquette). */
export function deckCardStyle(offset: number): DeckStyle {
  const ao = Math.abs(offset)
  if (ao > 2) {
    return {
      transform: `translate(-50%,-50%) translateX(${offset > 0 ? 170 : -170}%) scale(.5)`,
      opacity: 0, filter: 'none', zIndex: 0, pointerEvents: 'none', isCenter: false,
    }
  }
  const tx = offset === 0 ? 0 : (offset < 0 ? -1 : 1) * (ao === 1 ? 104 : 152)
  const rot = offset === 0 ? 0 : (offset < 0 ? 18 : -18)
  const sc = offset === 0 ? 1 : (ao === 1 ? 0.74 : 0.62)
  return {
    transform: `translate(-50%,-50%) translateX(${tx}%) rotateY(${rot}deg) scale(${sc})`,
    opacity: 1,
    filter: offset === 0 ? 'none' : (ao === 1 ? 'brightness(.45)' : 'brightness(.3)'),
    zIndex: 10 - ao, pointerEvents: 'auto', isCenter: offset === 0,
  }
}

export type Period = 'this-month' | 'next-3' | 'next-6' | 'next-12' | 'recent' | 'past'
export const PERIODS: { value: Period; label: string }[] = [
  { value: 'this-month', label: 'Ce mois-ci' },
  { value: 'next-3', label: '3 prochains mois' },
  { value: 'next-6', label: '6 prochains mois' },
  { value: 'next-12', label: '12 prochains mois' },
  { value: 'recent', label: '✨ Ajoutés récemment' },
  { value: 'past', label: '✅ Terminés' },
]

export interface PeriodRange { from: Date | null; to: Date | null; past?: boolean; recent?: boolean }

export function periodToRange(period: Period, now: Date): PeriodRange {
  const addMonths = (n: number) => { const d = new Date(now); d.setMonth(d.getMonth() + n); return d }
  switch (period) {
    case 'this-month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      return { from, to }
    }
    case 'next-3': return { from: now, to: addMonths(3) }
    case 'next-6': return { from: now, to: addMonths(6) }
    case 'next-12': return { from: now, to: addMonths(12) }
    case 'recent': return { from: now, to: addMonths(12), recent: true }
    case 'past': return { from: null, to: now, past: true }
  }
}

export type Zone = 'mine' | 'france'
export interface ExplorerFilters { tags: Set<string>; zone: Zone; period: Period }

/** Compose tags ∩ zone ∩ période, puis tri (chronologique ; created_at desc si 'recent'). */
export function composeFilter(
  events: EventWithScore[],
  filters: ExplorerFilters,
  ctx: { department: string | null; now: Date },
): EventWithScore[] {
  const range = periodToRange(filters.period, ctx.now)
  let result = events.filter(ev => {
    if (filters.tags.size > 0 && !ev.tags?.some(t => filters.tags.has(t))) return false
    if (filters.zone === 'mine' && ctx.department && ev.department !== ctx.department) return false
    const end = new Date(ev.end_date)
    const start = new Date(ev.start_date)
    if (range.past) return end < ctx.now
    if (range.from && start < range.from && end < ctx.now) return false
    if (range.to && start >= range.to) return false
    return true
  })
  result = [...result].sort(filters.period === 'recent'
    ? (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    : (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
  return result
}
```

- [ ] **Step 4: Lancer → passe**

Run: `pnpm vitest run src/lib/explorer.test.ts`
Expected: PASS. Puis `pnpm vitest run` (toute la suite reste verte).

- [ ] **Step 5: Commit**

```bash
git add src/lib/explorer.ts src/lib/explorer.test.ts
git commit -m "feat(explorer): pure helpers — deckCardStyle, periodToRange, composeFilter (+tests)"
```

---

## Task 2: `Explorer.css` — port coverflow vers tokens DA

**Files:** Rewrite `src/pages/Explorer.css`

> Porter le `<style>` de `docs/decisions/assets/explorer.html` (lignes 16-108), scopé `.explorer`, SAUF `:root`/`html,body`/`.sidebar`/`.side-foot`/`.entity`/`.logo`/`.nav` (le shell — sidebar/bottombar — est déjà fourni par l'app). Garder : `.stage`/`.ambient`/`.stagewrap`/`.top`/`.searchbar`/`.seg*`/`.pop`/`.catgrid`/`.catchip`/`.popline`/`.peropts`/`.peropt`/`.distpill`(sans le km)/`.stagebody`/`.flow`/`.deck`/`.card`(+`.is-center`,`.grad`,`.info`,`.eyb`,`.ctag`,`.cmeta`,`.open`)/`.arrow`/`.infozone`/`.dock`/`.dockinfo`/`.cta`/`.btn`(+`.btn-p`,`.btn-star`)/`.counter`/`.cav`/`@keyframes kb` + la media-query mobile.

**Table de correspondance (comme landing/onboarding) :** `var(--surface)`→`hsl(var(--card))` · `var(--surface2)`→`hsl(var(--secondary))` · `var(--text)`→`hsl(var(--foreground))` · `var(--muted)`→`hsl(var(--muted-foreground))` · `var(--line)`→`hsl(var(--border))` · `var(--bg)`→`hsl(var(--background))` · `var(--cop)`/`--cop-d`→`var(--copper)`/`--copper-d` · `var(--green)`→`var(--lime)` · `--amber`→`--amber` · `var(--h)`/`var(--b)`→`var(--font-heading)`/`var(--font-body)` · `.btn-p` background→`var(--gradient-primary)` · `.btn-star` background→`var(--lime)` · literals `hsl(.. / ..)`/rgba/`#fff` (texte sur photo/verre) gardés.

- [ ] **Step 1: Écrire `src/pages/Explorer.css`**
- Préfixer tous les sélecteurs par `.explorer ` (root sur `<div className="explorer">`). Garder global : `@keyframes kb`, `@keyframes` éventuels.
- **GOTCHA SVG** (obligatoire) : ajouter `.explorer svg { fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; }`.
- **Ombres jour** : pour `.searchbar`, `.arrow`, `.card`, `.pop`, ajouter overrides `.light .explorer <sel>` plus douces (ex. `.card` ombre nuit `0 30px 70px rgba(0,0,0,.55)` → jour `0 16px 40px rgba(60,45,35,.12)` ; `.searchbar`/`.arrow` verre : nuit `rgba(255,255,255,.12)` → jour `rgba(60,45,35,.06)` + bordures sombres translucides).
- **Texte** : ne pas introduire de `#fff` en dur hors texte-sur-photo/verre ; le dock/searchbar sur fond ambiant sombre peuvent garder `#fff` (texte sur média), mais les popovers (surface) utilisent `hsl(var(--foreground))`.
- Retirer du `.pop-ou` toute trace de slider km (`.distpill input[type=range]`, `.dist`, `#distval`) → on garde juste l'input ville (désactivé/indicatif) + le bouton « Toute la France ». (Détail UI précisé Task 6.)
- Le `.stage` de la maquette est `position:fixed;left:262px` (à cause de sa sidebar) → ici l'Explorer vit DANS le `<main>` de `AppLayout` : utiliser `.explorer .stage { position:relative; inset:0; height:100%; }` (pas de left:262px) et `.explorer { height:100%; position:relative; overflow:hidden }`.

- [ ] **Step 2: Vérifier**
Run: `pnpm exec vite build` puis `grep -rEn "hsl\(#|hsl\(hsl\(" dist/assets/*.css` (vide) ; `pnpm lint`. (CSS non encore importé → build doit passer quand même.)

- [ ] **Step 3: Commit**
```bash
git add src/pages/Explorer.css
git commit -m "feat(explorer): port coverflow styles to DA tokens (Explorer.css)"
```

---

## Task 3: `AmbientBackground`

**Files:** Create `src/components/explorer/AmbientBackground.tsx`

- [ ] **Step 1: Implémenter**
```tsx
/** Fond ambiant flouté de l'image du festival actif (fondu au changement). Fallback dégradé si pas d'image. */
export function AmbientBackground({ imageUrl }: { imageUrl: string | null }) {
  return (
    <div className="ambient" aria-hidden="true">
      {imageUrl
        ? <img src={imageUrl} alt="" key={imageUrl} />
        : <div className="ambient-fallback" />}
    </div>
  )
}
```
(CSS `.explorer .ambient img` = blur+brightness+scale comme maquette ; `.explorer .ambient-fallback` = `background: var(--page-backdrop)`. Ajouter ces 2 règles dans Explorer.css si pas déjà — le `key={imageUrl}` force un remount pour le fondu.)

- [ ] **Step 2: build + lint** → vert. **Commit**
```bash
git add src/components/explorer/AmbientBackground.tsx src/pages/Explorer.css
git commit -m "feat(explorer): AmbientBackground (active-event blurred backdrop)"
```

---

## Task 4: `DeckCard` (image / fallback B + bouton image)

**Files:** Create `src/components/explorer/DeckCard.tsx`

- [ ] **Step 1: Implémenter**
```tsx
import { getTagIcon } from '@/components/ui/TagBadge'
import type { EventWithScore } from '@/types/database'

interface DeckCardProps {
  event: EventWithScore
  style: React.CSSProperties
  isCenter: boolean
  canAddImage: boolean
  onClick: () => void
  onAddImage: (event: EventWithScore) => void
}

export function DeckCard({ event, style, isCenter, canAddImage, onClick, onAddImage }: DeckCardProps) {
  const tag = event.tags?.[0] ?? 'autre'
  const Icon = getTagIcon(tag)
  const hasImg = !!event.image_url
  return (
    <div className={'card' + (isCenter ? ' is-center' : '')} style={style} onClick={onClick}>
      {hasImg
        ? <img src={event.image_url!} alt={event.name} />
        : (
          <div className="card-fallback">
            <span className="card-fallback-glow" aria-hidden="true" />
            <Icon className="card-fallback-ico" aria-hidden="true" />
            {isCenter && canAddImage && (
              <button
                type="button"
                className="card-addimg"
                onClick={(e) => { e.stopPropagation(); onAddImage(event) }}
              >
                ＋ Ajouter une image
              </button>
            )}
          </div>
        )}
      <div className="grad" aria-hidden="true" />
    </div>
  )
}
```
(CSS `.explorer .card-fallback` = `hsl(var(--card))` + `.card-fallback-glow` lueur copper haut + `.card-fallback-ico` icône grande opacité .5 ; `.card-addimg` petit bouton verre en bas. Ajouter ces règles à Explorer.css — fallback **B** validé.)

- [ ] **Step 2: build + lint** → vert. **Commit**
```bash
git add src/components/explorer/DeckCard.tsx src/pages/Explorer.css
git commit -m "feat(explorer): DeckCard with fallback B + add-image button"
```

---

## Task 5: `EventDeck` (coverflow fenêtré)

**Files:** Create `src/components/explorer/EventDeck.tsx`

- [ ] **Step 1: Implémenter**
```tsx
import { deckCardStyle } from '@/lib/explorer'
import { DeckCard } from './DeckCard'
import type { EventWithScore } from '@/types/database'

interface EventDeckProps {
  events: EventWithScore[]
  activeIndex: number
  canAddImage: boolean
  onSelect: (index: number) => void
  onPrev: () => void
  onNext: () => void
  onCardClick: (event: EventWithScore) => void
  onAddImage: (event: EventWithScore) => void
}

export function EventDeck({ events, activeIndex, canAddImage, onSelect, onPrev, onNext, onCardClick, onAddImage }: EventDeckProps) {
  return (
    <div className="flow">
      <button className="arrow l" onClick={onPrev} aria-label="Précédent">
        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <div className="deck">
        {events.map((ev, i) => {
          const offset = i - activeIndex
          if (Math.abs(offset) > 3) return null // fenêtrage perf : ne pas monter les cartes lointaines
          const s = deckCardStyle(offset)
          return (
            <DeckCard
              key={ev.id}
              event={ev}
              isCenter={s.isCenter}
              canAddImage={canAddImage}
              style={{ transform: s.transform, opacity: s.opacity, filter: s.filter, zIndex: s.zIndex, pointerEvents: s.pointerEvents }}
              onClick={() => (offset === 0 ? onCardClick(ev) : onSelect(i))}
              onAddImage={onAddImage}
            />
          )
        })}
      </div>
      <button className="arrow r" onClick={onNext} aria-label="Suivant">
        <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
      </button>
    </div>
  )
}
```
(Note : `deckCardStyle` gère opacity 0 pour |offset|>2 ; le `>3 return null` est la fenêtre de montage DOM, légèrement plus large pour la transition.)

- [ ] **Step 2: build + lint** → vert. **Commit**
```bash
git add src/components/explorer/EventDeck.tsx
git commit -m "feat(explorer): EventDeck windowed coverflow"
```

---

## Task 6: `SearchSegments` (Quoi / Où / Quand)

**Files:** Create `src/components/explorer/SearchSegments.tsx`

- [ ] **Step 1: Implémenter** — barre segmentée + 3 popovers, contrôlée par le parent.
```tsx
import { useState } from 'react'
import { getTagIcon } from '@/components/ui/TagBadge'
import { PERIODS, type Period, type Zone } from '@/lib/explorer'
import type { Tag } from '@/types/database'

interface SearchSegmentsProps {
  tags: Tag[]
  selectedTags: Set<string>
  zone: Zone
  period: Period
  userDept: string | null
  onToggleTag: (value: string) => void
  onZone: (zone: Zone) => void
  onPeriod: (period: Period) => void
}

type Pop = 'quoi' | 'ou' | 'quand' | null

export function SearchSegments({ tags, selectedTags, zone, period, userDept, onToggleTag, onZone, onPeriod }: SearchSegmentsProps) {
  const [open, setOpen] = useState<Pop>(null)
  const toggle = (p: Pop) => setOpen(o => (o === p ? null : p))
  const quoiLabel = selectedTags.size === 0 ? 'Tous les festivals' : `${selectedTags.size} catégorie${selectedTags.size > 1 ? 's' : ''}`
  const ouLabel = zone === 'france' ? 'Toute la France' : (userDept ? `Mon coin (${userDept})` : 'Près de moi')
  const quandLabel = PERIODS.find(p => p.value === period)?.label ?? ''
  return (
    <div className="top">
      <div className="searchbar">
        <button className={'seg' + (open === 'quoi' ? ' active' : '')} onClick={() => toggle('quoi')}>
          <span className="seg-l">Quoi</span><span className="seg-v">{quoiLabel}</span>
        </button>
        <span className="seg-sep" />
        <button className={'seg' + (open === 'ou' ? ' active' : '')} onClick={() => toggle('ou')}>
          <span className="seg-l">Où</span><span className="seg-v">{ouLabel}</span>
        </button>
        <span className="seg-sep" />
        <button className={'seg' + (open === 'quand' ? ' active' : '')} onClick={() => toggle('quand')}>
          <span className="seg-l">Quand</span><span className="seg-v">{quandLabel}</span>
        </button>
        <button className="seg-search" aria-label="Fermer" onClick={() => setOpen(null)}>
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" /></svg>
        </button>
      </div>

      {open === 'quoi' && (
        <div className="pop open" onClick={e => e.stopPropagation()}>
          <h4>Type de festival</h4>
          <div className="catgrid">
            {tags.map(t => {
              const Icon = getTagIcon(t.value)
              return (
                <button key={t.value} className={'catchip' + (selectedTags.has(t.value) ? ' on' : '')} onClick={() => onToggleTag(t.value)}>
                  <Icon size={14} strokeWidth={2} /> {t.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {open === 'ou' && (
        <div className="pop open" onClick={e => e.stopPropagation()}>
          <h4>Localisation</h4>
          <div className="peropts">
            <button className={'peropt' + (zone === 'mine' ? ' on' : '')} onClick={() => onZone('mine')} disabled={!userDept}>
              📍 Mon coin{userDept ? ` (${userDept})` : ''}
            </button>
            <button className={'peropt' + (zone === 'france' ? ' on' : '')} onClick={() => onZone('france')}>🇫🇷 Toute la France</button>
          </div>
        </div>
      )}

      {open === 'quand' && (
        <div className="pop open" onClick={e => e.stopPropagation()}>
          <h4>Période</h4>
          <div className="peropts">
            {PERIODS.map(p => (
              <button key={p.value} className={'peropt' + (period === p.value ? ' on' : '')} onClick={() => onPeriod(p.value)}>{p.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```
(Le `Tag` type vient de `@/types/database` ; vérifier le nom du champ `value`/`label` contre `useTags`/`TagBadge` — aligner si différent. La fermeture au clic extérieur est gérée par le parent Task 8.)

- [ ] **Step 2: build + lint** → vert. **Commit**
```bash
git add src/components/explorer/SearchSegments.tsx
git commit -m "feat(explorer): SearchSegments (Quoi/Où/Quand popovers)"
```

---

## Task 7: `EventDock` (infos + amis + CTAs)

**Files:** Create `src/components/explorer/EventDock.tsx`

- [ ] **Step 1: Implémenter**
```tsx
import { Link } from 'react-router-dom'
import { useFriendsOnEvent } from '@/hooks/use-participations'
import { getTagIcon } from '@/components/ui/TagBadge'
import type { EventWithScore } from '@/types/database'

function fmt(ev: EventWithScore) {
  const d = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const range = ev.end_date !== ev.start_date ? `${d(ev.start_date)} – ${d(ev.end_date)}` : d(ev.start_date)
  return `${range} · ${ev.city}${ev.department ? ` (${ev.department})` : ''}`
}

interface EventDockProps {
  event: EventWithScore
  eyebrow: string
  saved: boolean
  onToggleSave: () => void
}

export function EventDock({ event, eyebrow, saved, onToggleSave }: EventDockProps) {
  const { friends } = useFriendsOnEvent(event.id)
  const tag = event.tags?.[0] ?? 'autre'
  const Icon = getTagIcon(tag)
  return (
    <div className="dockinfo">
      {eyebrow && <span className="eyb">{eyebrow}</span>}
      <h2>{event.name}</h2>
      <div className="tagline">
        <span className="ctag"><Icon size={12} strokeWidth={2} /> {tag}</span>
        <span className="meta">{fmt(event)}</span>
      </div>
      {friends.length > 0 && (
        <div className="fr">
          <span className="cav">
            {friends.slice(0, 4).map(f => (
              <span key={f.actor_id} title={f.label ?? ''}>{(f.label ?? '?').slice(0, 1).toUpperCase()}</span>
            ))}
          </span>
          {friends.length === 1 ? `${friends[0].label ?? 'Un compagnon'} y va` : `${friends.length} compagnons y vont`}
        </div>
      )}
      <div className="cta">
        <Link to={`/evenement/${event.id}`} className="btn btn-p">Voir le festival</Link>
        <button type="button" className="btn btn-star" onClick={onToggleSave} aria-pressed={saved}>
          {saved ? '★ Repéré' : '★ Repérer'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: build + lint** → vert. **Commit**
```bash
git add src/components/explorer/EventDock.tsx
git commit -m "feat(explorer): EventDock (info + compagnons-going + CTAs)"
```

---

## Task 8: `Explorer.tsx` — orchestration

**Files:** Rewrite `src/pages/Explorer.tsx`

- [ ] **Step 1: Réécrire**
Exigences :
- `import './Explorer.css'`, hooks : `useEvents`, `useTags`, `useAuth` (`{ profile, currentActor, isAdmin }`), `useMyParticipations`, `addParticipation`, `removeParticipation` (de `@/hooks/use-participations`), `supabase` (upload image).
- État : `selectedTags: Set<string>`, `zone: Zone`, `period: Period` (persistés localStorage `explorer-filters`, lecture initiale comme l'actuel), `activeIndex`, autoplay timer.
- `displayed = useMemo(() => composeFilter(allEvents, { tags, zone, period }, { department: profile?.department ?? null, now }), [...])`. À chaque changement de filtre → `setActiveIndex(0)`.
- **Autoplay** : `useEffect` `setInterval(() => setActiveIndex(i => (i+1) % displayed.length), 4500)` ; reset sur interaction ; pause si `displayed.length <= 1` ; respecter `window.matchMedia('(prefers-reduced-motion: reduce)')` (pas d'autoplay).
- **Clavier** : `useEffect` keydown ←/→ → prev/next.
- **Fermeture popovers** : listener click document → fermer (passer un `onCloseAll` à `SearchSegments`, ou gérer l'état `open` ici ; ici on garde l'état `open` DANS SearchSegments mais on ferme via un overlay/clic — simplifier : SearchSegments gère son `open`, et un clic sur la scène (hors `.searchbar`/`.pop`) appelle une ref de fermeture). Implémentation simple : un wrapper `onClick` sur `.stagebody` qui ne propage pas vers les popovers (déjà `stopPropagation` sur `.pop`).
- **canAddImage** = `currentActor?.kind === 'entity' || isAdmin`.
- **saved(eventId)** : dérivé de `useMyParticipations()` (un event est « repéré » s'il a une participation de l'acteur courant). `toggleSave(event)` : si participation existe → `removeParticipation(id)` ; sinon `addParticipation({ event_id: event.id, actor_id: currentActor.id, acted_by_user_id: <auth uid>, status: 'interesse', visibility: 'amis' })` — **suivre exactement le pattern de `src/pages/EventPage.tsx` `handleJoin`** pour les champs requis (actor_id/acted_by_user_id/status/visibility). Puis `refetch()`.
- **onAddImage(event)** : ouvrir un `<input type="file" accept="image/*">` (ref caché), au change → réutiliser le **pipeline d'upload de `EventForm`** (compression → `supabase.storage.from(<bucket>).upload(...)` → `getPublicUrl`) puis `supabase.from('events').update({ image_url }).eq('id', event.id)` (l'RLS `events_update_exposant` autorise) → refetch events. Extraire la compression/upload de EventForm dans un util partagé `src/lib/event-image.ts` si besoin (sinon dupliquer le bloc à l'identique).
- **eyebrow** par carte : court contextuel (ex. `zone==='mine' ? 'Près de toi' : 'À découvrir'` ; `period==='recent' ? 'Nouveau' : …`). Simple, dérivé.
- Layout JSX :
```tsx
<div className="explorer">
  <AmbientBackground imageUrl={displayed[activeIndex]?.image_url ?? null} />
  <div className="stagewrap">
    <SearchSegments ... />
    <div className="stagebody">
      {loading ? <DeckSkeleton/> : displayed.length > 0 ? (
        <>
          <EventDeck events={displayed} activeIndex={activeIndex} canAddImage={canAddImage}
            onSelect={i => { setActiveIndex(i); resetAutoplay() }}
            onPrev={() => { go(-1); resetAutoplay() }} onNext={() => { go(1); resetAutoplay() }}
            onCardClick={ev => navigate(`/evenement/${ev.id}`)} onAddImage={onAddImage} />
          <div className="infozone">
            <EventDock event={displayed[activeIndex]} eyebrow={eyebrowFor(displayed[activeIndex])}
              saved={isSaved(displayed[activeIndex].id)} onToggleSave={() => toggleSave(displayed[activeIndex])} />
          </div>
        </>
      ) : <ExplorerEmpty/>}
    </div>
    <div className="bottombar">
      <div className="counter"><b>{displayed.length ? activeIndex + 1 : 0}</b> / {displayed.length} festivals trouvés</div>
    </div>
  </div>
</div>
```
(`go(d)` = `setActiveIndex(i => (i + d + displayed.length) % displayed.length)`. `DeckSkeleton`/`ExplorerEmpty` = petits sous-composants locaux réutilisant l'esprit de l'état vide actuel.)

- [ ] **Step 2: Vérifier** : `pnpm exec tsc --noEmit`, `pnpm build`, `pnpm lint`, `pnpm vitest run` → tout vert. Aligner les noms réels (`useEvents` retour, champ tag `value/label`, bucket d'upload) en lisant les fichiers concernés ; corriger sans placeholder.

- [ ] **Step 3: Commit**
```bash
git add src/pages/Explorer.tsx src/lib/event-image.ts
git commit -m "feat(explorer): coverflow orchestration (filters, autoplay, repérer, add-image)"
```

---

## Task 9: Vérification finale + bump

**Files:** Modify `package.json`

- [ ] **Step 1: Test manuel (dev, données réelles)** : `/explorer` → coverflow des 68 events réels (images chargées) ; navigation flèches/clavier/clic + autoplay ; Quoi/Où/Quand filtrent + compteur ; carte sans image = fallback B + bouton « Ajouter une image » visible **uniquement** si acteur exposant/admin ; « ★ Repérer » bascule (vérifier en base la participation `interesse`) ; « X y vont » sur events avec compagnons participants ; mobile (réduire la fenêtre <1080px) = coverflow rétréci + bottombar ; toggle nuit/jour lisible (verre/ombres). 
- [ ] **Step 2: Bump** `package.json` (patch).
- [ ] **Step 3: Gates** : `pnpm build && pnpm lint && pnpm vitest run` verts + `grep "hsl(#" dist/assets/*.css` vide.
- [ ] **Step 4: Commit + push**
```bash
git add -A && git commit -m "chore(explorer): bump version after coverflow DA integration" && git push
```

---

## Self-Review
**Couverture spec :** coverflow desktop (Task 5) + rétréci mobile (Task 2 media-query) ✓ · Quoi/Où/Quand (Task 6) ✓ · Où=zone sans km (Task 1 composeFilter + Task 6) ✓ · fallback B + bouton image exposant/admin (Tasks 4, 8) ✓ · édition collaborative réutilisée, pas de backend (Task 8 update direct) ✓ · « X y vont » réels (Task 7 useFriendsOnEvent) ✓ · CTAs Voir/Repérer (Task 7 + toggle Task 8) ✓ · compteur/état vide/skeleton (Task 8) ✓ · perf fenêtrage+lazy (Task 5 + `loading="lazy"` sur les `<img>` à ajouter en Task 4) ✓ · gotchas svg/texte/ombres (Task 2) ✓ · helpers testés (Task 1) ✓.
**Placeholders :** code complet pour helpers/composants ; les 3 points « aligner au réel » (champ tag value/label, pattern handleJoin, bucket upload) renvoient à des fichiers existants nommés — à lire et reproduire, pas inventer.
**Cohérence types :** `deckCardStyle`/`periodToRange`/`composeFilter`/`Period`/`Zone`/`ExplorerFilters` définis Task 1 et utilisés Tasks 5/6/8 avec les mêmes signatures. `canAddImage` (bool) propagé Deck→DeckCard. `EventWithScore` partout.
**Lazy images :** ajouter `loading="lazy"` sur `<img>` de DeckCard (Task 4) — noté.
