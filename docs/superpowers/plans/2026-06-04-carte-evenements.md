# Page Carte des événements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une page `/carte` avec une vraie carte MapLibre recolorée Fellowship, pins colorés par tag, clusters, et l'avatar de l'acteur sur ses festivals « Accepté ».

**Architecture:** MapLibre GL JS (vendoré, lazy-loadé) + tuiles OpenFreeMap sans clé, recolorées à la volée selon le thème jour/nuit. Données = events géocodés → GeoJSON (transform pur testable) → source clusterisée + marqueurs avatar. Carte gratuite ; teaser Pro « réseau » cadenassé.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, MapLibre GL JS, OpenFreeMap, Supabase.

**Spec :** `docs/superpowers/specs/2026-06-04-carte-evenements-design.md`

---

## File structure

**Créés**
- `src/lib/map-data.ts` — transforms purs : events→GeoJSON, filtre, bounds (testable)
- `src/lib/map-data.test.ts`
- `src/lib/map-style.ts` — palettes + `applyParchmentColors(map, theme)`
- `src/lib/map-style.test.ts`
- `src/hooks/use-map-events.ts` — charge events + participations + avatar acteur
- `src/components/map/MapCanvas.tsx` — MapLibre, restyle, source/couches, marqueurs avatar
- `src/components/map/MapFilters.tsx` — recherche + chips catégories
- `src/components/map/EventPanel.tsx` — liste des events visibles
- `src/pages/Carte.tsx` — orchestration

**Modifiés**
- `src/lib/navModel.ts` — clé `carte`
- `src/components/layout/Sidebar.tsx` + `AccountSheet.tsx` — icône `Map`
- `src/components/layout/AppLayout.tsx` — `/carte` immersif
- `src/App.tsx` — route lazy
- `src/index.css` — styles marqueur avatar + pulse
- `package.json` — `maplibre-gl`

---

## Task 1 : Plomberie (dep, nav, route, page stub)

**Files:**
- Modify: `src/lib/navModel.ts`, `src/components/layout/Sidebar.tsx`, `src/components/layout/AccountSheet.tsx`, `src/components/layout/AppLayout.tsx`, `src/App.tsx`, `package.json`
- Create: `src/pages/Carte.tsx`

- [ ] **Step 1 : Installer MapLibre**

Run: `pnpm add maplibre-gl`
Expected: `maplibre-gl` ajouté aux dependencies.

- [ ] **Step 2 : Ajouter la clé `carte` au navModel**

Dans `src/lib/navModel.ts` :

Type `NavKey` (ligne 1) — ajouter `'carte'` :
```ts
export type NavKey = 'explorer' | 'mes-dates' | 'mes-createurs' | 'profil' | 'reglages' | 'dashboard' | 'calendrier' | 'communaute' | 'vitrine' | 'carte'
```

Dans `NAV_DEFS`, après la ligne `calendrier: {...}` :
```ts
  carte:           { key: 'carte',           to: '/carte',           label: 'Carte',          icon: 'Map',             pro: false, built: true },
```

`PERSON_NAV` et `EXPOSANT_NAV` — insérer `'carte'` après `'calendrier'` :
```ts
const PERSON_NAV: NavKey[] = ['explorer', 'calendrier', 'carte', 'mes-createurs', 'reglages']
const EXPOSANT_NAV: NavKey[] = ['explorer', 'dashboard', 'calendrier', 'carte', 'communaute', 'vitrine', 'reglages']
```

Dans `RESERVED_TOP` (Set) — ajouter `'carte'` à la liste :
```ts
  'explorer', 'calendrier', 'carte', 'communaute', 'tableau-de-bord', 'dashboard',
```

- [ ] **Step 3 : Mapper l'icône `Map`**

Dans `src/components/layout/Sidebar.tsx` ligne 4, ajouter `Map` à l'import lucide, et à la ligne 13 dans `ICONS` :
```ts
import { CalendarDays, CalendarClock, Compass, User, Settings, Heart, LayoutDashboard, Store, Users, Shield, Lock, Sparkles, PanelLeftClose, PanelLeft, Map, type LucideIcon } from 'lucide-react'
```
```ts
const ICONS: Record<string, LucideIcon> = { Compass, CalendarClock, Heart, LayoutDashboard, CalendarDays, Users, Store, User, Settings, Map }
```

Dans `src/components/layout/AccountSheet.tsx` : repérer l'import lucide et l'objet `ICONS` (même pattern que Sidebar) et y ajouter `Map` aux deux endroits, à l'identique.

