# Géolocalisation mondiale + sélecteur de point sur carte — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Géocoder les événements partout dans le monde (pas seulement la France) et permettre à l'exposant de placer/corriger le point sur une carte, à la création comme à l'édition.

**Architecture:** On étend la couche pure `geocode.ts` (BAN d'abord, Photon/komoot en secours mondial), on crée un composant carte à pin-centré (`PointPickerMap`) et un champ partagé (`LocationField` = autocomplete + carte d'ajustement) consommé par les deux formulaires d'event. L'édition persiste désormais `latitude/longitude/geo_precision` (trou actuel).

**Tech Stack:** React 19 + TS, MapLibre GL (déjà présent), Vitest, BAN (`api-adresse.data.gouv.fr`) + Photon (`photon.komoot.io`), Supabase.

**Spec:** `docs/superpowers/specs/2026-06-05-geolocalisation-mondiale-selecteur-carte-design.md`

---

## Structure des fichiers

- **Modifier** `src/lib/geocode.ts` — ajout type `country`/`department`, Photon, fusion BAN+Photon, fallback mondial.
- **Modifier** `src/lib/geocode.test.ts` — tests Photon + fusion + fallback.
- **Modifier** `src/components/events/AddressAutocomplete.tsx` — département tenant compte du pays.
- **Créer** `src/components/map/PointPickerMap.tsx` — carte MapLibre à pin centré.
- **Créer** `src/components/events/LocationField.tsx` — autocomplete + bouton « Ajuster sur la carte » (hybride desktop inline / mobile bottom-sheet).
- **Modifier** `src/components/events/EventForm.tsx` — branche `LocationField` à la création.
- **Modifier** `src/pages/EventPage.tsx` — branche `LocationField` à l'édition + persiste les coords.

---

## Task 1 : Type unifié + `parsePhotonFeature`

**Files:**
- Modify: `src/lib/geocode.ts`
- Test: `src/lib/geocode.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter dans `src/lib/geocode.test.ts`, dans le bloc d'imports en tête, `parsePhotonFeature` :

```ts
import {
  parseBanFeature,
  parsePhotonFeature,
  filterByDepartment,
  departmentFromCitycode,
  searchAddresses,
  geocodeCity,
} from './geocode'
```

Puis ajouter ce describe à la fin du fichier :

```ts
const photonFeature = (props: Record<string, unknown> = {}) => ({
  geometry: { coordinates: [7.1620, 46.8065] as [number, number] }, // [lng, lat] = Fribourg CH
  properties: { name: 'Fribourg', city: 'Fribourg', postcode: '1700', state: 'Fribourg', countrycode: 'CH', ...props },
})

describe('parsePhotonFeature', () => {
  it('inverse [lng, lat] et mappe ville/postcode/pays', () => {
    const r = parsePhotonFeature(photonFeature())
    expect(r.lat).toBe(46.8065)
    expect(r.lng).toBe(7.1620)
    expect(r.city).toBe('Fribourg')
    expect(r.postcode).toBe('1700')
    expect(r.country).toBe('ch') // minuscule
    expect(r.citycode).toBe('') // pas d'INSEE hors France
  })
  it('département = state pour l’étranger', () => {
    expect(parsePhotonFeature(photonFeature()).department).toBe('Fribourg')
  })
  it('label avec numéro + rue quand présents', () => {
    const r = parsePhotonFeature(photonFeature({ housenumber: '12', street: 'Rue de Lausanne' }))
    expect(r.label).toContain('12 Rue de Lausanne')
    expect(r.label).toContain('1700 Fribourg')
  })
  it('score décroît avec le rang', () => {
    expect(parsePhotonFeature(photonFeature(), 0).score).toBeGreaterThan(parsePhotonFeature(photonFeature(), 3).score)
  })
})
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `pnpm test -- geocode`
Expected: FAIL — `parsePhotonFeature` n'est pas exporté.

- [ ] **Step 3 : Implémenter**

Dans `src/lib/geocode.ts`, étendre le type `GeocodeResult` (ajout `department?` et `country?`) et le commentaire `citycode` :

