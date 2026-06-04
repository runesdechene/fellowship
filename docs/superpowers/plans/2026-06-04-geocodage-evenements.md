# Géocodage des événements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Doter chaque événement de coordonnées `(latitude, longitude)` via la BAN (autocomplete à la saisie + fallback centre-ville + backfill de l'existant), pour préparer une future carte des événements.

**Architecture:** Une migration additive ajoute 4 colonnes nullable à `events`. Un module `geocode.ts` (fonctions pures + un fetch injectable) parle à l'API BAN sans clé ni backend. Un composant `AddressAutocomplete` branché dans `EventForm` capte les coords précises pendant la saisie ; un fallback centre-ville au submit garantit une coordonnée même sans adresse. Un script one-shot backfille l'existant.

**Tech Stack:** React 19 + TS, Vite, Vitest, Supabase, API BAN (`api-adresse.data.gouv.fr`).

**Spec :** `docs/superpowers/specs/2026-06-04-geocodage-evenements-design.md`

---

## File structure

**Créés**
- `supabase/migrations/20260604140000_events_geocoding.sql` — 4 colonnes géo sur `events`
- `src/lib/geocode.ts` — client BAN (pur + fetch injectable)
- `src/lib/geocode.test.ts` — tests unitaires (fetch mocké, pas de `render()`)
- `src/components/events/AddressAutocomplete.tsx` — input + dropdown débouncé
- `scripts/backfill-geocode.mjs` — géocodage one-shot de l'existant

**Modifiés**
- `src/types/supabase.ts` — `events` Row/Insert/Update gagnent les 4 colonnes
- `src/components/events/EventForm.tsx` — étape « Où et quand » : autocomplete + state geo + fallback au submit

> `src/hooks/use-events.ts::createEvent(event: EventInsert)` passe déjà l'objet tel quel à Supabase — **aucune édition nécessaire**, les nouveaux champs transitent par le type `EventInsert`.

---

## Task 1 : Migration + types

**Files:**
- Create: `supabase/migrations/20260604140000_events_geocoding.sql`
- Modify: `src/types/supabase.ts` (bloc `events` Row ~282-306, Insert ~309-330, Update ~332+)

- [ ] **Step 1 : Écrire la migration**

Create `supabase/migrations/20260604140000_events_geocoding.sql` :

```sql
-- Géocodage des événements : coordonnées pour la future carte.
-- Additif et rétrocompatible (colonnes nullable, ignorées par le code existant).
alter table public.events
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists geo_precision text check (geo_precision in ('precise', 'city')),
  add column if not exists address text;

comment on column public.events.geo_precision is
  'precise = coords de l''adresse choisie ; city = fallback centre-ville (city+department)';
```

- [ ] **Step 2 : Appliquer la migration**

Run: `npx supabase db push`
Expected: la migration `20260604140000_events_geocoding` est appliquée (si CLI indisponible localement, appliquer le SQL via le dashboard Supabase — voir mémoire `reference_supabase_cli`).

- [ ] **Step 3 : Étendre les types `events` dans `src/types/supabase.ts`**