- [ ] **Step 4 : Rendre `/carte` immersif dans AppLayout**

Dans `src/components/layout/AppLayout.tsx`, ligne 18, après `const isExplorer = ...` :
```ts
  const isCarte = location.pathname === '/carte'
```
Ligne 23-24, inclure la carte (plein écran, sans SearchBar, sans scroll, comme l'Explorer) :
```ts
  const hideSearchBar = isExplorer || isVitrine || isCarte
  const noScroll = isExplorer || isCarte
```

- [ ] **Step 5 : Créer la page stub**

Create `src/pages/Carte.tsx` :
```tsx
export default function Carte() {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
      Carte — en construction
    </div>
  )
}
```

- [ ] **Step 6 : Brancher la route (lazy)**

Dans `src/App.tsx` : en haut, ajouter l'import lazy + Suspense. Ajouter à l'import React existant `Suspense` et `lazy` (ou une ligne dédiée) :
```tsx
import { lazy, Suspense } from 'react'
const Carte = lazy(() => import('@/pages/Carte'))
```
Puis, à côté de la route `/calendrier` (~ligne 99) :
```tsx
          <Route path="/carte" element={<AuthenticatedApp><Suspense fallback={<div className="absolute inset-0" />}><Carte /></Suspense></AuthenticatedApp>} />
```

- [ ] **Step 7 : Vérifier build + nav**

Run: `pnpm build`
Expected: `tsc -b` + build OK. (Vérif manuelle ensuite : `/carte` apparaît dans la nav et s'ouvre sur le stub.)

- [ ] **Step 8 : Commit**

```bash
git add -A
git commit -m "feat(carte): plomberie nav/route/guard + dep maplibre + page stub"
```

---

## Task 2 : `map-data.ts` — transforms purs (TDD)

**Files:**
- Create: `src/lib/map-data.ts`, `src/lib/map-data.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

Create `src/lib/map-data.test.ts` :
```ts
import { describe, it, expect } from 'vitest'
import { eventsToGeoJSON, eventsInBounds, filterFeatures, type EventForMap } from './map-data'
import { getTagLandingColor } from '@/components/ui/TagBadge'

const ev = (over: Partial<EventForMap> = {}): EventForMap => ({
  id: 'e1', slug: 'fest-1', name: 'Médiévale de Paris', city: 'Paris',
  start_date: '2026-07-01', end_date: '2026-07-02',
  tags: ['fete-medievale'], latitude: 48.85, longitude: 2.35, ...over,
})

describe('eventsToGeoJSON', () => {
  it('produit des Point en [lng, lat]', () => {
    const fc = eventsToGeoJSON([ev()], [])
    expect(fc.features).toHaveLength(1)
    expect(fc.features[0].geometry.coordinates).toEqual([2.35, 48.85])
  })
  it('color = couleur du tag primaire (tags[0])', () => {
    const fc = eventsToGeoJSON([ev({ tags: ['geek'] })], [])
    expect(fc.features[0].properties.color).toBe(getTagLandingColor('geek'))
  })
  it("accepted=true seulement si participation 'confirme' sur cet event", () => {
    const fc = eventsToGeoJSON([ev()], [{ event_id: 'e1', status: 'confirme' }])
    expect(fc.features[0].properties.accepted).toBe(true)
  })
  it("accepted=false si statut 'interesse'", () => {
    const fc = eventsToGeoJSON([ev()], [{ event_id: 'e1', status: 'interesse' }])
    expect(fc.features[0].properties.accepted).toBe(false)
  })
  it('ignore les events sans coords', () => {
    expect(eventsToGeoJSON([ev({ latitude: null })], []).features).toHaveLength(0)
  })
})

describe('eventsInBounds', () => {
  it('ne garde que les features dans la bbox', () => {
    const fc = eventsToGeoJSON([ev(), ev({ id: 'e2', longitude: 9.0, latitude: 45.0 })], [])
    const within = eventsInBounds(fc.features, { west: 2, south: 48, east: 3, north: 49 })
    expect(within.map(f => f.properties.id)).toEqual(['e1'])
  })
})

describe('filterFeatures', () => {
  const fc = eventsToGeoJSON([
    ev({ id: 'a', name: 'Médiévale de Provins', city: 'Provins', tags: ['fete-medievale'] }),
    ev({ id: 'b', name: 'Geek Con', city: 'Lyon', tags: ['geek'] }),
  ], [])
  it('filtre par tag (primaire)', () => {
    expect(filterFeatures(fc.features, { tag: 'geek', query: '' }).map(f => f.properties.id)).toEqual(['b'])
  })
  it('filtre par requête sur nom ou ville (insensible casse)', () => {
    expect(filterFeatures(fc.features, { tag: null, query: 'provins' }).map(f => f.properties.id)).toEqual(['a'])
  })
  it('sans filtre, renvoie tout', () => {
    expect(filterFeatures(fc.features, { tag: null, query: '' })).toHaveLength(2)
  })
})
```

- [ ] **Step 2 : Lancer les tests (échec attendu)**

Run: `pnpm vitest run src/lib/map-data.test.ts`
Expected: FAIL — `Failed to resolve import './map-data'`.

- [ ] **Step 3 : Écrire l'implémentation**

Create `src/lib/map-data.ts` :
```ts
import { getTagLandingColor } from '@/components/ui/TagBadge'

export type EventForMap = {
  id: string
  slug: string | null
  name: string
  city: string
  start_date: string
  end_date: string
  tags: string[] | null
  latitude: number | null
  longitude: number | null
}

export type ParticipationLite = { event_id: string; status: string }
export type Bounds = { west: number; south: number; east: number; north: number }

export type MapFeatureProps = {
  id: string
  slug: string | null
  name: string
  city: string
  startDate: string
  endDate: string
  primaryTag: string
  color: string
  accepted: boolean
}

export type MapFeature = {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: MapFeatureProps
}

export type MapFeatureCollection = { type: 'FeatureCollection'; features: MapFeature[] }

export function eventsToGeoJSON(events: EventForMap[], parts: ParticipationLite[]): MapFeatureCollection {
  const acceptedIds = new Set(parts.filter(p => p.status === 'confirme').map(p => p.event_id))
  const features: MapFeature[] = []
  for (const e of events) {
    if (e.latitude == null || e.longitude == null) continue
    const primaryTag = e.tags?.[0] ?? ''
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [e.longitude, e.latitude] },
      properties: {
        id: e.id, slug: e.slug, name: e.name, city: e.city,
        startDate: e.start_date, endDate: e.end_date,
        primaryTag, color: getTagLandingColor(primaryTag), accepted: acceptedIds.has(e.id),
      },
    })
  }
  return { type: 'FeatureCollection', features }
}