```ts
export type GeocodeResult = {
  label: string
  city: string
  postcode: string
  citycode: string // code INSEE (France uniquement, '' à l'étranger)
  department?: string // libellé région/canton (étranger). En France, dérivé du citycode.
  country?: string // code pays ISO minuscule, ex. 'fr', 'ch'
  lat: number
  lng: number
  score: number
}
```

Dans `parseBanFeature`, marquer le pays France (ajouter `country: 'fr'` au retour) :

```ts
  return {
    label: p.label ?? '',
    city: p.city ?? '',
    postcode: p.postcode ?? '',
    citycode: p.citycode ?? '',
    country: 'fr',
    lat,
    lng,
    score: p.score ?? 0,
  }
```

Ajouter le bloc Photon (après `parseBanFeature`) :

```ts
const PHOTON_SEARCH = 'https://photon.komoot.io/api/'

type PhotonFeature = {
  geometry: { coordinates: [number, number] } // [lng, lat]
  properties: {
    name?: string; street?: string; housenumber?: string
    city?: string; postcode?: string; state?: string; county?: string
    country?: string; countrycode?: string
  }
}

// Pure : feature Photon -> GeocodeResult. Photon n'a pas de score ; on le dérive du rang.
export function parsePhotonFeature(f: PhotonFeature, rank = 0): GeocodeResult {
  const [lng, lat] = f.geometry.coordinates
  const p = f.properties
  const line = [p.housenumber, p.street].filter(Boolean).join(' ') || p.name || ''
  const place = [p.postcode, p.city].filter(Boolean).join(' ')
  const label = [line, place, p.country].filter(Boolean).join(', ')
  return {
    label,
    city: p.city ?? p.name ?? '',
    postcode: p.postcode ?? '',
    citycode: '',
    department: p.state ?? p.county ?? '',
    country: (p.countrycode ?? '').toLowerCase(),
    lat,
    lng,
    score: Math.max(0, 1 - rank * 0.1),
  }
}
```

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `pnpm test -- geocode`
Expected: PASS (tous les describe, dont les anciens BAN).

- [ ] **Step 5 : Commit**

```bash
git add src/lib/geocode.ts src/lib/geocode.test.ts
git commit -m "feat(geocode): parsePhotonFeature + champs country/department (couverture mondiale)"
```

---

## Task 2 : `searchAddresses` fusionne BAN + Photon

**Files:**
- Modify: `src/lib/geocode.ts`
- Test: `src/lib/geocode.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

Remplacer le `describe('searchAddresses', ...)` existant par cette version (on garde les 3 cas, on ajoute la fusion). Le faux fetch branche selon l'URL :

```ts
describe('searchAddresses', () => {
  const banJson = { features: [feature()] } // Paris (BAN)
  const photonJson = { features: [photonFeature()] } // Fribourg CH (Photon)
  const routedFetch = (async (url: string) => {
    const isPhoton = String(url).includes('photon.komoot')
    return { ok: true, json: async () => (isPhoton ? photonJson : banJson) }
  }) as unknown as typeof fetch

  it('renvoie [] sous 3 caractères (sans fetch)', async () => {
    const r = await searchAddresses('ab', (() => { throw new Error('no fetch') }) as unknown as typeof fetch)
    expect(r).toEqual([])
  })
  it('fusionne BAN (en tête) puis Photon', async () => {
    const r = await searchAddresses('frib', routedFetch)
    expect(r).toHaveLength(2)
    expect(r[0].country).toBe('fr') // BAN d'abord
    expect(r[1].country).toBe('ch') // Photon ensuite
  })
  it('une source en échec ne casse pas l’autre', async () => {
    const banOnlyFails = (async (url: string) => {
      if (String(url).includes('photon.komoot')) return { ok: true, json: async () => photonJson }
      throw new Error('BAN down')
    }) as unknown as typeof fetch
    const r = await searchAddresses('frib', banOnlyFails)
    expect(r).toHaveLength(1)
    expect(r[0].country).toBe('ch')
  })
  it('dédoublonne par coordonnées', async () => {
    const dupFetch = (async () => ({ ok: true, json: async () => ({ features: [feature(), feature()] }) })) as unknown as typeof fetch
    const r = await searchAddresses('paris', dupFetch)
    expect(r).toHaveLength(1)
  })
})
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `pnpm test -- geocode`
Expected: FAIL — `searchAddresses` n'interroge encore que la BAN (« fusionne » et « une source en échec » échouent).

