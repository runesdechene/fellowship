# Lot 13 — La carte d'un événement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** voir sur une carte où est un événement par rapport à son atelier (ou à sa position), avec la distance à vol d'oiseau.

**Architecture:** le siège d'une enseigne vit dans une table privée `entity_bases` (membres seulement). La fiche calcule la distance dans le navigateur (`lib/distance.ts`) depuis l'origine (`useOrigin` : le siège de l'enseigne active, sinon la position demandée). Un seul composant `EventMap` (maplibre-gl, OpenFreeMap recoloré par `lib/map-style.ts`) sert au panneau de carte de la fiche — posé sur le mur d'affiche au-delà de 1100 px, écran glissant en dessous — et à l'onglet « Carte » de l'aperçu de modification.

**Tech Stack:** React 19, React Router 7, supabase-js, Vitest, maplibre-gl 5, OpenFreeMap (style Positron), Base Adresse Nationale.

**Spec:** `docs/superpowers/specs/2026-10-12-lot-13-carte-evenement-v2-design.md`

## Global Constraints

- Maquettes qui font foi (fichier Figma `9CmmBD3t5rAk4tD583cdN3`) : `2263:2` (fiche, carte dans le mur, carte « Lieu »), `2263:375` (écran glissant), `2263:400` (sans siège ni atelier), `2263:425` (Réglages), `2117:2` (bascule « Fiche · Carte » de l'aperçu).
- Distance à vol d'oiseau seulement ; libellés : « 800 m » sous 1 km, « 12,5 km » sous 100 km (une décimale, virgule), « 142 km » au-delà.
- Textes exacts : « À {d} de ton atelier », « À {d} de ta position », « À vol d'oiseau », « Voir sur la carte → », « × Revenir à l'affiche », « Depuis ma position », « Pas de siège ni d'atelier renseigné pour ton enseigne », « Ta position n'est pas disponible. », « Siège social ou atelier », « Sert au calcul des distances. N'est jamais affiché. », épingles « Ton atelier » / « Ta position » / le nom de l'événement.
- Le siège est privé (jamais affiché à un autre compte) ; la position de la personne n'est jamais enregistrée.
- Fond de carte : `https://tiles.openfreemap.org/styles/positron` (déjà autorisé par la CSP de flw.sh), sans clé ; maplibre-gl chargé en import différé.
- Rien de la V1 ne rentre (pas d'import, pas de copier-coller : on relit pour comprendre).
- Règles V2 : lint strict, 400 lignes max, en-têtes QUOI/POURQUOI, README par dossier, aucune valeur brute en `3-components/`, jetons en `2-semantic.css` (jour et nuit), tout est animé avec `prefers-reduced-motion`, l'état navigable est une URL, pas de scroll interne.
- Base = production : migrations par `node_modules/supabase/bin/supabase.exe db push --linked`, essais avec comptes jetables effacés.
- Déploiement V1 (en-tête `Permissions-Policy`) et V2 : au GO d'Uriel.

## Review Focus

1. **Une fiche sans position** (latitude nulle) : ni distance, ni « Voir sur la carte », jamais une carte vide ni « NaN km ». Test : `distanceLine` avec une fiche sans position → `null` (Task 2).
2. **Changer d'enseigne active** (une avec atelier, l'autre sans) : la distance et l'épingle suivent l'enseigne active, sans recharger. Test : `originFor` (Task 4).
3. **Un autre compte lit le siège** d'une enseigne qui n'est pas la sienne : rien. Essai SQL (Task 1).
4. **Thème changé pendant que la carte est ouverte** (jour ↔ nuit) : le fond suit. Test `layerPaint` jour/nuit (Task 3) + vérification navigateur (Task 9).
5. **Fermer la carte par le retour du navigateur** sur téléphone comme sur ordinateur : on retrouve la fiche (ou l'affiche), pas la page d'avant. Vérification navigateur (Task 9), l'état `?carte` est porté par l'URL (Task 6).

---

## File Structure

- Create `supabase/migrations/20261012140000_entity_bases.sql`; Modify `apps/web-v2/src/types/supabase.ts`.
- Create `apps/web-v2/src/lib/distance.ts` (+ test) — haversine, libellé, ligne de la carte « Lieu ».
- Create `apps/web-v2/src/lib/map-style.ts` (+ test) — palette et peinture des couches.
- Create `apps/web-v2/src/lib/origin.ts` (+ test) — le point de départ (siège de l'enseigne active ou position).
- Create `apps/web-v2/src/components/map/` — `README.md`, `EventMap.tsx`, `styles/3-components/event-map.css`.
- Create `apps/web-v2/src/features/event/useOrigin.ts`, `EventMapPanel.tsx`; Modify `EventPage.tsx` (carte « Lieu »).
- Create `apps/web-v2/src/features/settings/EntityBase.tsx`, `useEntityBase.ts`; Modify `EntitiesSection.tsx`.
- Modify `apps/web-v2/src/features/event-edit/EditPreview.tsx` (bascule « Fiche · Carte »).
- Modify `apps/web-v2/package.json` (`maplibre-gl`), `styles/1-primitives.css`, `styles/2-semantic.css`, `styles/index.css`.
- Modify `apps/web/netlify.toml` (`geolocation=(self)`).

---

### Task 1: Le siège d'une enseigne, en base

**Files:** Create `supabase/migrations/20261012140000_entity_bases.sql`; Modify `apps/web-v2/src/types/supabase.ts`.

**Interfaces:** Produces table `entity_bases(entity_id uuid pk, address text, latitude double precision, longitude double precision, updated_at timestamptz)`.

- [ ] **Step 1: Écrire la migration**

```sql
-- POURQUOI — lot 13 (Uriel, 12/10/2026) : la fiche dit « à 142 km de ton atelier ». Le siège ou
-- l'atelier d'une enseigne sert au calcul des distances et n'est JAMAIS affiché : il vit à part
-- d'`entities`, que tout le monde lit pour les vitrines, et seuls les membres de l'enseigne le lisent.
CREATE TABLE public.entity_bases (
  entity_id uuid PRIMARY KEY REFERENCES public.entities(actor_id) ON DELETE CASCADE,
  address text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.entity_bases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.entity_bases FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entity_bases TO authenticated;
CREATE POLICY entity_bases_members ON public.entity_bases FOR ALL TO authenticated
  USING (can_act_as(entity_id)) WITH CHECK (can_act_as(entity_id));
```
- [ ] **Step 2: Appliquer, régénérer les types** (comme au lot 10c : `db push --linked`, `gen types`, prettier). Expected : le diff des types n'ajoute que `entity_bases`.
- [ ] **Step 3: Essai en base** — script jetable : un compte A avec une enseigne écrit (`upsert`) puis relit son siège ; un compte B ne le lit pas (0 ligne) et ne peut pas l'écrire (erreur RLS) ; supprimer l'enseigne de A (par `delete-account`) efface le siège. Expected : 3 `ok`, nettoyage 0.
- [ ] **Step 4: Commit** — `feat(db): le siège ou l'atelier d'une enseigne, privé`.

---

### Task 2: La distance (pur)

**Files:** Create `apps/web-v2/src/lib/distance.ts`, `apps/web-v2/src/lib/distance.test.ts`.

**Interfaces:** Produces
- `type Point = { latitude: number; longitude: number }`
- `distanceKm(a: Point, b: Point): number`
- `formatDistance(km: number): string`
- `eventPoint(event: { latitude: number | null; longitude: number | null }): Point | null`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from 'vitest'
import { distanceKm, eventPoint, formatDistance } from './distance'

const clermont = { latitude: 45.7772, longitude: 3.087 }
const lyon = { latitude: 45.764, longitude: 4.8357 }

describe('distanceKm', () => {
  test('Clermont-Ferrand → Lyon, à vol d’oiseau', () => {
    expect(Math.round(distanceKm(clermont, lyon))).toBe(136)
  })
  test('un même point est à zéro', () => {
    expect(distanceKm(lyon, lyon)).toBe(0)
  })
})

describe('formatDistance', () => {
  test('mètres sous 1 km, une décimale sous 100 km, ronds au-delà', () => {
    expect(formatDistance(0.8)).toBe('800 m')
    expect(formatDistance(0.04)).toBe('40 m')
    expect(formatDistance(12.46)).toBe('12,5 km')
    expect(formatDistance(142.4)).toBe('142 km')
  })
})

describe('eventPoint', () => {
  test('une fiche sans position n’a pas de point', () => {
    expect(eventPoint({ latitude: null, longitude: 3 })).toBeNull()
    expect(eventPoint({ latitude: 45, longitude: 3 })).toEqual({ latitude: 45, longitude: 3 })
  })
})
```
- [ ] **Step 2: Run** `pnpm --filter web-v2 exec vitest run src/lib/distance.test.ts` → FAIL (module absent).
- [ ] **Step 3: Implement**

```ts
export interface Point {
  latitude: number
  longitude: number
}

const EARTH_KM = 6371
const radians = (degrees: number) => (degrees * Math.PI) / 180

/** À vol d'oiseau (formule de haversine). */
export function distanceKm(a: Point, b: Point): number {
  const dLat = radians(b.latitude - a.latitude)
  const dLng = radians(b.longitude - a.longitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h))
}

export function formatDistance(km: number): string {
  if (km < 1) return `${String(Math.round(km * 100) * 10)} m`
  if (km < 100) return `${(Math.round(km * 10) / 10).toLocaleString('fr-FR')} km`
  return `${String(Math.round(km))} km`
}

export function eventPoint(event: { latitude: number | null; longitude: number | null }): Point | null {
  return event.latitude === null || event.longitude === null
    ? null
    : { latitude: event.latitude, longitude: event.longitude }
}
```
(Si `formatDistance(0.04)` rend « 40 m » mais `0.8` rend « 800 m », garder ; vérifier `(12.46)` → `'12,5 km'` avec `toLocaleString('fr-FR')`.)
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** — `feat(v2): la distance à vol d'oiseau`.

---

### Task 3: Le style de la carte (pur)

**Files:** Create `apps/web-v2/src/lib/map-style.ts`, `apps/web-v2/src/lib/map-style.test.ts`; Modify `styles/1-primitives.css`, `styles/2-semantic.css`.

**Interfaces:** Produces
- `interface MapPalette { land: string; landAlt: string; water: string; green: string; building: string; road: string; roadMajor: string; text: string; halo: string }`
- `layerPaint(layer: { id: string; type: string }, palette: MapPalette): [string, string | number][]` — les propriétés de peinture à poser sur une couche.
- `readPalette(element: Element): MapPalette` — lit les jetons `--map-*` (jour/nuit suivent le thème du CSS).
- `MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from 'vitest'
import { layerPaint, type MapPalette } from './map-style'

const palette: MapPalette = {
  land: '#land', landAlt: '#alt', water: '#water', green: '#green', building: '#bati',
  road: '#road', roadMajor: '#major', text: '#text', halo: '#halo',
}

describe('layerPaint', () => {
  test('le fond, l’eau, la verdure, les bâtiments', () => {
    expect(layerPaint({ id: 'background', type: 'background' }, palette)).toEqual([['background-color', '#land']])
    expect(layerPaint({ id: 'water', type: 'fill' }, palette)).toEqual([['fill-color', '#water']])
    expect(layerPaint({ id: 'landcover_wood', type: 'fill' }, palette)).toEqual([['fill-color', '#green']])
    expect(layerPaint({ id: 'building', type: 'fill' }, palette)).toEqual([['fill-color', '#bati']])
    expect(layerPaint({ id: 'landuse_residential', type: 'fill' }, palette)).toEqual([['fill-color', '#alt']])
  })
  test('les routes, grandes et petites, et les rivières', () => {
    expect(layerPaint({ id: 'highway_motorway', type: 'line' }, palette)).toEqual([['line-color', '#major']])
    expect(layerPaint({ id: 'highway_minor', type: 'line' }, palette)).toEqual([['line-color', '#road']])
    expect(layerPaint({ id: 'waterway', type: 'line' }, palette)).toEqual([['line-color', '#water']])
  })
  test('les noms, avec leur halo', () => {
    expect(layerPaint({ id: 'place_city', type: 'symbol' }, palette)).toEqual([
      ['text-color', '#text'],
      ['text-halo-color', '#halo'],
      ['text-halo-width', 1.4],
    ])
  })
  test('une couche inconnue n’est pas touchée', () => {
    expect(layerPaint({ id: 'x', type: 'hillshade' }, palette)).toEqual([])
  })
})
```
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `layerPaint` (règles du test : `background`; `fill` → eau `/water|ocean|sea/`, verdure `/wood|forest|park|grass|landcover/`, bâti `/building/`, sinon `landAlt`; `line` → eau `/water|river|canal/`, grandes `/motorway|trunk|primary/`, sinon `road`; `symbol` → texte + halo 1.4), `readPalette` (`getComputedStyle(element).getPropertyValue('--map-land').trim()` …), `MAP_STYLE_URL`.
- [ ] **Step 4: Les jetons** — `1-primitives.css` : les couleurs de carte (reprendre les teintes relevées sur la V1, sans en copier le code) ; `2-semantic.css` : `--map-land`, `--map-land-alt`, `--map-water`, `--map-green`, `--map-building`, `--map-road`, `--map-road-major`, `--map-text`, `--map-halo`, en jour et dans `:root[data-theme='dark']`. Jour : `#eeeae4 #e6e1d9 #cdd9e1 #dde4d6 #e2ddd4 #d4cdc3 #c3bbb0 #5a534b #f2efe9` ; nuit : `#26282b #2c2f33 #1a2832 #283129 #31353b #3e4247 #545a61 #cbc4bb #1a1c1f`.
- [ ] **Step 5: Run** → PASS ; lint ; commit — `feat(v2): les couleurs de la carte, jour et nuit`.

---

### Task 4: Le point de départ (pur + hook)

**Files:** Create `apps/web-v2/src/lib/origin.ts`, `origin.test.ts`, `apps/web-v2/src/features/event/useOrigin.ts`.

**Interfaces:**
- Consumes: `Point` (Task 2), table `entity_bases` (Task 1).
- Produces:
  - `type Origin = { kind: 'base'; point: Point; label: 'Ton atelier' } | { kind: 'position'; point: Point; label: 'Ta position' } | { kind: 'none' }`
  - `originFor(activeEntityId: string | null, bases: Map<string, Point>, position: Point | null): Origin` — l'atelier de l'enseigne active d'abord, puis la position, sinon `none`.
  - `useOrigin()` → `{ origin: Origin; askPosition: () => void; positionError: string | null; asking: boolean }` — lit les sièges des enseignes du compte (`entity_bases`, une requête), suit `actor` actif ; `askPosition` appelle `navigator.geolocation.getCurrentPosition` (délai 10 s) ; refus ou indisponible → « Ta position n'est pas disponible. ».

- [ ] **Step 1: Test**

```ts
import { describe, expect, test } from 'vitest'
import { originFor } from './origin'

const atelier = { latitude: 45.78, longitude: 3.08 }
const ici = { latitude: 48.85, longitude: 2.35 }

describe('originFor', () => {
  test('l’atelier de l’enseigne active passe avant la position', () => {
    expect(originFor('e1', new Map([['e1', atelier]]), ici)).toEqual({ kind: 'base', point: atelier, label: 'Ton atelier' })
  })
  test('une enseigne sans atelier, ou un compte personnel : la position, si on l’a', () => {
    expect(originFor('e2', new Map([['e1', atelier]]), ici)).toEqual({ kind: 'position', point: ici, label: 'Ta position' })
    expect(originFor(null, new Map([['e1', atelier]]), null)).toEqual({ kind: 'none' })
  })
})
```
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `originFor` puis `useOrigin` (patron des hooks de données : `must()`, effet appliqué une fois ; la position en état local, jamais écrite nulle part). **Step 4: Run** → PASS ; lint ; commit — `feat(v2): le point de départ d'une distance`.

---

### Task 5: La carte (composant)

**Files:** Create `apps/web-v2/src/components/map/README.md`, `EventMap.tsx`, `apps/web-v2/src/styles/3-components/event-map.css`; Modify `package.json` (`pnpm --filter web-v2 add maplibre-gl@^5.24.0`), `styles/index.css`, `2-semantic.css`.

**Interfaces:**
- Consumes: `Point` (Task 2), `layerPaint`, `readPalette`, `MAP_STYLE_URL` (Task 3), `followDevice`/thème (`lib/theme.ts`).
- Produces: `EventMap({ event: { point: Point; name: string }, origin?: { point: Point; label: string } | null, className?: string })` — export par défaut d'un module chargé par `lazy(() => import('@/components/map/EventMap'))`.

- [ ] **Step 1:** `EventMap` : un `div` conteneur dans le flux (jamais `absolute inset-0` : la carte doit mesurer son parent) ; la carte créée dans un `requestAnimationFrame` puis `ResizeObserver` → `map.resize()` ; `dragRotate: false`, attribution compacte, `NavigationControl` en bas à droite ; à `load` : chaque couche reçoit `layerPaint(layer, readPalette(container))` (try/catch par couche) ; épingles en `maplibregl.Marker` d'un élément DOM (`.map-pin`, `.map-pin--event` encre avec point terre, `.map-pin--origin` blanc bordé) ; le trait : une source GeoJSON `LineString` et une couche `line` pointillée (`line-dasharray: [2, 2]`, couleur `--map-text`) ; cadrage : `fitBounds` des deux points (marge 80) ou `center` + `zoom: 11` pour un seul ; le thème change (attribut `data-theme` observé) → recolorer. Nettoyage : `map.remove()`.
- [ ] **Step 2:** CSS (`event-map.css`) : `.event-map` remplit son parent ; `.map-pin*` d'après `2263:2` (pastille 12 px semi-gras, rayon pastille, point 8 px) ; jetons dans `2-semantic.css`.
- [ ] **Step 3:** README du dossier ; lint, tsc, build (vérifier que maplibre part dans un morceau séparé : `dist/assets/` a un fichier distinct importé à la demande) ; commit — `feat(v2): la carte d'un événement, un seul composant`.

---

### Task 6: La carte sur la fiche

**Files:** Create `apps/web-v2/src/features/event/EventMapPanel.tsx`; Modify `EventPage.tsx`, `styles/3-components/event-page.css` (ou un `event-map-panel.css`), `2-semantic.css`.

**Interfaces:**
- Consumes: `useOrigin` (Task 4), `distanceKm`, `formatDistance`, `eventPoint` (Task 2), `EventMap` (Task 5).
- Produces: `?carte` dans l'URL de la fiche = carte ouverte.

- [ ] **Step 1: La carte « Lieu »** : sous l'adresse, « À {formatDistance(d)} de ton atelier » (origine `base`), « À {d} de ta position » (origine `position`), ou le bouton « Depuis ma position » (origine `none`, un clic → `askPosition`) ; puis « Voir sur la carte → » (`setSearchParams({ carte: '' })`). Rien de tout ça si `eventPoint(event)` est `null`. `positionError` s'affiche à la place du bouton.
- [ ] **Step 2: `EventMapPanel`** (ouvert si `?carte`) : au-delà de 1100 px, `position: fixed` sur l'emplacement du mur (`right: 0; top: 0; width: var(--wall-width); height: 100vh`), au-dessus de l'affiche, entrée en fondu ; en dessous, écran plein qui glisse depuis la droite (`translate` 100 % → 0, `@starting-style`, `prefers-reduced-motion`). Contenu (maquettes `2263:2`, `2263:375`, `2263:400`) : « × Revenir à l'affiche » (ordinateur) / « ‹ {nom} » (téléphone) → `navigate(-1)` si on est arrivé par « Voir sur la carte », sinon retirer `?carte` ; `EventMap` en `Suspense` ; la carte du bas « À {d} de ton atelier » + « À vol d'oiseau » + adresse, ou « Pas de siège ni d'atelier renseigné pour ton enseigne » + « Depuis ma position ».
- [ ] **Step 3:** Garder `EventPage.tsx` sous 400 lignes (la carte « Lieu » enrichie peut sortir en `PlaceFact.tsx`). Lint, tsc, test, build ; commit — `feat(v2): la carte s'ouvre depuis le lieu de la fiche`.

---

### Task 7: Le siège dans les Réglages

**Files:** Create `apps/web-v2/src/features/settings/EntityBase.tsx`, `useEntityBase.ts`; Modify `EntitiesSection.tsx`, `features/settings/README.md`, `styles/3-components/settings.css`.

**Interfaces:**
- Consumes: `AddressField`, `PlaceSuggestion` (`features/event-create/AddressField.tsx`, `lib/geocode.ts`), table `entity_bases` (Task 1).
- Produces: `EntityBase({ entityId }: { entityId: string })`.

- [ ] **Step 1:** `useEntityBase(entityId)` : lit la ligne (`maybeSingle`), `pick(place)` → `upsert({ entity_id, address: place.label, latitude, longitude })`, `clear()` → `delete` ; erreur → message, jamais silencieux.
- [ ] **Step 2:** `EntityBase` : une `SettingRow` sous chaque enseigne, titre « Siège social ou atelier », note « Sert au calcul des distances. N'est jamais affiché. », `AddressField` à droite ; choisir une suggestion enregistre aussitôt (le statut « ✓ » des Réglages), vider le champ puis quitter le champ efface. Maquette `2263:425`.
- [ ] **Step 3:** Lint, tsc, test, build ; commit — `feat(v2): le siège ou l'atelier d'une enseigne, dans les Réglages`.

---

### Task 8: L'onglet « Carte » de l'aperçu, et le droit de demander la position

**Files:** Modify `apps/web-v2/src/features/event-edit/EditPreview.tsx`, `styles/3-components/event-edit.css`; Modify `apps/web/netlify.toml`.

- [ ] **Step 1:** La bascule « Fiche · Carte » (maquette `2117:2`, `Segmented` existant si son style correspond, sinon deux boutons) ; « Carte » montre `EventMap` avec la position du brouillon (`draft.latitude/longitude`), sinon « La position se calcule à l'enregistrement, depuis la ville. » ; l'état de la bascule est local (un aperçu n'est pas une page).
- [ ] **Step 2:** `apps/web/netlify.toml` : dans les deux blocs `Permissions-Policy`, `geolocation=()` → `geolocation=(self)` (lire `.claude/rules/deploiement.md` avant).
- [ ] **Step 3:** Lint, test, build ; commit — `feat(v2): l'aperçu montre l'adresse sur la carte ; le site peut demander la position`.

---

### Task 9: L'essai de bout en bout, puis les déploiements (au GO d'Uriel)

- [ ] **Step 1:** Compte jetable avec deux enseignes (une avec atelier, une sans), fiche privée de test « Test 13 — à effacer » avec position.
- [ ] **Step 2: Navigateur** (serveur de dev) : Réglages (choisir l'atelier, le vider, le remettre) ; fiche (« À N km de ton atelier », changer d'enseigne active → « Depuis ma position ») ; « Voir sur la carte » en grande fenêtre (mur), retour du navigateur → l'affiche ; fenêtre étroite (écran glissant) ; thème nuit pendant que la carte est ouverte ; aperçu « Carte » ; comparer chaque écran à sa maquette. « Depuis ma position » ne se vérifie qu'en ligne (l'en-tête de la V1).
- [ ] **Step 3:** Effacer fiche et compte ; vérifier qu'il ne reste rien.
- [ ] **Step 4 (GO):** déployer la V1 (brouillon, `curl -sI` : `Permissions-Policy` contient `geolocation=(self)`, puis production), puis la V2 2.35.0 ; essayer « Depuis ma position » sur flw.sh/v2.

## Après les tâches

Relecture fraîche de toute la branche (modèle le plus capable), corrections Critiques et Importantes en TDD ; docs (plan directeur : lot 13 ☑ ; `maquettes-2027.md` ; `_État.md`), push.