export function eventsInBounds(features: MapFeature[], b: Bounds): MapFeature[] {
  return features.filter(f => {
    const [lng, lat] = f.geometry.coordinates
    return lng >= b.west && lng <= b.east && lat >= b.south && lat <= b.north
  })
}

export function filterFeatures(features: MapFeature[], opts: { tag: string | null; query: string }): MapFeature[] {
  const q = opts.query.trim().toLowerCase()
  return features.filter(f => {
    if (opts.tag && f.properties.primaryTag !== opts.tag) return false
    if (q && !(`${f.properties.name} ${f.properties.city}`.toLowerCase().includes(q))) return false
    return true
  })
}
```

- [ ] **Step 4 : Lancer les tests (succès attendu)**

Run: `pnpm vitest run src/lib/map-data.test.ts`
Expected: PASS (tous les `describe`).

- [ ] **Step 5 : Commit**

```bash
git add src/lib/map-data.ts src/lib/map-data.test.ts
git commit -m "feat(carte): map-data (events→GeoJSON, bounds, filtres) + tests"
```

---

## Task 3 : `map-style.ts` — recoloration (palettes testées)

**Files:**
- Create: `src/lib/map-style.ts`, `src/lib/map-style.test.ts`

- [ ] **Step 1 : Écrire le test de palette (échec attendu)**

Create `src/lib/map-style.test.ts` :
```ts
import { describe, it, expect } from 'vitest'
import { paletteFor } from './map-style'

describe('paletteFor', () => {
  it('nuit : terres sombres chaudes', () => {
    expect(paletteFor('night').land).toBe('#1a120f')
  })
  it('jour : terres parchemin claires', () => {
    expect(paletteFor('day').land).toBe('#efe7d8')
  })
  it('chaque palette a toutes les clés', () => {
    for (const t of ['night', 'day'] as const) {
      const p = paletteFor(t)
      expect(Object.keys(p).sort()).toEqual(
        ['boundary','building','green','halo','land','landAlt','road','roadMajor','text','water'].sort()
      )
    }
  })
})
```

- [ ] **Step 2 : Lancer (échec attendu)**

Run: `pnpm vitest run src/lib/map-style.test.ts`
Expected: FAIL — import non résolu.

- [ ] **Step 3 : Écrire l'implémentation**

Create `src/lib/map-style.ts` :
```ts
import type { Map as MlMap } from 'maplibre-gl'
import type { Theme } from '@/lib/theme'