- [ ] **Step 3 : Implémenter**

Dans `src/lib/geocode.ts`, remplacer la fonction `searchAddresses` par un dispatcher BAN+Photon. Extraire l'ancien corps en helper privé `searchBan`, ajouter `searchPhoton` et `dedupeResults` :

```ts
// Autocomplete BAN (France). Privé.
async function searchBan(query: string, fetchFn: typeof fetch): Promise<GeocodeResult[]> {
  try {
    const res = await fetchFn(`${BAN_SEARCH}?q=${encodeURIComponent(query)}&limit=5`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.features ?? []).map(parseBanFeature)
  } catch {
    return []
  }
}

// Autocomplete Photon (mondial). Privé.
async function searchPhoton(query: string, fetchFn: typeof fetch): Promise<GeocodeResult[]> {
  try {
    const res = await fetchFn(`${PHOTON_SEARCH}?q=${encodeURIComponent(query)}&limit=5`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.features ?? []).map((f: PhotonFeature, i: number) => parsePhotonFeature(f, i))
  } catch {
    return []
  }
}

// Dédoublonne par coordonnées arrondies (garde la 1re occurrence = BAN prioritaire).
function dedupeResults(rs: GeocodeResult[]): GeocodeResult[] {
  const seen = new Set<string>()
  const out: GeocodeResult[] = []
  for (const r of rs) {
    const key = `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(r)
  }
  return out
}

// Autocomplete : BAN (France, précis) en tête + Photon (mondial) ensuite.
export async function searchAddresses(q: string, fetchFn: typeof fetch = fetch): Promise<GeocodeResult[]> {
  const query = q.trim()
  if (query.length < 3) return []
  const [ban, photon] = await Promise.all([
    searchBan(query, fetchFn),
    searchPhoton(query, fetchFn),
  ])
  return dedupeResults([...ban, ...photon])
}
```

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `pnpm test -- geocode`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/geocode.ts src/lib/geocode.test.ts
git commit -m "feat(geocode): searchAddresses fusionne BAN + Photon (dédup, tolérant aux pannes)"
```

---

## Task 3 : `geocodeCity` — fallback Photon mondial

**Files:**
- Modify: `src/lib/geocode.ts`
- Test: `src/lib/geocode.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter dans le `describe('geocodeCity', ...)` :

```ts
  it('bascule sur Photon quand la BAN ne renvoie rien (ville étrangère)', async () => {
    const routed = (async (url: string) => {
      if (String(url).includes('photon.komoot')) return { ok: true, json: async () => ({ features: [photonFeature()] }) }
      return { ok: true, json: async () => ({ features: [] }) } // BAN vide
    }) as unknown as typeof fetch
    const r = await geocodeCity('Fribourg', '1700 (CH)', routed)
    expect(r?.country).toBe('ch')
    expect(r?.lat).toBe(46.8065)
  })
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `pnpm test -- geocode`
Expected: FAIL — `geocodeCity` renvoie `null` (BAN vide, pas de fallback).

- [ ] **Step 3 : Implémenter**

Dans `src/lib/geocode.ts`, renommer l'actuelle `geocodeCity` en helper privé `geocodeCityBan`, ajouter `geocodeCityPhoton`, et exposer `geocodeCity` qui enchaîne :