Dans le bloc `events`, ajouter les 4 colonnes (respecter l'ordre alphabétique déjà en place — `address` près du début, `latitude`/`longitude` après `image_url`, `geo_precision` après `external_url`).

**Row** (valeurs lues, donc `| null`) — ajouter :
```ts
          address: string | null
          geo_precision: string | null
          latitude: number | null
          longitude: number | null
```

**Insert** (optionnelles) — ajouter :
```ts
          address?: string | null
          geo_precision?: string | null
          latitude?: number | null
          longitude?: number | null
```

**Update** (optionnelles) — ajouter :
```ts
          address?: string | null
          geo_precision?: string | null
          latitude?: number | null
          longitude?: number | null
```

- [ ] **Step 4 : Vérifier que le projet compile**

Run: `pnpm build`
Expected: `tsc -b` passe sans erreur (les types `Event`/`EventInsert` dérivent automatiquement, voir `src/types/database.ts:18,27`).

- [ ] **Step 5 : Commit**

```bash
git add supabase/migrations/20260604140000_events_geocoding.sql src/types/supabase.ts
git commit -m "feat(events): colonnes géo (lat/lng/geo_precision/address) + types"
```

---

## Task 2 : Module `geocode.ts` (TDD)

**Files:**
- Create: `src/lib/geocode.ts`
- Test: `src/lib/geocode.test.ts`

Le fetch est **injecté en paramètre** (défaut `fetch`) → tests sans réseau, pattern test pur du projet (cf. mémoire `reference_react_test_infra`).

- [ ] **Step 1 : Écrire les tests qui échouent**

Create `src/lib/geocode.test.ts` :

```ts
import { describe, it, expect } from 'vitest'
import {
  parseBanFeature,
  filterByDepartment,
  departmentFromCitycode,
  searchAddresses,
  geocodeCity,
} from './geocode'

const feature = (over: Record<string, unknown> = {}) => ({
  geometry: { coordinates: [2.3488, 48.8534] }, // [lng, lat]
  properties: { label: 'Paris', city: 'Paris', postcode: '75000', citycode: '75056', score: 0.9, ...over },
})

describe('parseBanFeature', () => {
  it('mappe [lng, lat] GeoJSON vers lat/lng (inversion correcte)', () => {
    const r = parseBanFeature(feature())
    expect(r.lat).toBe(48.8534)
    expect(r.lng).toBe(2.3488)
    expect(r.city).toBe('Paris')
    expect(r.citycode).toBe('75056')
  })
})

describe('filterByDepartment', () => {
  const mk = (citycode: string, score: number) => ({ citycode, score, label: '', city: '', postcode: '', lat: 0, lng: 0 })
  it('garde les citycodes du département, triés par score décroissant', () => {
    const out = filterByDepartment([mk('75056', 0.8), mk('77288', 0.9), mk('77001', 0.95)], '77')
    expect(out.map(r => r.citycode)).toEqual(['77001', '77288'])
  })
  it('renvoie tout si département vide', () => {
    expect(filterByDepartment([mk('75056', 1)], '')).toHaveLength(1)
  })
})

describe('departmentFromCitycode', () => {
  it('2 chiffres en métropole', () => expect(departmentFromCitycode('75056')).toBe('75'))
  it('3 chiffres pour les DOM (97x/98x)', () => expect(departmentFromCitycode('97123')).toBe('971'))
  it('gère la Corse 2A/2B', () => expect(departmentFromCitycode('2A004')).toBe('2A'))
})

describe('searchAddresses', () => {
  it('renvoie [] sous 3 caractères (sans fetch)', async () => {
    const r = await searchAddresses('ab', (() => { throw new Error('no fetch') }) as unknown as typeof fetch)
    expect(r).toEqual([])
  })
  it('parse les features BAN', async () => {
    const fakeFetch = (async () => ({ ok: true, json: async () => ({ features: [feature()] }) })) as unknown as typeof fetch
    const r = await searchAddresses('paris', fakeFetch)
    expect(r).toHaveLength(1)
    expect(r[0].lat).toBe(48.8534)
  })
  it('renvoie [] sur erreur réseau', async () => {
    const fakeFetch = (async () => { throw new Error('boom') }) as unknown as typeof fetch
    expect(await searchAddresses('paris', fakeFetch)).toEqual([])
  })
})

describe('geocodeCity', () => {
  it('désambiguïse les homonymes par département', async () => {
    const fakeFetch = (async () => ({ ok: true, json: async () => ({ features: [
      feature({ city: 'Saint-Ours', citycode: '63100', score: 0.5 }),
      feature({ city: 'Saint-Ours', citycode: '73100', score: 0.4 }),
    ] }) })) as unknown as typeof fetch
    const r = await geocodeCity('Saint-Ours', '73', fakeFetch)
    expect(r?.citycode).toBe('73100')
  })
  it('renvoie null si aucune feature', async () => {
    const fakeFetch = (async () => ({ ok: true, json: async () => ({ features: [] }) })) as unknown as typeof fetch
    expect(await geocodeCity('Nowhere', '99', fakeFetch)).toBeNull()
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run src/lib/geocode.test.ts`
Expected: FAIL — `Failed to resolve import './geocode'` / fonctions non définies.

- [ ] **Step 3 : Écrire l'implémentation minimale**

Create `src/lib/geocode.ts` :

```ts
// Client Base Adresse Nationale (BAN) — géocodage France, gratuit, sans clé, CORS ouvert.
// Le fetch est injectable pour des tests sans réseau.
const BAN_SEARCH = 'https://api-adresse.data.gouv.fr/search/'

export type GeocodeResult = {
  label: string
  city: string
  postcode: string
  citycode: string // code INSEE
  lat: number
  lng: number
  score: number
}

type BanFeature = {
  geometry: { coordinates: [number, number] } // [lng, lat]
  properties: { label?: string; city?: string; postcode?: string; citycode?: string; score?: number }
}

// Pure : feature GeoJSON BAN -> GeocodeResult. BAN renvoie [lng, lat], on inverse.
export function parseBanFeature(f: BanFeature): GeocodeResult {
  const [lng, lat] = f.geometry.coordinates
  const p = f.properties
  return {
    label: p.label ?? '',
    city: p.city ?? '',
    postcode: p.postcode ?? '',
    citycode: p.citycode ?? '',
    lat,
    lng,
    score: p.score ?? 0,
  }
}

// Pure : département (2 chiffres, 3 pour les DOM, 2A/2B pour la Corse) depuis un code INSEE.
export function departmentFromCitycode(citycode: string): string {
  if (/^9[78]/.test(citycode)) return citycode.slice(0, 3)
  return citycode.slice(0, 2)
}

// Pure : ne garde que les résultats du département, triés par score décroissant.
export function filterByDepartment(results: GeocodeResult[], department: string): GeocodeResult[] {
  const dep = department.trim()
  if (!dep) return results
  return results
    .filter(r => r.citycode.startsWith(dep))
    .sort((a, b) => b.score - a.score)
}

// Autocomplete : adresses correspondant à la requête (>= 3 caractères).
export async function searchAddresses(q: string, fetchFn: typeof fetch = fetch): Promise<GeocodeResult[]> {
  const query = q.trim()
  if (query.length < 3) return []
  try {
    const res = await fetchFn(`${BAN_SEARCH}?q=${encodeURIComponent(query)}&limit=5`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.features ?? []).map(parseBanFeature)
  } catch {
    return []
  }
}

// Fallback centre-ville : géocode une commune, désambiguïsée par département.
export async function geocodeCity(city: string, department: string, fetchFn: typeof fetch = fetch): Promise<GeocodeResult | null> {
  const c = city.trim()
  if (!c) return null
  try {
    const res = await fetchFn(`${BAN_SEARCH}?q=${encodeURIComponent(c)}&type=municipality&limit=5`)
    if (!res.ok) return null
    const data = await res.json()
    const results: GeocodeResult[] = (data.features ?? []).map(parseBanFeature)
    const filtered = filterByDepartment(results, department)
    return filtered[0] ?? results[0] ?? null
  } catch {
    return null
  }
}
```

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

Run: `pnpm vitest run src/lib/geocode.test.ts`
Expected: PASS (tous les `describe`).

- [ ] **Step 5 : Commit**

```bash
git add src/lib/geocode.ts src/lib/geocode.test.ts
git commit -m "feat(geocode): client BAN (searchAddresses/geocodeCity) + tests"
```

---

## Task 3 : Composant `AddressAutocomplete`

**Files:**
- Create: `src/components/events/AddressAutocomplete.tsx`

> Non testé via `render()` (contrainte RTL du projet, mémoire `reference_react_test_infra`) — la logique qu'il consomme est déjà couverte par `geocode.test.ts`. Vérification manuelle à la fin.

- [ ] **Step 1 : Écrire le composant**

Create `src/components/events/AddressAutocomplete.tsx` :

```tsx
import { useState, useEffect, useRef } from 'react'
import { MapPin } from 'lucide-react'
import { searchAddresses, departmentFromCitycode, type GeocodeResult } from '@/lib/geocode'

export type AddressSelection = {
  address: string
  lat: number
  lng: number
  city: string
  department: string
  postcode: string
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect: (selection: AddressSelection) => void
  inputClass?: string
}

export function AddressAutocomplete({ value, onChange, onSelect, inputClass = '' }: AddressAutocompleteProps) {
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [open, setOpen] = useState(false)
  const skipNextSearch = useRef(false)

  useEffect(() => {
    // Ne pas relancer une recherche juste après une sélection (on vient d'écrire le label).
    if (skipNextSearch.current) {
      skipNextSearch.current = false
      return
    }
    if (value.trim().length < 3) {
      setResults([])
      setOpen(false)
      return
    }
    const timer = setTimeout(async () => {
      const found = await searchAddresses(value)
      setResults(found)
      setOpen(found.length > 0)
    }, 300)
    return () => clearTimeout(timer)
  }, [value])

  const pick = (r: GeocodeResult) => {
    skipNextSearch.current = true
    setResults([])
    setOpen(false)
    onChange(r.label)
    onSelect({
      address: r.label,
      lat: r.lat,
      lng: r.lng,
      city: r.city,
      department: departmentFromCitycode(r.citycode),
      postcode: r.postcode,
    })
  }

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          className={`${inputClass} pl-9`}
          placeholder="Rechercher une adresse ou un lieu…"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          {results.map((r, i) => (
            <li key={`${r.citycode}-${i}`}>
              <button
                type="button"
                onClick={() => pick(r)}
                className="w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent"
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `pnpm build`
Expected: `tsc -b` passe (composant non encore importé : OK, pas d'erreur de type).

- [ ] **Step 3 : Commit**

```bash
git add src/components/events/AddressAutocomplete.tsx
git commit -m "feat(events): composant AddressAutocomplete (BAN)"
```

---

## Task 4 : Brancher l'autocomplete dans `EventForm`

**Files:**
- Modify: `src/components/events/EventForm.tsx` (imports ; state ~30-43 ; `handleSubmit` ~64-114 ; étape « Où et quand » ~160-191)

- [ ] **Step 1 : Importer le composant et les helpers géo**

Après la ligne `import { DeduplicateSuggestions } from './DeduplicateSuggestions'` (ligne 9), ajouter :
```tsx
import { AddressAutocomplete, type AddressSelection } from './AddressAutocomplete'
import { geocodeCity } from '@/lib/geocode'
```

- [ ] **Step 2 : Étendre le state du formulaire**

Dans l'objet passé à `useState` (lignes 30-43), ajouter `address: ''` après `external_url: ''` :
```tsx
    external_url: '',
    address: '',
```

Juste après le bloc `useState({...})` (après la ligne 43 `})`), ajouter un state géo dédié :
```tsx
  const [geo, setGeo] = useState<{ latitude: number | null; longitude: number | null; geo_precision: 'precise' | 'city' | null }>({
    latitude: null,
    longitude: null,
    geo_precision: null,
  })