export type Palette = {
  land: string; landAlt: string; water: string; green: string; building: string
  road: string; roadMajor: string; text: string; halo: string; boundary: string
}

export const PALETTES: Record<Theme, Palette> = {
  night: {
    land: '#1a120f', landAlt: '#1f1714', water: '#100c0b', green: '#1f261d', building: '#241a16',
    road: '#3a2a20', roadMajor: '#5a3c26', text: '#cbb9a8', halo: '#120b09', boundary: 'rgba(232,131,58,0.18)',
  },
  day: {
    land: '#efe7d8', landAlt: '#e8dcc6', water: '#dcc7ad', green: '#d8d2bc', building: '#e3d6bf',
    road: '#cdbfa6', roadMajor: '#c2a988', text: '#5a4636', halo: '#f3ecdf', boundary: 'rgba(184,90,46,0.25)',
  },
}

export function paletteFor(theme: Theme): Palette {
  return PALETTES[theme]
}

// Recolore le style positron en place selon le thème. Tolérant : une couche sans la
// propriété ciblée est simplement ignorée (try/catch).
export function applyParchmentColors(map: MlMap, theme: Theme): void {
  const p = paletteFor(theme)
  const layers = map.getStyle().layers ?? []
  for (const l of layers) {
    const id = l.id.toLowerCase()
    try {
      if (l.type === 'background') {
        map.setPaintProperty(l.id, 'background-color', p.land)
      } else if (l.type === 'fill') {
        if (/water|ocean|sea|bay/.test(id)) map.setPaintProperty(l.id, 'fill-color', p.water)
        else if (/wood|forest|park|grass|wetland|landcover|vegetation/.test(id)) map.setPaintProperty(l.id, 'fill-color', p.green)
        else if (/building/.test(id)) map.setPaintProperty(l.id, 'fill-color', p.building)
        else map.setPaintProperty(l.id, 'fill-color', p.landAlt)
      } else if (l.type === 'line') {
        if (/water|river|canal/.test(id)) map.setPaintProperty(l.id, 'line-color', p.water)
        else if (/motorway|trunk|primary/.test(id)) map.setPaintProperty(l.id, 'line-color', p.roadMajor)
        else if (/boundary|admin/.test(id)) map.setPaintProperty(l.id, 'line-color', p.boundary)
        else map.setPaintProperty(l.id, 'line-color', p.road)
      } else if (l.type === 'symbol') {
        map.setPaintProperty(l.id, 'text-color', p.text)
        map.setPaintProperty(l.id, 'text-halo-color', p.halo)
        map.setPaintProperty(l.id, 'text-halo-width', 1.4)
      }
    } catch {
      /* couche sans cette propriété de peinture */
    }
  }
}
```

- [ ] **Step 4 : Lancer (succès attendu)**

Run: `pnpm vitest run src/lib/map-style.test.ts`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/map-style.ts src/lib/map-style.test.ts
git commit -m "feat(carte): map-style (palettes nuit/jour + applyParchmentColors)"
```

---

## Task 4 : `use-map-events.ts` — chargement des données

**Files:**
- Create: `src/hooks/use-map-events.ts`

- [ ] **Step 1 : Écrire le hook**