```ts
// Fallback centre-ville BAN, désambiguïsé par département. Privé.
async function geocodeCityBan(city: string, department: string, fetchFn: typeof fetch): Promise<GeocodeResult | null> {
  try {
    const res = await fetchFn(`${BAN_SEARCH}?q=${encodeURIComponent(city)}&type=municipality&limit=5`)
    if (!res.ok) return null
    const data = await res.json()
    const results: GeocodeResult[] = (data.features ?? []).map(parseBanFeature)
    const filtered = filterByDepartment(results, department)
    return filtered[0] ?? results[0] ?? null
  } catch {
    return null
  }
}

// Fallback centre-ville Photon (mondial). Privé.
async function geocodeCityPhoton(city: string, fetchFn: typeof fetch): Promise<GeocodeResult | null> {
  try {
    const res = await fetchFn(`${PHOTON_SEARCH}?q=${encodeURIComponent(city)}&limit=1`)
    if (!res.ok) return null
    const data = await res.json()
    const f = (data.features ?? [])[0]
    return f ? parsePhotonFeature(f, 0) : null
  } catch {
    return null
  }
}

// Fallback centre-ville : BAN (France) puis Photon (reste du monde).
export async function geocodeCity(city: string, department: string, fetchFn: typeof fetch = fetch): Promise<GeocodeResult | null> {
  const c = city.trim()
  if (!c) return null
  return (await geocodeCityBan(c, department, fetchFn)) ?? (await geocodeCityPhoton(c, fetchFn))
}
```

Note : `filterByDepartment` avec un département non numérique (ex. `"1700 (CH)"`) ne matche aucun citycode → `geocodeCityBan` renvoie `results[0]` ou null ; le `??` bascule alors sur Photon. Comportement voulu.

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `pnpm test -- geocode`
Expected: PASS (anciens cas BAN inclus).

- [ ] **Step 5 : Commit**

```bash
git add src/lib/geocode.ts src/lib/geocode.test.ts
git commit -m "feat(geocode): geocodeCity bascule sur Photon hors France"
```

---

## Task 4 : `AddressAutocomplete` — département selon le pays

**Files:**
- Modify: `src/components/events/AddressAutocomplete.tsx`

- [ ] **Step 1 : Implémenter (pas de test unitaire — composant ; vérif au build)**

Dans `src/components/events/AddressAutocomplete.tsx`, fonction `pick`, remplacer le calcul du département pour gérer l'étranger. Remplacer :

```ts
    onSelect({
      address: r.label,
      lat: r.lat,
      lng: r.lng,
      city: r.city,
      department: departmentFromCitycode(r.citycode),
      postcode: r.postcode,
    })
```

par :

```ts
    onSelect({
      address: r.label,
      lat: r.lat,
      lng: r.lng,
      city: r.city,
      department: r.country && r.country !== 'fr' ? (r.department ?? '') : departmentFromCitycode(r.citycode),
      postcode: r.postcode,
    })
```

(`departmentFromCitycode` reste importé et utilisé pour la France.)

- [ ] **Step 2 : Vérifier le build**

Run: `pnpm build`
Expected: succès TypeScript, aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/components/events/AddressAutocomplete.tsx
git commit -m "feat(geocode): AddressAutocomplete renseigne le département/canton étranger"
```

---

## Task 5 : Composant `PointPickerMap`

**Files:**
- Create: `src/components/map/PointPickerMap.tsx`

- [ ] **Step 1 : Créer le composant**

Carte MapLibre montée une fois, **pin fixe au centre**, la carte glisse dessous. Émet les coords du centre à chaque `moveend`. Calque l'instanciation sur `MapCanvas.tsx` (rAF, ResizeObserver, `applyParchmentColors`, cleanup `map.remove()`).

```tsx
import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapPin } from 'lucide-react'
import { applyParchmentColors } from '@/lib/map-style'
import { useTheme } from '@/hooks/use-theme'

const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'
const FRANCE_CENTER: [number, number] = [2.6, 46.7]

interface PointPickerMapProps {
  center: { lat: number; lng: number } | null
  onMove: (coords: { lat: number; lng: number }) => void
}

