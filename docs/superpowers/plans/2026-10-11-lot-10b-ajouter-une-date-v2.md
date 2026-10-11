# Lot 10b — Ajouter une date (V2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aligner la création d'une date (`/evenement/nouveau`) sur la maquette `2082:2`, enrichir les doublons, poser la position sur la carte, et ouvrir la fiche créée.

**Architecture:** Le parcours existant (`features/event-create/`) garde son brouillon et ses règles. On lui ajoute une barre de création (l'`AppShell` sait se passer de sa barre du haut), un aperçu et un bloc de doublons réécrits, une étape 2 qui suggère des adresses. Les règles pures vivent dans `lib/geocode.ts` et `lib/create-event.ts`, testées. Une migration fait rendre à `search_similar_events` l'affiche, les catégories et le nombre d'exposants inscrits.

**Tech Stack:** React 19, React Router 7, supabase-js, Vitest, Postgres, Base Adresse Nationale (`https://api-adresse.data.gouv.fr/search/`).

**Spec:** `docs/superpowers/specs/2026-10-11-lot-10b-ajouter-une-date-v2-design.md`

## Global Constraints

- Maquette qui fait foi : `2082:2` ; étapes 2-4 sur son gabarit. Ce qui n'y est pas n'existe pas (pas d'édition, horaires, affluence, stand).
- Aucune valeur en dur dans `styles/3-components/` ; aucun style dans les `.tsx` (sauf `'--nom'`). Jetons dans `2-semantic.css`, thème sombre compris. Mouvements : `--duration-fast`, `--duration-medium`, `--ease-out` ; `prefers-reduced-motion`.
- En-tête `QUOI / POURQUOI / (ATTENTION)` ; 400 lignes max par fichier ; `pnpm --filter web-v2 lint` avant chaque commit.
- Une chose qui se répète devient un seul composant : la vignette d'un doublon est `Poster`.
- `geo_precision` n'accepte que `'precise'` (adresse choisie) ou `'city'` (position de la ville) — contrainte en base.
- Migrations : `<horodatage>_<nom>.sql`, POURQUOI en tête, définition **live** reprise entière, `node_modules/supabase/bin/supabase.exe db push --linked`.
- La base est la production : pas de date de test publique ; la date de test est privée, créée par un compte jetable, puis **effacée explicitement**, puis le compte supprimé.
- Après une écriture de fichier par script : vérifier que Vite sert la nouvelle version (`curl … | grep`), sinon `touch` (`.claude/rules/v2.md`).
- Avant tout commit : `git checkout -- graphify-out`. Commits en français, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Textes exacts : « × Quitter », « ✓ Brouillon enregistré », « Effacer le brouillon », « Continuer », « Créer la date », « Aperçu », « L'affiche viendra à l'étape 4 », « Sans nom pour l'instant », « Date et lieu à l'étape suivante », « ✓ À la création, tu y es inscrit en « Intéressé » », « Ouvrir », « Passé », « Si c'est l'un d'eux, ouvre-le plutôt que d'en créer un second : tu y retrouveras les autres exposants. », titres d'étape de la spec.

## Review Focus

1. **La BAN ne répond pas** (hors ligne, lente) : l'étape 2 reste utilisable sans suggestions, et la création part sans position — jamais bloquée.
2. **Une adresse choisie puis modifiée à la main** : la position de l'ancienne adresse ne doit pas rester attachée à une adresse différente.
3. **Un brouillon d'avant ce lot** (sans les nouveaux champs de position) : il se relit sans erreur.
4. **Un doublon sans affiche, sans catégorie, ou à 0 inscrit** : la carte s'affiche quand même (« 0 exposant inscrit » ou rien — jamais « undefined »).
5. **Un nom de festival qui contient des caractères spéciaux** (`'`, `&`, accents) : la recherche de doublons et celle d'adresses ne cassent pas.

---

### Task 1: Les doublons rendent l'affiche, les catégories et les inscrits (migration)

**Files:**
- Create: `supabase/migrations/20261011200000_similar_events_enriched.sql`
- Modify: `apps/web-v2/src/types/supabase.ts` (le type de retour de `search_similar_events`, régénéré)

- [ ] **Step 1: RED** — en prod, lecture seule : `select * from search_similar_events('Medievales de Provins')` ne rend pas de colonne `exhibitors`. Expected : les colonnes `id, name, city, department, start_date, end_date, score` seulement.

- [ ] **Step 2: La migration** (définition live du 11/10/2026, trois colonnes ajoutées ; `DROP` obligatoire car le type de retour change) :

```sql
-- POURQUOI : lot 10b (11/10/2026). Les doublons de la création d'une date montrent leur affiche,
--   leurs catégories et « N exposants inscrits » (maquette 2082:2). Les participations ne se lisent
--   qu'entre amis : le compte se fait ici, en SECURITY DEFINER, sans rien ouvrir d'autre.
--   La V1 appelle aussi cette fonction : elle ignore les colonnes en plus.
-- Définition reprise entière du live ; le type de retour change, d'où le DROP.
DROP FUNCTION IF EXISTS public.search_similar_events(text, integer, double precision);

CREATE FUNCTION public.search_similar_events(
  search_name text,
  search_year integer DEFAULT NULL::integer,
  threshold double precision DEFAULT 0.25
)
 RETURNS TABLE(
   id uuid, name text, city text, department text, start_date date, end_date date,
   score double precision, image_url text, tags text[], exhibitors integer
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT e.id, e.name, e.city, e.department, e.start_date, e.end_date,
         similarity(lower(e.name), lower(search_name)) AS score,
         e.image_url, e.tags,
         (SELECT count(*)::integer
            FROM participations p
            JOIN entities en ON en.actor_id = p.actor_id
           WHERE p.event_id = e.id AND p.status IN ('inscrit', 'confirme')) AS exhibitors
  FROM events e
  WHERE e.is_private = false
    AND similarity(lower(e.name), lower(search_name)) > threshold
    AND (search_year IS NULL OR EXTRACT(YEAR FROM e.start_date) = search_year)
  ORDER BY score DESC
  LIMIT 5;
$function$;

GRANT EXECUTE ON FUNCTION public.search_similar_events(text, integer, double precision)
  TO anon, authenticated;
```

Avant d'écrire : lire les droits actuels (`select grantee from information_schema.routine_privileges where routine_name = 'search_similar_events'`) et reproduire exactement ceux-là (si `anon` n'y est pas, ne pas l'ajouter).

- [ ] **Step 3: Appliquer** (`echo y | node_modules/supabase/bin/supabase.exe db push --linked`, mot de passe lu dans `.env`).

- [ ] **Step 4: GREEN** — la requête du Step 1 rend `image_url`, `tags`, `exhibitors`.

- [ ] **Step 5: Types** — `node_modules/supabase/bin/supabase.exe gen types typescript --linked --schema public > <dossier temporaire>/supabase.ts`, vérifier qu'il n'est pas vide, puis le copier sur `apps/web-v2/src/types/supabase.ts` ; `pnpm --filter web-v2 exec tsc -b` passe.

- [ ] **Step 6: Commit** — `feat(db): les doublons d'une date rendent l'affiche, les catégories et les inscrits`.

---

### Task 2: Les adresses (`lib/geocode.ts`)

**Files:**
- Create: `apps/web-v2/src/lib/geocode.ts`, `apps/web-v2/src/lib/geocode.test.ts`

**Interfaces:**
- Produces:
  - `interface PlaceSuggestion { label: string; address: string; city: string; department: string; latitude: number; longitude: number }`
  - `departmentOfCitycode(citycode: string): string` — `'63113'` → `'63'`, `'2A004'` → `'2A'`, `'97411'` → `'974'`.
  - `readBan(json: unknown): PlaceSuggestion[]` — lit une réponse BAN (GeoJSON), ignore ce qui est mal formé.
  - `banUrl(query: string, options: { type?: 'municipality'; limit?: number }): string`
  - `searchPlaces(query: string): Promise<PlaceSuggestion[]>` — 5 suggestions ; `[]` si la BAN échoue.
  - `locateCity(city: string, department: string): Promise<{ latitude: number; longitude: number } | null>` — la commune du département, ou null.

- [ ] **Step 1: Tests (RED)**

```ts
/**
 * QUOI     — tests des adresses : lecture d'une réponse de la Base Adresse Nationale, département
 *            d'un code INSEE, adresse de recherche.
 * POURQUOI — lot 10b : une position fausse met un festival au mauvais endroit de la carte.
 */
import { describe, expect, test } from 'vitest'
import { banUrl, departmentOfCitycode, readBan } from './geocode'

describe('departmentOfCitycode', () => {
  test('deux chiffres, la Corse en lettres, les outre-mer sur trois', () => {
    expect(departmentOfCitycode('63113')).toBe('63')
    expect(departmentOfCitycode('06088')).toBe('06')
    expect(departmentOfCitycode('2A004')).toBe('2A')
    expect(departmentOfCitycode('97411')).toBe('974')
  })
})

describe('readBan', () => {
  const feature = {
    geometry: { coordinates: [3.0863, 45.7772] },
    properties: {
      label: '1 Place de Jaude 63000 Clermont-Ferrand',
      name: '1 Place de Jaude',
      city: 'Clermont-Ferrand',
      citycode: '63113',
    },
  }
  test('une adresse : son libellé, sa rue, sa ville, son département, sa position', () => {
    expect(readBan({ features: [feature] })).toEqual([
      {
        label: '1 Place de Jaude 63000 Clermont-Ferrand',
        address: '1 Place de Jaude',
        city: 'Clermont-Ferrand',
        department: '63',
        latitude: 45.7772,
        longitude: 3.0863,
      },
    ])
  })
  test('ce qui est mal formé est ignoré, jamais une erreur', () => {
    expect(readBan(null)).toEqual([])
    expect(readBan({ features: [{ geometry: {}, properties: {} }] })).toEqual([])
  })
})

describe('banUrl', () => {
  test('encode la recherche, limite et type facultatifs', () => {
    expect(banUrl('Salle d’Arc & Co', { limit: 5 })).toBe(
      'https://api-adresse.data.gouv.fr/search/?q=Salle+d%E2%80%99Arc+%26+Co&limit=5',
    )
    expect(banUrl('Ménétrol', { type: 'municipality', limit: 10 })).toContain(
      '&type=municipality',
    )
  })
})
```

- [ ] **Step 2: RED** — `pnpm --filter web-v2 exec vitest run src/lib/geocode.test.ts` → FAIL (import introuvable).

- [ ] **Step 3: `lib/geocode.ts`**

```ts
/**
 * QUOI     — les adresses de la Base Adresse Nationale (le service d'adresses de l'État, gratuit,
 *            sans clé) : suggestions pendant la frappe, position d'une commune.
 * POURQUOI — lot 10b (Uriel, 11/10/2026) : une date créée par la V2 doit avoir sa position sur la
 *            carte, comme les 112 de la base. Réécrit pour la V2, sans reprendre le code de la V1.
 * ATTENTION — une BAN qui ne répond pas rend une liste vide ou null : jamais une erreur qui
 *            bloquerait la création.
 */

const BAN = 'https://api-adresse.data.gouv.fr/search/'

export interface PlaceSuggestion {
  label: string
  address: string
  city: string
  department: string
  latitude: number
  longitude: number
}

export function departmentOfCitycode(citycode: string): string {
  return /^9[78]/.test(citycode) ? citycode.slice(0, 3) : citycode.slice(0, 2)
}

type Raw = Record<string, unknown>
const record = (value: unknown): Raw | null =>
  typeof value === 'object' && value !== null ? (value as Raw) : null
const text = (value: unknown): string => (typeof value === 'string' ? value : '')

export function readBan(json: unknown): PlaceSuggestion[] {
  const features = record(json)?.features
  if (!Array.isArray(features)) return []
  return features.flatMap((item: unknown) => {
    const feature = record(item)
    const coordinates = record(feature?.geometry)?.coordinates
    const props = record(feature?.properties)
    if (!Array.isArray(coordinates) || !props) return []
    const [longitude, latitude] = coordinates as unknown[]
    const citycode = text(props.citycode)
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || !citycode) return []
    return [
      {
        label: text(props.label),
        address: text(props.name),
        city: text(props.city),
        department: departmentOfCitycode(citycode),
        latitude,
        longitude,
      },
    ]
  })
}

export function banUrl(query: string, options: { type?: 'municipality'; limit?: number }): string {
  const params = new URLSearchParams({ q: query })
  if (options.limit) params.set('limit', String(options.limit))
  if (options.type) params.set('type', options.type)
  return `${BAN}?${params.toString()}`
}

async function ask(url: string): Promise<PlaceSuggestion[]> {
  try {
    const response = await fetch(url)
    if (!response.ok) return []
    return readBan(await response.json())
  } catch {
    return []
  }
}

export function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  return ask(banUrl(query, { limit: 5 }))
}

export async function locateCity(
  city: string,
  department: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const found = await ask(banUrl(city, { type: 'municipality', limit: 10 }))
  const match = found.find((place) => place.department === department.trim().toUpperCase())
  return match ? { latitude: match.latitude, longitude: match.longitude } : null
}
```

- [ ] **Step 4: GREEN.** (Si `banUrl` encode l'apostrophe autrement que l'attendu, l'attendu suit `URLSearchParams` — ajuster le test, pas le code.)
- [ ] **Step 5: README de `lib/`, lint, commit** — `feat(v2): les adresses de la Base Adresse Nationale`.

---

### Task 3: Les phrases de la création (`lib/create-event.ts`)

**Files:**
- Create: `apps/web-v2/src/lib/create-event.ts`, `apps/web-v2/src/lib/create-event.test.ts`

**Interfaces:**
- Consumes: `formatDateRange`, `parseSqlDate`, `todayIso` (`lib/dates.ts`).
- Produces:
  - `duplicateLine(row: { startDate: string; endDate: string; city: string; department: string; exhibitors: number }, today: Date): { meta: string; past: boolean }` — « 4–5 avr. 2027 · Provins (77) · 12 exposants inscrits », ou « … · Passé ».
  - `previewPlace(draft: { startDate: string; endDate: string; city: string; department: string }): string | null` — « 25–27 sept. · Ménétrol (63) », ou null tant qu'il manque la ville ou le début.

- [ ] **Step 1: Tests (RED)**

```ts
/**
 * QUOI     — tests des phrases de la création : la ligne d'un doublon, le lieu et les dates de
 *            l'aperçu.
 * POURQUOI — lot 10b : « 12 exposants inscrits » ou « Passé » décide si l'on ouvre un festival
 *            existant ou si l'on en crée un second.
 */
import { describe, expect, test } from 'vitest'
import { duplicateLine, previewPlace } from './create-event'

const today = new Date(2026, 9, 11)
const row = { startDate: '2027-04-04', endDate: '2027-04-05', city: 'Provins', department: '77' }

describe('duplicateLine', () => {
  test('à venir : les dates, le lieu, les inscrits', () => {
    const line = duplicateLine({ ...row, exhibitors: 12 }, today)
    expect(line.past).toBe(false)
    expect(line.meta).toMatch(/Provins \(77\) · 12 exposants inscrits$/)
  })
  test('un seul inscrit, aucun inscrit', () => {
    expect(duplicateLine({ ...row, exhibitors: 1 }, today).meta).toMatch(/1 exposant inscrit$/)
    expect(duplicateLine({ ...row, exhibitors: 0 }, today).meta).toMatch(/Provins \(77\)$/)
  })
  test('terminé : « Passé » à la place des inscrits', () => {
    const line = duplicateLine(
      { ...row, startDate: '2026-06-13', endDate: '2026-06-14', exhibitors: 30 },
      today,
    )
    expect(line).toEqual({ meta: expect.stringMatching(/Provins \(77\) · Passé$/), past: true })
  })
})

describe('previewPlace', () => {
  test('les dates et le lieu, ou rien tant qu’il manque l’un', () => {
    expect(
      previewPlace({ startDate: '2026-09-25', endDate: '2026-09-27', city: 'Ménétrol', department: '63' }),
    ).toMatch(/Ménétrol \(63\)$/)
    expect(previewPlace({ startDate: '', endDate: '', city: 'Ménétrol', department: '63' })).toBeNull()
    expect(previewPlace({ startDate: '2026-09-25', endDate: '', city: '', department: '' })).toBeNull()
  })
})
```

- [ ] **Step 2: RED**, **Step 3:**

```ts
/**
 * QUOI     — les phrases de la création d'une date : la ligne d'un doublon (dates, lieu, inscrits ou
 *            « Passé »), le lieu et les dates de l'aperçu.
 * POURQUOI — lot 10b, maquette 2082:2. Les dates passent par lib/dates.ts, jamais recalculées.
 */
import { formatDateRange, parseSqlDate, todayIso } from './dates'

function place(city: string, department: string): string {
  return department.trim() ? `${city.trim()} (${department.trim()})` : city.trim()
}

function dates(startDate: string, endDate: string): string {
  return formatDateRange(parseSqlDate(startDate), parseSqlDate(endDate || startDate))
}

export function duplicateLine(
  row: { startDate: string; endDate: string; city: string; department: string; exhibitors: number },
  today: Date,
): { meta: string; past: boolean } {
  const past = (row.endDate || row.startDate) < todayIso(today)
  const parts = [dates(row.startDate, row.endDate), place(row.city, row.department)]
  if (past) parts.push('Passé')
  else if (row.exhibitors > 0)
    parts.push(`${String(row.exhibitors)} exposant${row.exhibitors > 1 ? 's' : ''} inscrit${row.exhibitors > 1 ? 's' : ''}`)
  return { meta: parts.join(' · '), past }
}

export function previewPlace(draft: {
  startDate: string
  endDate: string
  city: string
  department: string
}): string | null {
  if (!draft.startDate || !draft.city.trim()) return null
  return `${dates(draft.startDate, draft.endDate)} · ${place(draft.city, draft.department)}`
}
```

- [ ] **Step 4: GREEN**, **Step 5: README, lint, commit** — `feat(v2): les phrases de la création d'une date`.

---

### Task 4: La barre de création

**Files:**
- Create: `apps/web-v2/src/features/event-create/CreateBar.tsx`
- Modify: `apps/web-v2/src/components/layout/AppShell.tsx` (prop `bare`), `apps/web-v2/src/App.tsx` (route `/evenement/nouveau` : `<AppShell bare>`), `apps/web-v2/src/features/event-create/CreateEvent.tsx`, `apps/web-v2/src/styles/3-components/create-event.css`, `apps/web-v2/src/styles/2-semantic.css`

**Interfaces:**
- Produces: `CreateBar({ step: number; reached: number; onStep: (step: number) => void; onQuit: () => void; saved: boolean })`.

- [ ] **Step 1: `AppShell`** — prop facultative `bare?: boolean` : sans elle rien ne change ; avec, la `Topbar` n'est pas rendue.
- [ ] **Step 2: `CreateBar`** — maquette `2082:2` (relever les mesures avec `get_design_context` sur la barre) : à gauche un bouton « × Quitter » (icône `X`), au centre les 4 étapes de `STEPS` (rond numéroté + nom ; l'étape courante en encre pleine ; une étape `≤ reached` est un bouton qui appelle `onStep`, les autres sont du texte pâle), à droite « ✓ Brouillon enregistré » si `saved`.
- [ ] **Step 3: `CreateEvent`** — remplacer l'ancien haut (`.create__top`, son lien « Tableau de bord », son badge et sa poubelle) par `CreateBar` ; tenir `reached` (la plus loin des étapes atteintes) ; « × Quitter » → `navigate(-1)` si l'historique a une page d'avant dans l'app (`window.history.state?.idx > 0`), sinon `/` ; « Effacer le brouillon » passe en bas à gauche du formulaire (la confirmation « Effacer le brouillon ? Effacer / Garder » d'aujourd'hui, au même endroit) ; le bouton « Retour » du bas reste. Supprimer le CSS devenu mort.
- [ ] **Step 4: Vérifier** (navigateur, `localhost`) — la barre, le passage d'étape, revenir à une étape faite par la barre, « Quitter ».
- [ ] **Step 5: Lint, commit** — `feat(v2): la barre de création d'une date`.

---

### Task 5: Les doublons enrichis

**Files:**
- Create: `apps/web-v2/src/features/event-create/DuplicateList.tsx`
- Modify: `apps/web-v2/src/features/event-create/useSimilarEvents.ts`, `apps/web-v2/src/features/event-create/Steps.tsx` (retirer `DuplicateWarning`), `CreateEvent.tsx`, `create-event.css`

**Interfaces:**
- Consumes: `duplicateLine` (Task 3) ; `Poster` ; colonnes de la Task 1.
- Produces: `SimilarEvent` gagne `imageUrl: string | null`, `tags: string[]`, `exhibitors: number` ; `DuplicateList({ similar, previousEditionId, onPickEdition })`.

- [ ] **Step 1: `useSimilarEvents`** — lire les nouvelles colonnes (`image_url ?? null`, `tags ?? []`, `exhibitors ?? 0`) ; supprimer le transtypage manuel au profit des types régénérés.
- [ ] **Step 2: `DuplicateList`** — maquette : en-tête (icône `Copy`) « {N} événement(s) ressemble(nt) », une carte par doublon (`Poster` en vignette, nom en gras, `duplicateLine(...).meta`, à droite `<Link to="/evenement/{id}">Ouvrir →</Link>` ; un doublon `past` garde en plus « C'est sa nouvelle édition » / « ✓ Nouvelle édition de celui-ci » repris de `DuplicateWarning`), puis la phrase de la spec. Placé dans la colonne du formulaire, sous la carte « Événement privé », au-dessus des boutons.
- [ ] **Step 3: `CreateEvent`** — l'aperçu ne cède plus sa place aux doublons ; `DuplicateWarning` est supprimé de `Steps.tsx` (code mort).
- [ ] **Step 4: Vérifier** — taper « Médiévales de Provins » : les cartes, « Ouvrir → » ouvre la fiche, un passé montre « Passé » et le bouton d'édition.
- [ ] **Step 5: Lint, commit** — `feat(v2): les doublons d'une date, avec leur affiche et leurs inscrits`.

---

### Task 6: L'aperçu et les textes des étapes

**Files:**
- Modify: `apps/web-v2/src/features/event-create/EventPreview.tsx` (réécrit), `Steps.tsx` (titres et phrases des étapes 2-4), `CreateEvent.tsx`, `create-event.css`, `2-semantic.css`

**Interfaces:**
- Consumes: `previewPlace` (Task 3) ; `canActOn` (`lib/plan.ts`) ; `Tag` (`components/ui/Tag.tsx`).

- [ ] **Step 1: `EventPreview`** — « Aperçu », carte : l'affiche (l'image choisie, sinon un cadre en pointillés avec l'icône `Image` et « L'affiche viendra à l'étape 4 »), le nom (« Sans nom pour l'instant » si vide), `previewPlace(draft) ?? 'Date et lieu à l'étape suivante'`, les catégories (`Tag`), puis sous la carte « ✓ À la création, tu y es inscrit en « Intéressé » » seulement si la date de début est vide ou si `canActOn(début, pro, aujourd'hui)`.
- [ ] **Step 2: Les textes des étapes** — titres et phrases de la spec pour les étapes 2, 3, 4 ; « Étape N sur 4 » au-dessus du titre (comme la maquette).
- [ ] **Step 3: Vérifier, lint, commit** — `feat(v2): l'aperçu de la date qu'on ajoute, sur la maquette`.

---

### Task 7: Où et quand — l'adresse suggérée

**Files:**
- Create: `apps/web-v2/src/features/event-create/AddressField.tsx`
- Modify: `useEventDraft.ts` (champs `latitude: number | null`, `longitude: number | null`, `geoPrecision: '' | 'precise' | 'city'`), `Steps.tsx` (`StepPlace` utilise `AddressField`), `create-event.css`

**Interfaces:**
- Consumes: `searchPlaces`, `PlaceSuggestion` (Task 2).
- Produces: `AddressField({ value: string; onType: (address: string) => void; onPick: (place: PlaceSuggestion) => void })`.

- [ ] **Step 1: Le brouillon** — trois champs ajoutés à `EventDraft` et `EMPTY_DRAFT` (`null`, `null`, `''`) ; un brouillon ancien se relit (le gabarit vide est déjà fusionné) — ajouter un test dans un nouveau `useEventDraft.test.ts` si la fusion est exportable (`readDraft` exporté) : un brouillon JSON sans les trois champs → ils valent `null`, `null`, `''`.
- [ ] **Step 2: `AddressField`** — un champ texte ; 300 ms après la dernière frappe (3 caractères au moins), `searchPlaces` ; liste sous le champ (`role="listbox"`, chaque suggestion `role="option"` avec son libellé) ; Flèches haut/bas, Entrée choisit, Échap ferme, un clic choisit ; une recherche dont la réponse arrive après une frappe plus récente est ignorée.
- [ ] **Step 3: Brancher** — `onType` : `update('address', …)` **et** remet `latitude`/`longitude`/`geoPrecision` à vide (une adresse modifiée à la main ne garde pas la position d'une autre) ; `onPick` : adresse, ville, département, latitude, longitude, `geoPrecision: 'precise'`.
- [ ] **Step 4: Vérifier** — taper « place de jaude clermont », choisir : ville « Clermont-Ferrand », département « 63 » remplis ; couper le réseau (DevTools hors ligne) : pas de liste, aucune erreur.
- [ ] **Step 5: Lint, commit** — `feat(v2): l'adresse d'une date, suggérée par la Base Adresse Nationale`.

---

### Task 8: La fin — affiche réduite, position, fiche

**Files:**
- Modify: `apps/web-v2/src/features/event-create/CreateEvent.tsx`

- [ ] **Step 1: L'affiche** — `resizeImage(poster, 1200)` avant l'envoi (`imageProblem` refuse un fichier inutilisable avec son message) ; chemin `${crypto.randomUUID()}.${webp|jpg}`.
- [ ] **Step 2: La position** — si `geoPrecision` est vide : `locateCity(city, department)` ; trouvée → `geo_precision: 'city'`, sinon les trois colonnes à `null`. Insérer `latitude`, `longitude`, `geo_precision`.
- [ ] **Step 3: La fiche** — après l'inscription « Intéressé » et l'effacement du brouillon : `go(`/evenement/${created.id}`)`. Le bouton dit « Créer la date » (« Création… » pendant l'écriture).
- [ ] **Step 4: Lint, test, build, commit** — `feat(v2): une date créée a sa position et ouvre sa fiche`.

---

### Task 9: L'essai de bout en bout (au GO d'Uriel)

**Files:** aucun dans le dépôt (script jetable dans le dossier temporaire de la session).

- [ ] **Step 1** — compte de test jetable (comme au lot 10a : admin le temps de l'essai, connecté sur `localhost` par un jeton à usage unique), arrivée faite par script (`display_name` et une enseigne par `create_owned_entity`).
- [ ] **Step 2** — dans le navigateur, une date **privée** : « Test 10b — à effacer », adresse choisie dans les suggestions, une date à moins de 6 mois, une affiche ; « Créer la date » → arrivée sur sa fiche, « Intéressé ».
- [ ] **Step 3: En base** — `latitude`, `longitude`, `geo_precision = 'precise'`, `is_private = true`, l'affiche réduite (taille du fichier dans le stockage), la participation `interesse`.
- [ ] **Step 4: Effacer** — la date (client admin : `events.delete().eq('id', …)`), l'affiche du stockage, puis le compte par `delete-account` ; vérifier qu'il ne reste rien.

---

## Après les tâches

Relecture fraîche de toute la branche (modèle le plus capable), corrections Critiques et Importantes en TDD, puis : déploiement au GO (2.33.0), docs (plan directeur : 10b ☑ ; `maquettes-2027.md` : `2082:2` intégré ; `_État.md`), push.