Create `src/hooks/use-map-events.ts` :
```ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { eventsToGeoJSON, type EventForMap, type MapFeatureCollection, type ParticipationLite } from '@/lib/map-data'

const EMPTY: MapFeatureCollection = { type: 'FeatureCollection', features: [] }

export function useMapEvents() {
  const { currentActor } = useAuth()
  const [data, setData] = useState<MapFeatureCollection>(EMPTY)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarLabel, setAvatarLabel] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      const { data: events, error: e1 } = await supabase
        .from('events')
        .select('id, slug, name, city, start_date, end_date, tags, latitude, longitude')
        .not('latitude', 'is', null)
      if (e1) {
        if (!cancelled) { setError(e1.message); setLoading(false) }
        return
      }
      let parts: ParticipationLite[] = []
      if (currentActor) {
        const { data: p } = await supabase
          .from('participations')
          .select('event_id, status')
          .eq('actor_id', currentActor.id)
        parts = (p ?? []) as ParticipationLite[]
        const { data: pub } = await supabase
          .from('actor_public')
          .select('avatar_url, label')
          .eq('actor_id', currentActor.id)
          .maybeSingle()
        if (!cancelled) {
          setAvatarUrl(pub?.avatar_url ?? null)
          setAvatarLabel(pub?.label ?? currentActor.label ?? '')
        }
      }
      if (cancelled) return
      setData(eventsToGeoJSON((events ?? []) as EventForMap[], parts))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [currentActor])

  return { data, avatarUrl, avatarLabel, loading, error }
}
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `pnpm build`
Expected: `tsc -b` OK (le hook n'est pas encore consommé).

- [ ] **Step 3 : Commit**

```bash
git add src/hooks/use-map-events.ts
git commit -m "feat(carte): hook use-map-events (events + participations + avatar)"
```

---

## Task 5 : `MapCanvas.tsx` + styles marqueur

**Files:**
- Create: `src/components/map/MapCanvas.tsx`
- Modify: `src/index.css`

> Composant d'intégration MapLibre : vérification **manuelle** (pas de `render()` RTL). La logique pure qu'il consomme est déjà testée.

- [ ] **Step 1 : Ajouter les styles marqueur dans `src/index.css`**

À la fin de `src/index.css`, ajouter :
```css
/* Marqueurs carte (acteur "Accepté") */
.map-avatar {
  width: 38px; height: 38px; border-radius: 50%;
  border: 2px solid hsl(var(--copper, 24 85% 56%));
  box-shadow: 0 0 0 2px rgba(232,131,58,.35), 0 2px 10px rgba(0,0,0,.45);
  background-size: cover; background-position: center; cursor: pointer;
  background-color: hsl(var(--copper)); color: #170f0e;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-heading); font-weight: 800; font-size: 15px;
}
.map-avatar::after {
  content: ''; position: absolute; inset: -5px; border-radius: 50%;
  border: 1.5px solid rgba(240,161,84,.55); animation: map-pulse 2.4s infinite ease-out;
}
@keyframes map-pulse { 0% { transform: scale(.55); opacity: .85 } 100% { transform: scale(2.1); opacity: 0 } }
.map-popup .maplibregl-popup-content {
  background: hsl(var(--card)); color: hsl(var(--foreground));
  border: 1px solid hsl(var(--border)); border-radius: 14px; padding: 12px 14px;
  font-family: var(--font-body); box-shadow: 0 16px 40px rgba(0,0,0,.45);
}
.map-popup .maplibregl-popup-tip { border-top-color: hsl(var(--card)); }
.map-vignette {
  position: absolute; inset: 0; pointer-events: none; z-index: 5;
  background: radial-gradient(ellipse 55% 62% at 50% 52%, transparent 42%, rgba(18,11,9,.45) 80%, rgba(18,11,9,.7) 100%);
}
.light .map-vignette {
  background: radial-gradient(ellipse 55% 62% at 50% 52%, transparent 45%, rgba(60,48,40,.10) 82%, rgba(60,48,40,.18) 100%);
}
```

- [ ] **Step 2 : Écrire le composant**

Create `src/components/map/MapCanvas.tsx` :
```tsx
import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { applyParchmentColors } from '@/lib/map-style'
import type { MapFeature, Bounds, MapFeatureProps } from '@/lib/map-data'
import type { Theme } from '@/lib/theme'
import { formatDateRange } from '@/lib/calendar-format'

const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'
const FRANCE_CENTER: [number, number] = [2.6, 46.7]

interface MapCanvasProps {
  features: MapFeature[]
  theme: Theme
  avatarUrl: string | null
  avatarLabel: string
  onBoundsChange: (b: Bounds) => void
  onSelect: (slug: string | null, id: string) => void
}

function buildAvatarEl(url: string | null, label: string): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'map-avatar'
  if (url) el.style.backgroundImage = `url("${url}")`
  else el.textContent = (label.trim()[0] ?? '★').toUpperCase()
  return el
}

function popupMarkup(p: MapFeatureProps): string {
  const date = formatDateRange(new Date(p.startDate), new Date(p.endDate))
  const safe = (s: string) => s.replace(/</g, '&lt;')
  return `<div class="map-pop">
    <strong style="font-family:var(--font-heading);font-size:15px">${safe(p.name)}</strong>
    <div style="color:#f0a154;font-weight:600;font-size:12.5px;margin-top:2px">${safe(date)}</div>
    <div style="color:var(--font-color-lowtitle);font-size:12.5px">${safe(p.city)}</div>
  </div>`
}