// Carte de sélection : un pin fixe au centre de la vue ; l'utilisateur déplace la
// carte sous le pin. `onMove` reçoit le centre à chaque fin de déplacement.
export function PointPickerMap({ center, onMove }: PointPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const onMoveRef = useRef(onMove)
  const { theme } = useTheme()
  const themeRef = useRef(theme)

  useEffect(() => { onMoveRef.current = onMove })

  useEffect(() => {
    themeRef.current = theme
    const map = mapRef.current
    if (map && map.isStyleLoaded()) applyParchmentColors(map, theme)
  }, [theme])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let map: maplibregl.Map | null = null
    let ro: ResizeObserver | null = null
    const start: [number, number] = center ? [center.lng, center.lat] : FRANCE_CENTER

    const raf = requestAnimationFrame(() => {
      const m = new maplibregl.Map({
        container,
        style: STYLE_URL,
        center: start,
        zoom: center ? 13 : 5.2,
        dragRotate: false,
        attributionControl: { compact: true },
      })
      map = m
      mapRef.current = m
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
      ro = new ResizeObserver(() => m.resize())
      ro.observe(container)
      m.on('moveend', () => {
        const c = m.getCenter()
        onMoveRef.current({ lat: c.lat, lng: c.lng })
      })
      m.on('style.load', () => {
        applyParchmentColors(m, themeRef.current)
        m.resize()
      })
    })

    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
      map?.remove()
      mapRef.current = null
    }
    // Monté une seule fois : `center` n'est qu'un point de départ ; les déplacements
    // ultérieurs viennent de l'utilisateur, pas d'un re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Le conteneur MapLibre doit être un enfant flex en flux (flex-1 min-h-0) ; le parent
  // (LocationField) lui donne une hauteur fixe via un wrapper flex col.
  return (
    <div ref={containerRef} className="relative flex-1 min-h-0 overflow-hidden rounded-xl">
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full">
        <MapPin className="h-9 w-9 drop-shadow-md" style={{ color: 'var(--tag-accent, #e8b04b)' }} fill="currentColor" strokeWidth={1} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier le build**

Run: `pnpm build`
Expected: succès TypeScript.

- [ ] **Step 3 : Commit**

```bash
git add src/components/map/PointPickerMap.tsx
git commit -m "feat(map): PointPickerMap — carte à pin centré pour choisir un point"
```

---

## Task 6 : Composant `LocationField` (hybride)

**Files:**
- Create: `src/components/events/LocationField.tsx`

- [ ] **Step 1 : Créer le composant**

Combine `AddressAutocomplete` + bouton « Ajuster sur la carte ». Une seule instance de `PointPickerMap` montée à la fois (desktop inline OU mobile sheet, selon `matchMedia`) pour éviter deux cartes simultanées.

```tsx
import { useState, useEffect } from 'react'
import { Map as MapIcon, X } from 'lucide-react'
import { AddressAutocomplete, type AddressSelection } from './AddressAutocomplete'
import { PointPickerMap } from '@/components/map/PointPickerMap'

export type LocationValue = {
  address: string
  city: string
  department: string
  postcode: string
  latitude: number | null
  longitude: number | null
  geo_precision: 'precise' | 'city' | null
}

interface LocationFieldProps {
  value: LocationValue
  onChange: (next: LocationValue) => void
  inputClass?: string
}

export function LocationField({ value, onChange, inputClass = '' }: LocationFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const handleAddressSelect = (sel: AddressSelection) => {
    onChange({
      ...value,
      address: sel.address,
      city: sel.city || value.city,
      department: sel.department || value.department,
      postcode: sel.postcode || value.postcode,
      latitude: sel.lat,
      longitude: sel.lng,
      geo_precision: 'precise',
    })
  }

  // Édition manuelle du texte après sélection -> on invalide les coords précises.
  const handleAddressChange = (address: string) => {
    onChange(value.geo_precision === 'precise'
      ? { ...value, address, latitude: null, longitude: null, geo_precision: null }
      : { ...value, address })
  }

  // Déplacement du pin -> coords précises ; on NE touche PAS aux champs texte (ville déjà bonne).
  const handlePinMove = (c: { lat: number; lng: number }) => {
    onChange({ ...value, latitude: c.lat, longitude: c.lng, geo_precision: 'precise' })
  }

  const center = value.latitude != null && value.longitude != null
    ? { lat: value.latitude, lng: value.longitude }
    : null

  return (
    <div>
      <AddressAutocomplete
        value={value.address}
        onChange={handleAddressChange}
        onSelect={handleAddressSelect}
        inputClass={inputClass}
      />
      <button
        type="button"
        onClick={() => setPickerOpen(o => !o)}
        className="mt-2 inline-flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
      >
        <MapIcon className="h-4 w-4" />
        {pickerOpen ? 'Fermer la carte' : 'Ajuster sur la carte'}
      </button>

      {/* Desktop : carte inline dépliable */}
      {pickerOpen && isDesktop && (
        <div className="mt-2">
          <div className="flex h-64 flex-col">
            <PointPickerMap center={center} onMove={handlePinMove} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Glisse la carte pour centrer le pin sur le lieu.</p>
        </div>
      )}

      {/* Mobile : feuille plein écran */}
      {pickerOpen && !isDesktop && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border p-4">
            <span className="font-semibold">Placer le lieu</span>
            <button type="button" onClick={() => setPickerOpen(false)} aria-label="Fermer">
              <X className="h-5 w-5" />
            </button>
          </div>
          <PointPickerMap center={center} onMove={handlePinMove} />
          <div className="p-4">
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
            >
              Valider cette position
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier le build**

Run: `pnpm build`
Expected: succès TypeScript.

- [ ] **Step 3 : Commit**

```bash
git add src/components/events/LocationField.tsx
git commit -m "feat(events): LocationField — autocomplete + carte d'ajustement (hybride mobile/desktop)"
```

---

## Task 7 : Brancher `LocationField` à la création (`EventForm`)

**Files:**
- Modify: `src/components/events/EventForm.tsx`

- [ ] **Step 1 : Remplacer l'état `geo` par un état `location`**

Dans `src/components/events/EventForm.tsx` :

1. Import : ajouter `import { LocationField, type LocationValue } from './LocationField'` et **retirer** `import { AddressAutocomplete, type AddressSelection } from './AddressAutocomplete'`.

2. Retirer de `form` les champs `city`, `department`, `address` (ils passent dans `location`). Le state `form` garde le reste (`name`, `description`, dates, urls, etc.).

3. Remplacer le state `geo` par :

```ts
  const [location, setLocation] = useState<LocationValue>({
    address: '', city: '', department: '', postcode: '',
    latitude: null, longitude: null, geo_precision: null,
  })
```

4. Supprimer `handleAddressSelect` et `handleAddressChange` (gérés par `LocationField`).

- [ ] **Step 2 : Mettre à jour l'étape « Où et quand » (step 1)**

Remplacer le bloc adresse + les inputs Ville/Département par `LocationField` + des inputs liés à `location` :

```tsx
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Adresse ou lieu (optionnel)</label>
        <LocationField value={location} onChange={setLocation} inputClass={inputClass} />
        <p className="text-[11px] text-muted-foreground mt-1">Choisis une suggestion pour un placement précis, ou ajuste le pin sur la carte. Sinon, on situe au centre-ville.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Ville <span className="text-destructive">*</span></label>
          <input type="text" className={inputClass} placeholder="Ville" value={location.city} onChange={e => setLocation(l => ({ ...l, city: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Département <span className="text-destructive">*</span></label>
          <input type="text" className={inputClass} placeholder="Département (ex: 77)" value={location.department} onChange={e => setLocation(l => ({ ...l, department: e.target.value }))} />
        </div>
      </div>
```

- [ ] **Step 3 : Mettre à jour `canProceedStep1` et `handleSubmit`**

Remplacer :

```ts
  const canProceedStep1 = form.city && form.department && form.start_date
```

par :

```ts
  const canProceedStep1 = location.city && location.department && form.start_date
```

Dans `handleSubmit`, remplacer le bloc coords + l'objet `eventData` (champs concernés) :

```ts
      // Coords : précises si adresse/pin choisis, sinon fallback centre-ville (mondial).
      let latitude = location.latitude
      let longitude = location.longitude
      let geo_precision: 'precise' | 'city' | null = location.geo_precision
      if (geo_precision !== 'precise' && location.city && location.department) {
        const c = await geocodeCity(location.city, location.department)
        if (c) {
          latitude = c.lat
          longitude = c.lng
          geo_precision = 'city'
        }
      }

      const eventData: EventInsert = {
        name: form.name,
        description: form.description || null,
        city: location.city,
        department: location.department,
        start_date: form.start_date,
        end_date: form.end_date || form.start_date,
        registration_deadline: form.registration_deadline || null,
        registration_url: form.registration_url || null,
        external_url: form.external_url || null,
        address: location.address || null,
        latitude,
        longitude,
        geo_precision,
        contact_email: form.contact_email || null,
        registration_note: form.registration_note || null,
        tags: selectedTags,
        image_url: image_url ?? null,
        created_by_actor: currentActor.id,
        acted_by_user_id: user.id,
      }
```

(`geocodeCity` reste importé.)

- [ ] **Step 4 : Vérifier le build**

Run: `pnpm build`
Expected: succès. (Si TS signale des références résiduelles à `form.city`/`form.department`/`form.address`/`geo`, les remplacer par `location.*`.)

- [ ] **Step 5 : Commit**

```bash
git add src/components/events/EventForm.tsx
git commit -m "feat(events): création branche LocationField (adresse + carte, fallback mondial)"
```

---

## Task 8 : Brancher `LocationField` à l'édition + persister les coords (`EventPage`)

**Files:**
- Modify: `src/pages/EventPage.tsx`

C'est le correctif central : aujourd'hui l'édition n'écrit jamais `latitude/longitude/geo_precision`.

- [ ] **Step 1 : Ajouter un état `editLocation` et l'initialiser dans `startEditing`**

Dans `src/pages/EventPage.tsx` :

1. Import : `import { LocationField, type LocationValue } from '@/components/events/LocationField'`.

2. Près des autres états d'édition (`editImage`, `removeImage`), ajouter :

```ts
  const [editLocation, setEditLocation] = useState<LocationValue>({
    address: '', city: '', department: '', postcode: '',
    latitude: null, longitude: null, geo_precision: null,
  })
```

3. Dans `startEditing` (là où `setEditForm({...})` est appelé), initialiser depuis l'event :

```ts
    setEditLocation({
      address: event.address ?? '',
      city: event.city,
      department: event.department,
      postcode: '',
      latitude: event.latitude ?? null,
      longitude: event.longitude ?? null,
      geo_precision: (event.geo_precision as 'precise' | 'city' | null) ?? null,
    })
```

(Garder `city`/`department` aussi dans `editForm` n'est pas nécessaire ; on bascule sur `editLocation` — voir Step 2.)

- [ ] **Step 2 : Remplacer les inputs Ville/Département du formulaire d'édition par `LocationField` + inputs liés à `editLocation`**

Remplacer le bloc (les deux inputs Ville et Département) par :

```tsx
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Adresse ou lieu</label>
                <LocationField value={editLocation} onChange={setEditLocation} inputClass="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Ville <span className="text-destructive">*</span></label>
                  <input type="text" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Ville" value={editLocation.city} onChange={e => setEditLocation(l => ({ ...l, city: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Département <span className="text-destructive">*</span></label>
                  <input type="text" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Département (ex: 77)" value={editLocation.department} onChange={e => setEditLocation(l => ({ ...l, department: e.target.value }))} />
                </div>
              </div>
```

- [ ] **Step 3 : Persister les coords dans `handleSaveEdit`**

Dans l'objet `updates` de `handleSaveEdit`, remplacer les lignes `city`/`department` et **ajouter** address + coords. Remplacer :

```ts
      city: editForm.city,
      department: editForm.department,
```

par :

```ts
      city: editLocation.city,
      department: editLocation.department,
      address: editLocation.address || null,
      latitude: editLocation.latitude,
      longitude: editLocation.longitude,
      geo_precision: editLocation.geo_precision,
```

Puis, juste avant l'appel `updateEvent`, ré-géocoder au centre-ville si aucun point précis n'a été posé et que la ville a changé/coords manquantes :

```ts
    // Pas de point précis -> fallback centre-ville (mondial) pour ne pas garder un vieux pin.
    if (editLocation.geo_precision !== 'precise' && editLocation.city && editLocation.department) {
      const c = await geocodeCity(editLocation.city, editLocation.department)
      if (c) {
        updates.latitude = c.lat
        updates.longitude = c.lng
        updates.geo_precision = 'city'
      }
    }
```

Ajouter l'import `import { geocodeCity } from '@/lib/geocode'` en tête du fichier.

4. Mettre à jour la condition `disabled` du bouton Enregistrer si elle référence `editForm.city` : remplacer `!editForm.city` par `!editLocation.city`. La garde `handleSaveEdit` reste. Idem retirer `city`/`department` de l'objet `setEditForm({...})` dans `startEditing` (désormais portés par `editLocation`) — ou les laisser inutilisés sans risque ; préférer les retirer pour la propreté.

- [ ] **Step 4 : Vérifier le build**

Run: `pnpm build`
Expected: succès. (Corriger toute référence TS résiduelle `editForm.city`/`editForm.department` → `editLocation.*`.)

- [ ] **Step 5 : Commit**

```bash
git add src/pages/EventPage.tsx
git commit -m "fix(events): l'édition persiste enfin latitude/longitude/geo_precision (carte d'ajustement)"
```

---

## Task 9 : Vérification finale + recette manuelle + bump/push

**Files:** aucun nouveau fichier (vérification).

- [ ] **Step 1 : Suite de tests complète**

Run: `pnpm test`
Expected: tous verts (dont `geocode.test.ts` étendu).

- [ ] **Step 2 : Build de prod**

Run: `pnpm build`
Expected: succès TypeScript + bundle Vite.

- [ ] **Step 3 : Lint**

Run: `pnpm lint`
Expected: pas d'erreur (les `eslint-disable` ciblés sont volontaires).

- [ ] **Step 4 : Recette manuelle (`pnpm dev`)**

Vérifier les critères d'acceptation de la spec :
1. **Création Suisse** — nouvel event, taper « Fribourg » → une suggestion Photon « Fribourg, …, ch » apparaît ; la choisir → après création, le pin est en Suisse (≠ Lorraine).
2. **Édition / correction** — ouvrir un event, éditer, « Ajuster sur la carte », déplacer le pin, Enregistrer → en base `latitude/longitude/geo_precision` mis à jour ; recharger la carte → pin déplacé.
3. **Mobile** — en viewport < 640px, « Ajuster sur la carte » ouvre la feuille plein écran + bouton « Valider cette position » ; en desktop, carte inline.
4. **Département en toutes lettres** — créer un event avec département « Orne » sans choisir d'adresse → le fallback ne part plus sur un homonyme (vérifier le pin).

- [ ] **Step 5 : Bump version + commit + push**

Bumper `version` (patch) dans `package.json` (ex. `0.7.225` → `0.7.226`), puis :

```bash
git add package.json
git commit -m "chore: bump version (géolocalisation mondiale + sélecteur de point)"
git push
```

---

## Auto-review (couverture spec)

- Géocodeur BAN+Photon → **Task 1-3**. ✅
- Désambiguïsation département texte → **Task 3** (fallback Photon quand le filtre FR ne matche pas) + **Task 4** (département étranger renseigné). ✅
- Carte pin-centré → **Task 5**. ✅
- Champ partagé hybride → **Task 6**. ✅
- Branchement création → **Task 7**. ✅
- Branchement édition + persistance coords (trou central) → **Task 8**. ✅
- Tests pure-functions + recette manuelle MapLibre → **Task 1-3, 9**. ✅
- Hors périmètre (re-géocodage 77, reverse auto) → non implémenté, conforme. ✅