```

- [ ] **Step 3 : Handler de sélection d'adresse**

Juste avant `const handleSubmit = async () => {` (ligne 64), ajouter :
```tsx
  const handleAddressSelect = (sel: AddressSelection) => {
    update('address', sel.address)
    if (sel.city) update('city', sel.city)
    if (sel.department) update('department', sel.department)
    setGeo({ latitude: sel.lat, longitude: sel.lng, geo_precision: 'precise' })
  }

  // L'utilisateur édite l'adresse à la main après une sélection -> on invalide les coords précises.
  const handleAddressChange = (v: string) => {
    update('address', v)
    setGeo(prev => (prev.geo_precision === 'precise' ? { latitude: null, longitude: null, geo_precision: null } : prev))
  }
```

- [ ] **Step 4 : Calculer les coords au submit (fallback centre-ville)**

Dans `handleSubmit`, juste avant la construction de `const eventData: EventInsert = {` (ligne 80), insérer :
```tsx
      // Coords : précises si une adresse a été choisie, sinon fallback centre-ville.
      let latitude = geo.latitude
      let longitude = geo.longitude
      let geo_precision: 'precise' | 'city' | null = geo.geo_precision
      if (geo_precision !== 'precise' && form.city && form.department) {
        const c = await geocodeCity(form.city, form.department)
        if (c) {
          latitude = c.lat
          longitude = c.lng
          geo_precision = 'city'
        }
      }
```

Puis, dans l'objet `eventData`, après la ligne `external_url: form.external_url || null,` (ligne 89), ajouter :
```tsx
        address: form.address || null,
        latitude,
        longitude,
        geo_precision,
```

- [ ] **Step 5 : Ajouter le champ adresse dans l'étape « Où et quand »**

Dans l'étape `where-when`, juste après le `<div className="flex items-center gap-3 mb-2">…</div>` d'en-tête (après la ligne 170, avant le `<div className="grid gap-3 sm:grid-cols-2">` des inputs ville/département ligne 171), insérer le champ adresse pleine largeur :
```tsx
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Adresse ou lieu (optionnel)</label>
        <AddressAutocomplete
          value={form.address}
          onChange={handleAddressChange}
          onSelect={handleAddressSelect}
          inputClass={inputClass}
        />
        <p className="text-[11px] text-muted-foreground mt-1">Choisis une suggestion pour un placement précis sur la carte. Sinon, on situe au centre-ville.</p>
      </div>
```

(Les inputs Ville / Département restent en place : ils se remplissent tout seuls quand une adresse est choisie, et servent de saisie minimale sinon.)

- [ ] **Step 6 : Vérifier la compilation et les tests**

Run: `pnpm build && pnpm vitest run src/lib/geocode.test.ts`
Expected: `tsc -b` passe, tests géo PASS.

- [ ] **Step 7 : Commit**

```bash
git add src/components/events/EventForm.tsx
git commit -m "feat(events): autocomplete adresse BAN + fallback centre-ville au submit"
```

---

## Task 5 : Backfill de l'existant

**Files:**
- Create: `scripts/backfill-geocode.mjs`

Suit le pattern des scripts existants (`scripts/compress-existing-images.mjs`) : parse `.env` à la main, `@supabase/supabase-js`, clé service-role.

- [ ] **Step 1 : Écrire le script**

Create `scripts/backfill-geocode.mjs` :

```js
/**
 * One-time script: géocode les événements existants sans coordonnées.
 * Pour chaque event où latitude is null, géocode city+department via la BAN
 * (centre-ville) et écrit latitude/longitude/geo_precision='city'.
 *
 * Usage: node scripts/backfill-geocode.mjs
 * Requires: VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (ou VITE_SUPABASE_ANON_KEY) dans .env
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(import.meta.dirname, '..', '.env')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf-8')
    .split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const idx = line.indexOf('=')
      return [line.slice(0, idx), line.slice(idx + 1)]
    })
)

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY)
const BAN_SEARCH = 'https://api-adresse.data.gouv.fr/search/'

function departmentFromCitycode(citycode) {
  if (/^9[78]/.test(citycode)) return citycode.slice(0, 3)
  return citycode.slice(0, 2)
}

async function geocodeCity(city, department) {
  if (!city?.trim()) return null
  const res = await fetch(`${BAN_SEARCH}?q=${encodeURIComponent(city.trim())}&type=municipality&limit=5`)
  if (!res.ok) return null
  const data = await res.json()
  const results = (data.features ?? []).map(f => ({
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
    citycode: f.properties.citycode ?? '',
    score: f.properties.score ?? 0,
  }))
  const dep = (department ?? '').trim()
  const filtered = dep ? results.filter(r => r.citycode.startsWith(dep)).sort((a, b) => b.score - a.score) : results
  return filtered[0] ?? results[0] ?? null
}

async function main() {
  const { data: events, error } = await supabase
    .from('events')
    .select('id, name, city, department')
    .is('latitude', null)
  if (error) throw error
  console.log(`${events.length} événement(s) à géocoder.`)

  let ok = 0
  let miss = 0
  for (const ev of events) {
    const c = await geocodeCity(ev.city, ev.department)
    if (!c) {
      console.warn(`✗ ${ev.name} (${ev.city}, ${ev.department}) — aucun résultat`)
      miss++
      continue
    }
    const { error: upErr } = await supabase
      .from('events')
      .update({ latitude: c.lat, longitude: c.lng, geo_precision: 'city' })
      .eq('id', ev.id)
    if (upErr) {
      console.warn(`✗ ${ev.name} — update échoué: ${upErr.message}`)
      miss++
    } else {
      console.log(`✓ ${ev.name} -> ${c.lat}, ${c.lng}`)
      ok++
    }
    await new Promise(r => setTimeout(r, 100)) // courtoisie BAN
  }
  console.log(`\nTerminé : ${ok} géocodés, ${miss} sans résultat.`)
}

main().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 2 : Lancer le backfill**

Run: `node scripts/backfill-geocode.mjs`
Expected: liste des events géocodés (`✓ …`) + récap final. Les events sans match (`✗`) restent sans coords (acceptable, ré-exécutable).

- [ ] **Step 3 : Vérifier en base**

Run (dashboard SQL ou `npx supabase`) :
```sql
select count(*) filter (where latitude is not null) as geocodes,
       count(*) filter (where latitude is null) as sans_coords
from events;
```
Expected: `geocodes` > 0, `sans_coords` faible (events sans ville exploitable).

- [ ] **Step 4 : Commit**

```bash
git add scripts/backfill-geocode.mjs
git commit -m "chore(scripts): backfill géocodage des événements existants (BAN)"
```

---

## Finalisation

- [ ] **Bump version + push** (préférence projet) : bumper le patch dans le fichier version/changelog (`src/changelog.ts` / `version.ts`), commit `chore: bump vX.Y.Z`, puis `git push` sur `main`.
- [ ] **Vérification manuelle** (`pnpm dev`) : créer un event, taper une adresse → suggestions → en choisir une (ville/dépt se remplissent, pin précis). Puis créer un event en ne mettant que la ville → vérifier en base `geo_precision = 'city'` avec des coords.

---

## Notes d'exécution

- **TDD** : seul `geocode.ts` est testable en pur (Task 2). Le composant et le wiring sont vérifiés par compilation + check manuel — cohérent avec les contraintes RTL du projet.
- **Pas de régression** : `EventForm.tsx` est un fichier vivant ; `git diff HEAD` avant édition pour préserver les correctifs récents (mémoire `feedback_never_regress_commits`).
- **Dégradation douce** : BAN indisponible → autocomplete vide, géocodage submit qui échoue → event créé sans coords, jamais de blocage.
- **Hors scope** : rendu carte (MapLibre + OpenFreeMap, réutilisé du stack maison), index géo, AdminEvents, international.