export function MapCanvas({ features, theme, avatarUrl, avatarLabel, onBoundsChange, onSelect }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const dataRef = useRef({ features, avatarUrl, avatarLabel })
  const themeRef = useRef(theme)
  const onBoundsRef = useRef(onBoundsChange)
  const onSelectRef = useRef(onSelect)
  dataRef.current = { features, avatarUrl, avatarLabel }
  onBoundsRef.current = onBoundsChange
  onSelectRef.current = onSelect

  function refresh() {
    const map = mapRef.current
    if (!map || !map.getSource('events')) return
    const { features: feats, avatarUrl: url, avatarLabel: label } = dataRef.current
    const accepted = feats.filter(f => f.properties.accepted)
    const rest = feats.filter(f => !f.properties.accepted)
    ;(map.getSource('events') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features: rest })
    markersRef.current.forEach(m => m.remove())
    markersRef.current = accepted.map(f => {
      const el = buildAvatarEl(url, label)
      el.addEventListener('click', () => {
        new maplibregl.Popup({ className: 'map-popup', offset: 22 })
          .setLngLat(f.geometry.coordinates).setHTML(popupMarkup(f.properties)).addTo(map)
        onSelectRef.current(f.properties.slug ?? null, f.properties.id)
      })
      return new maplibregl.Marker({ element: el }).setLngLat(f.geometry.coordinates).addTo(map)
    })
  }

  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: FRANCE_CENTER,
      zoom: 5.15,
      dragRotate: false,
      attributionControl: { compact: true },
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')

    map.on('style.load', () => {
      applyParchmentColors(map, themeRef.current)
      if (!map.getSource('events')) {
        map.addSource('events', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterRadius: 46, clusterMaxZoom: 11 })
        map.addLayer({ id: 'clusters', type: 'circle', source: 'events', filter: ['has', 'point_count'],
          paint: { 'circle-color': '#e8833a', 'circle-radius': ['step', ['get', 'point_count'], 15, 10, 21, 30, 27], 'circle-stroke-width': 2, 'circle-stroke-color': '#ffd9a8' } })
        map.addLayer({ id: 'cluster-count', type: 'symbol', source: 'events', filter: ['has', 'point_count'],
          layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 13 }, paint: { 'text-color': '#170f0e' } })
        map.addLayer({ id: 'unclustered', type: 'circle', source: 'events', filter: ['!', ['has', 'point_count']],
          paint: { 'circle-color': ['get', 'color'], 'circle-radius': 7, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff2e0' } })
      }
      refresh()
    })

    map.on('moveend', () => {
      const b = map.getBounds()
      onBoundsRef.current({ west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() })
    })
    map.on('click', 'clusters', (e) => {
      const f = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0]
      const clusterId = f.properties?.cluster_id as number
      ;(map.getSource('events') as maplibregl.GeoJSONSource).getClusterExpansionZoom(clusterId).then(zoom => {
        map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom })
      })
    })
    map.on('click', 'unclustered', (e) => {
      const f = e.features?.[0]
      if (!f) return
      const p = f.properties as unknown as MapFeatureProps
      new maplibregl.Popup({ className: 'map-popup', offset: 14 })
        .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number]).setHTML(popupMarkup(p)).addTo(map)
      onSelectRef.current(p.slug ?? null, p.id)
    })
    for (const layer of ['clusters', 'unclustered']) {
      map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = '' })
    }

    return () => { map.remove(); mapRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    themeRef.current = theme
    const map = mapRef.current
    if (map && map.isStyleLoaded()) applyParchmentColors(map, theme)
  }, [theme])

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [features, avatarUrl, avatarLabel])

  return (
    <>
      <div ref={containerRef} className="absolute inset-0" />
      <div className="map-vignette" />
    </>
  )
}
```

- [ ] **Step 3 : Vérifier la compilation**

Run: `pnpm build`
Expected: `tsc -b` OK. Si erreur de type sur `GeoJSON.Point` : les types GeoJSON viennent avec maplibre-gl (namespace global `GeoJSON`) — OK. (Le composant n'est pas encore monté.)

- [ ] **Step 4 : Commit**

```bash
git add src/components/map/MapCanvas.tsx src/index.css
git commit -m "feat(carte): MapCanvas (MapLibre, clusters, pins tag, marqueurs avatar)"
```

---

## Task 6 : `MapFilters`, `EventPanel`, assemblage `Carte`

**Files:**
- Create: `src/components/map/MapFilters.tsx`, `src/components/map/EventPanel.tsx`
- Modify: `src/pages/Carte.tsx`

- [ ] **Step 1 : `MapFilters` (recherche + chips catégories)**

Create `src/components/map/MapFilters.tsx` :
```tsx
import { Search } from 'lucide-react'
import { useTags } from '@/hooks/use-tags'

interface MapFiltersProps {
  query: string
  onQuery: (v: string) => void
  tag: string | null
  onTag: (slug: string | null) => void
}

export function MapFilters({ query, onQuery, tag, onTag }: MapFiltersProps) {
  const { tags } = useTags()
  return (
    <div className="absolute top-3 left-3 right-3 z-10 flex items-center gap-2 flex-wrap pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-card/80 backdrop-blur border border-border px-4 py-2 text-sm text-muted-foreground w-full max-w-sm">
        <Search size={15} />
        <input
          value={query}
          onChange={e => onQuery(e.target.value)}
          placeholder="Rechercher un festival, une ville…"
          className="bg-transparent outline-none flex-1 text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <div className="pointer-events-auto flex gap-1.5 rounded-full bg-card/80 backdrop-blur border border-border p-1 overflow-x-auto">
        <button onClick={() => onTag(null)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${tag === null ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Tous</button>
        {tags.map(t => (
          <button key={t.value} onClick={() => onTag(t.value)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${tag === t.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{t.label}</button>
        ))}
      </div>
    </div>
  )
}
```

> `useTags()` renvoie `{ tags, loading }` où `tags: { value, label, bg, color }[]` — le slug est `t.value`.

- [ ] **Step 2 : `EventPanel` (liste des events visibles)**

Create `src/components/map/EventPanel.tsx` :
```tsx
import { getTagEmoji } from '@/components/ui/TagBadge'
import { formatDateRange } from '@/lib/calendar-format'
import type { MapFeature } from '@/lib/map-data'

interface EventPanelProps {
  features: MapFeature[]
  onSelect: (slug: string | null, id: string) => void
}

export function EventPanel({ features, onSelect }: EventPanelProps) {
  return (
    <div className="absolute z-10 bg-card/85 backdrop-blur border border-border shadow-2xl
        md:top-20 md:right-3 md:w-80 md:rounded-2xl md:max-h-[70vh]
        bottom-0 left-0 right-0 rounded-t-2xl max-h-[45vh] overflow-y-auto p-4">
      <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-3">
        {features.length} festival{features.length > 1 ? 's' : ''} dans la vue
      </h2>
      <div className="space-y-1">
        {features.map(f => {
          const p = f.properties
          return (
            <button key={p.id} onClick={() => onSelect(p.slug, p.id)}
              className="w-full flex gap-3 p-2.5 rounded-xl hover:bg-accent text-left transition-colors">
              <div className="w-10 h-10 rounded-lg flex-none flex items-center justify-center text-lg border border-border"
                style={{ background: 'linear-gradient(135deg,#3a2a20,#241917)' }}>{getTagEmoji(p.primaryTag)}</div>
              <div className="min-w-0">
                <div className="font-display font-bold text-sm truncate">{p.name}</div>
                <div className="text-xs"><span className="text-primary font-semibold">{formatDateRange(new Date(p.startDate), new Date(p.endDate))}</span> · <span className="text-muted-foreground">{p.city}</span></div>
              </div>
            </button>
          )
        })}
        {features.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Déplace la carte pour voir des festivals.</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 3 : Assembler la page `Carte`**

Replace `src/pages/Carte.tsx` :
```tsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@/hooks/use-theme'
import { useMapEvents } from '@/hooks/use-map-events'
import { MapCanvas } from '@/components/map/MapCanvas'
import { MapFilters } from '@/components/map/MapFilters'
import { EventPanel } from '@/components/map/EventPanel'
import { eventsInBounds, filterFeatures, type Bounds } from '@/lib/map-data'

export default function Carte() {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const { data, avatarUrl, avatarLabel, error } = useMapEvents()
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [bounds, setBounds] = useState<Bounds | null>(null)

  const visible = useMemo(() => filterFeatures(data.features, { query, tag }), [data.features, query, tag])
  const inView = useMemo(() => (bounds ? eventsInBounds(visible, bounds) : visible), [visible, bounds])

  const openEvent = (slug: string | null, id: string) => navigate(slug ? `/e/${slug}` : `/evenement/${id}`)

  return (
    <div className="relative w-full h-full">
      <MapCanvas
        features={visible}
        theme={theme}
        avatarUrl={avatarUrl}
        avatarLabel={avatarLabel}
        onBoundsChange={setBounds}
        onSelect={openEvent}
      />
      <MapFilters query={query} onQuery={setQuery} tag={tag} onTag={setTag} />
      <EventPanel features={inView} onSelect={openEvent} />
      {error && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-card/90 border border-border rounded-full px-4 py-2 text-sm text-muted-foreground">
          Carte momentanément indisponible.
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4 : Vérifier build + tests**

Run: `pnpm build && pnpm vitest run src/lib/map-data.test.ts src/lib/map-style.test.ts`
Expected: build OK, tests PASS.

- [ ] **Step 5 : Vérification manuelle**

Run: `pnpm dev` → ouvrir `/carte`.
Expected : carte recolorée cadrée France, clusters cuivre, pins colorés en zoomant, panneau liste synchronisé, recherche/filtres actifs. Basculer thème jour/nuit → la carte se recolore.

- [ ] **Step 6 : Commit**

```bash
git add src/components/map/MapFilters.tsx src/components/map/EventPanel.tsx src/pages/Carte.tsx
git commit -m "feat(carte): filtres, panneau events synchronisé, assemblage page"
```

---

## Task 7 : Teaser Pro « réseau » + finalisation

**Files:**
- Modify: `src/pages/Carte.tsx`

> v1 = teaser cadenassé seulement (l'agrégation « qui y va » est câblée dans un lot suivant, cf. spec §4).

- [ ] **Step 1 : Ajouter le bouton calque réseau (cadenas si free)**

Dans `src/pages/Carte.tsx`, ajouter les imports :
```tsx
import { Lock, Users } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { planForActor } from '@/lib/navModel'
```
Dans le composant, calculer `isPro` exactement comme la Sidebar :
```tsx
  const { currentActor, currentActorRow } = useAuth()
  const isPro = planForActor(currentActor, currentActorRow) === 'pro'
```
Ajouter, avant la balise fermante `</div>` finale :
```tsx
      <button
        onClick={() => { if (!isPro) navigate('/abonnement') }}
        className="absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-full bg-card/85 backdrop-blur border border-border px-4 py-2 text-sm font-semibold text-foreground"
        title={isPro ? 'Voir qui de ton réseau y va' : 'Réservé aux abonnés Pro'}
      >
        <Users size={15} className="text-primary" />
        Qui de mon réseau y va
        {!isPro && <Lock size={13} className="text-muted-foreground" />}
      </button>
```

- [ ] **Step 2 : Vérifier build**

Run: `pnpm build`
Expected: OK.

- [ ] **Step 3 : Vérification manuelle du teaser**

`/carte` : bouton « Qui de mon réseau y va » avec cadenas en compte gratuit, sans cadenas en Pro ; clic en gratuit → `/abonnement`.

- [ ] **Step 4 : Commit**

```bash
git add src/pages/Carte.tsx
git commit -m "feat(carte): teaser Pro 'qui de mon réseau y va' (cadenas si gratuit)"
```

---

## Finalisation

- [ ] **Suite de tests complète** : `pnpm test` → tout PASS.
- [ ] **Bump version** : patch dans `src/changelog.ts` (nouvelle entrée) + `package.json` (depuis 0.7.221), commit `chore: bump vX.Y.Z`.
- [ ] **Push** : `git push` sur `main`.
- [ ] **Bonus séparé** : commit du logo « . » cuivre (cf. mémoire `project_logo_dot`) — tâche indépendante, après la carte.

---

## Notes d'exécution

- **Lazy-load** : la route `/carte` est `React.lazy` → MapLibre (~200 kB gzip) ne charge que sur cette page (Task 1 step 6).
- **Pas de CDN en prod** : MapLibre est vendoré via `pnpm add` ; OpenFreeMap reste une URL de tuiles (service gratuit) — repli visuel géré.
- **Anti-régression** : `git diff HEAD` avant d'éditer `navModel.ts`/`AppLayout.tsx`/`App.tsx` (fichiers vivants).
- **react-hooks lint** : MapCanvas utilise des refs pour les callbacks + `eslint-disable` ciblés sur les effects d'init/refresh (cf. mémoire `project_react_hooks_lint_gotchas`).
- **Hors scope** : agrégation réseau « qui y va », activation pays étranger, globe 3D.
