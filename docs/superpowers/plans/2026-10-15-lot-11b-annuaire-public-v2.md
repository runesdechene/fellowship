# Lot 11b — L'annuaire public (V2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** un visiteur sans compte cherche des festivals depuis la landing, voit les résultats des 3 prochains mois (`/festivals`) et ouvre une fiche en lecture seule, avec un aperçu flouté des avis et des questions.

**Architecture:** l'horizon de recherche de `lib/explorer.ts` devient un nombre de mois (3 / 6 / illimité) ; la requête de recherche sort de `useExplorer` dans `lib/event-search.ts`, partagée par l'Explorer et la page publique. La page publique vit dans `features/public-search/`, la fiche visiteur est la fiche existante montée dans un `GuestShell` (barre de la landing + mur d'affiche) qui masque ce qui demande un compte. Une fonction SQL rend deux nombres (avis, questions) à `anon`.

**Tech Stack:** React 19, React Router 7 (`BrowserRouter`, basename `/v2`), TypeScript strict (`noUncheckedIndexedAccess`), Supabase (supabase-js, PostgreSQL), Vitest, ESLint/stylelint/prettier stricts.

**Spec:** `docs/superpowers/specs/2026-10-15-v2-annuaire-public-11b-design.md`

## Global Constraints

- Sans compte : **3 mois** ; compte gratuit : **6 mois** ; Pro : illimité. L'Explorer connecté garde exactement son comportement.
- Seules les fiches publiques (`is_private = false`) ; une fiche privée est « introuvable » pour un visiteur.
- Le visiteur ne voit **ni avis ni discussions** : seulement l'aperçu flouté, avec les vrais nombres, et **aucun contenu réel** envoyé au navigateur.
- Aucune lecture d'amis, de statut, d'enseignes, de `follows`, de `histoire_evenement` ou d'`event_threads` côté visiteur.
- Code : chaque fichier a son en-tête `QUOI / POURQUOI / (ATTENTION)`, chaque dossier un `README.md` ; 400 lignes max par fichier ; aucun style dans les `.tsx` (sauf variables `'--x'`), aucune valeur en dur dans `styles/3-components/` ; pas d'`any`, de `!`, de `console`.
- Migrations : `supabase/migrations/<horodatage>_<nom>.sql`, le POURQUOI en tête, appliquées par `node_modules/supabase/bin/supabase.exe db push --linked` (jamais `apply_migration` du MCP). La base est la **production** : aucune écriture pour tester.
- Commits Conventional Commits en français, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. La version de `apps/web-v2/package.json` monte sur les commits visibles : `2.45.0` (Task 5), `2.45.1` (Task 6) ; les refactorisations et la migration n'y touchent pas.
- Écart assumé avec la spec : la landing et la page publique utilisent `LandingSearch` (le champ blanc de la maquette), pas le `SearchBar` de l'Explorer — même logique (`quandChoices`), autre habit.
- Avant chaque commit : `pnpm --filter web-v2 lint` et `pnpm --filter web-v2 test`.

## Review Focus

1. **Un admin connecté** ouvre `/evenement/:id` et `/explorer` : rien n'a changé (statut, avis, discussions, « Mon bilan », 6 mois en gratuit, compteur « après {mois} »). → Task 1 (tests de non-régression de l'horizon 6 / illimité), Task 7 (parcours connecté).
2. **Une recherche qui ne trouve rien** (`/festivals?q=zzz`) : « Aucun résultat pour « zzz ». », pas de grille, pas de « Voir les… », bande du bas seulement si des festivals attendent au-delà. → Task 5 (test de `publicTitle`), Task 7.
3. **Un identifiant de fiche privée** collé dans l'adresse sans compte : « Cet événement est introuvable. », et `compter_avis_et_questions` rend 0, 0. → Task 3 (appel anon sur une fiche privée), Task 6.
4. **Plus de résultats que la limite de requête** : « Voir les N festivals » annonce le vrai total ; la grille complète montre au plus `PUBLIC_LIMIT` cartes. → Task 5.
5. **L'aperçu flouté quand la fonction échoue ou ne trouve rien** : il ne s'affiche pas (ni « 0 avis »), le reste de la fiche s'affiche. → Task 6 (test de `teaserLine`).

---

### Task 1: L'horizon de recherche devient un nombre de mois

**Files:**
- Modify: `apps/web-v2/src/lib/explorer.ts`
- Modify: `apps/web-v2/src/lib/explorer.test.ts`
- Modify: `apps/web-v2/src/features/explorer/SearchBar.tsx`
- Modify: `apps/web-v2/src/features/explorer/ExplorerPage.tsx:72`
- Modify: `apps/web-v2/src/features/explorer/useExplorer.ts:121-189,281-300`
- Modify: `apps/web-v2/src/features/explorer/ProEndCard.tsx`

**Interfaces:**
- Produces (dans `lib/explorer.ts`) :
  - `export type Horizon = number | null` — mois fouillés ; `null` = Pro, sans borne.
  - `export const GUEST_MONTHS = 3`, `export const FREE_MONTHS = 6` (existe déjà).
  - `quandChoices(horizon: Horizon, quand?: string | null): QuandChoice[]`
  - `searchWindow(quand: string | null, horizon: Horizon, today: Date): DateWindow`
  - `beyondWindow(quand: string | null, today: Date, horizon: number): DateWindow | null`
  - `windowMonths(value: string | null, horizon: Horizon): number`
  - `lastOpenMonth(today: Date, horizon: number): Date` — le 1er du dernier mois fouillé.
- `SearchBar` prend `horizon: Horizon` au lieu de `pro: boolean`.

- [ ] **Step 1: Réécrire les tests de l'horizon** — dans `explorer.test.ts`, remplacer les appels à booléen et ajouter le visiteur. Import : ajouter `FREE_MONTHS, GUEST_MONTHS, lastOpenMonth`.

```ts
describe('quandChoices', () => {
  it('le Pro choisit jusqu’à 12 mois', () => {
    expect(quandChoices(null).map((option) => option.months)).toEqual([12, 3, 1])
  })
  it('le gratuit fouille ses 6 prochains mois au plus', () => {
    expect(quandChoices(FREE_MONTHS).map((option) => option.months)).toEqual([6, 3, 1])
    expect(quandChoices(FREE_MONTHS)[0]?.label).toBe('Les 6 prochains mois')
  })
  it('sans compte, 3 mois au plus', () => {
    expect(quandChoices(GUEST_MONTHS)).toEqual([
      { value: '3', label: 'Les 3 prochains mois', months: 3 },
      { value: '1', label: 'Ce mois-ci', months: 1 },
    ])
  })
})

describe('windowMonths', () => {
  it('en gratuit, une adresse qui demande 12 mois est ramenée à 6', () => {
    expect(windowMonths('12', FREE_MONTHS)).toBe(6)
    expect(windowMonths(null, FREE_MONTHS)).toBe(6)
  })
  it('en gratuit, 3 mois restent 3 mois', () => {
    expect(windowMonths('3', FREE_MONTHS)).toBe(3)
  })
  it('en Pro, 12 mois par défaut', () => {
    expect(windowMonths(null, null)).toBe(12)
  })
  it('sans compte, jamais plus de 3 mois', () => {
    expect(windowMonths(null, GUEST_MONTHS)).toBe(3)
    expect(windowMonths('12', GUEST_MONTHS)).toBe(3)
    expect(windowMonths('1', GUEST_MONTHS)).toBe(1)
  })
})
```

Dans `describe('searchWindow')` : `searchWindow('3', true, today)` → `searchWindow('3', null, today)` ; `searchWindow(null, false, today)` → `searchWindow(null, FREE_MONTHS, today)` ; les deux appels `'2026-12'` / `'2026-10'` avec `true` → `null` ; `searchWindow('2027-06', false, today)` → `searchWindow('2027-06', FREE_MONTHS, today)`. Ajouter :

```ts
  it('sans compte, les 3 prochains mois', () => {
    expect(searchWindow(null, GUEST_MONTHS, today)).toEqual({
      from: today,
      to: new Date(2027, 0, 1),
    })
  })
```

Dans `describe('beyondWindow')` : ajouter `, FREE_MONTHS` en troisième argument aux trois appels existants, et ajouter :

```ts
  it('sans compte : de janvier à douze mois', () => {
    expect(beyondWindow(null, today, GUEST_MONTHS)).toEqual({
      from: new Date(2027, 0, 1),
      to: new Date(2027, 9, 1),
    })
  })
```

Dans `describe('quandChoices avec un mois précis')` : `quandChoices(true, '2026-12')` → `quandChoices(null, '2026-12')`. Puis ajouter :

```ts
describe('lastOpenMonth', () => {
  const today = new Date(2026, 9, 11)
  it('le dernier mois fouillé : décembre sans compte, mars en gratuit', () => {
    expect(lastOpenMonth(today, GUEST_MONTHS)).toEqual(new Date(2026, 11, 1))
    expect(lastOpenMonth(today, FREE_MONTHS)).toEqual(new Date(2027, 2, 1))
  })
})
```

- [ ] **Step 2: Lancer les tests, ils échouent**

Run: `pnpm --filter web-v2 test -- explorer`
Expected: FAIL (`GUEST_MONTHS` / `lastOpenMonth` non exportés, appels typés booléens).

- [ ] **Step 3: Réécrire l'horizon dans `lib/explorer.ts`** — remplacer `FREE_WIDEST`, `quandChoices`, `searchWindow`, `beyondWindow`, `windowMonths` ; retirer l'import de `proHorizon`.

```ts
/** Les mois que la recherche fouille : 3 sans compte, 6 en gratuit (Dev.md, révisé le 08/10/2026,
 *  et règle du 14/10/2026), `null` en Pro — sans borne. */
export type Horizon = number | null
export const GUEST_MONTHS = 3
export const FREE_MONTHS = 6

/** Le choix le plus large d'un horizon borné : « Les 6 prochains mois ». */
function widest(horizon: number): QuandChoice {
  return { value: String(horizon), label: `Les ${horizon} prochains mois`, months: horizon }
}

/** Les choix de « Quand » ; un mois précis demandé par l'adresse s'ajoute en tête, nommé. */
export function quandChoices(horizon: Horizon, quand: string | null = null): QuandChoice[] {
  const base: QuandChoice[] =
    horizon === null
      ? [...QUAND_OPTIONS]
      : [widest(horizon), ...QUAND_OPTIONS.filter((option) => option.months < horizon)]
  const month = monthStart(quand)
  if (!month || quand === null) return base
  return [
    { value: quand, label: `${formatMonthLabel(month)} ${month.getFullYear()}`, months: 1 },
    ...base,
  ]
}

/** La fenêtre cherchée [from, to[ : un mois précis, ou les N prochains mois. Un horizon borné
 *  l'arrête — un mois au-delà donne une fenêtre vide. */
export function searchWindow(quand: string | null, horizon: Horizon, today: Date): DateWindow {
  const month = monthStart(quand)
  if (!month) return { from: today, to: monthsAhead(today, windowMonths(quand, horizon)) }
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1)
  const from = month < today ? today : month
  if (horizon === null) return { from, to: next }
  const limit = monthsAhead(today, horizon)
  return { from, to: next < limit ? next : limit }
}

/** La part de la recherche cachée au-delà de l'horizon, ou null s'il n'y en a pas. */
export function beyondWindow(quand: string | null, today: Date, horizon: number): DateWindow | null {
  const limit = monthsAhead(today, horizon)
  const month = monthStart(quand)
  if (!month) return { from: limit, to: monthsAhead(today, 12) }
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1)
  if (next <= limit) return null
  return { from: month < limit ? limit : month, to: next }
}

/** La fenêtre réellement cherchée : celle de l'adresse, bornée par l'horizon. */
export function windowMonths(value: string | null, horizon: Horizon): number {
  if (horizon === null) return quandMonths(value)
  const asked = value === String(horizon) ? horizon : quandMonths(value)
  return Math.min(asked, horizon)
}

/** Le 1er du dernier mois fouillé : « 42 festivals t'attendent après mars ». */
export function lastOpenMonth(today: Date, horizon: number): Date {
  return monthsAhead(today, horizon - 1)
}
```

Mettre à jour l'en-tête du fichier (`POURQUOI`) pour citer les trois horizons.

- [ ] **Step 4: Brancher les appelants**
  - `SearchBar.tsx` : prop `horizon: Horizon` (import `type Horizon` depuis `@/lib/explorer`), commentaire « Le choix le plus large suit l'horizon : 3 mois sans compte, 6 en gratuit (lib/explorer.ts). », et `quandChoices(horizon, quand)`.
  - `ExplorerPage.tsx` : `import { FREE_MONTHS } from '@/lib/explorer'` et `<SearchBar horizon={pro ? null : FREE_MONTHS} … />` à la place de `pro={pro}`.
  - `useExplorer.ts` : en tête du fichier `const horizonOf = (pro: boolean): Horizon => (pro ? null : FREE_MONTHS)` ; partout où `searchWindow(query.quand, pro, today)` → `searchWindow(query.quand, horizonOf(pro), today)` ; `beyondWindow(query.quand, today)` → `beyondWindow(query.quand, today, FREE_MONTHS)`. (La Task 2 déplace ces requêtes : ici on ne fait que garder le build vert.)
  - `ProEndCard.tsx` : `const lastMonth = monthName(lastOpenMonth(new Date(), FREE_MONTHS))`, imports `lastOpenMonth, FREE_MONTHS` depuis `@/lib/explorer`, retirer `monthsAhead` s'il n'est plus utilisé.

- [ ] **Step 5: Lancer tests et lint**

Run: `pnpm --filter web-v2 test -- explorer` puis `pnpm --filter web-v2 lint`
Expected: PASS, zéro avertissement.

- [ ] **Step 6: Commit**

```bash
git add apps/web-v2/src/lib/explorer.ts apps/web-v2/src/lib/explorer.test.ts apps/web-v2/src/features/explorer
git commit -m "refactor(v2): l'horizon de recherche devient un nombre de mois — 3 sans compte, 6 en gratuit, sans borne en Pro"
```

---

### Task 2: La requête de recherche, sans acteur, dans `lib/event-search.ts`

**Files:**
- Create: `apps/web-v2/src/lib/event-search.ts`
- Create: `apps/web-v2/src/lib/event-search.test.ts`
- Modify: `apps/web-v2/src/features/explorer/useExplorer.ts`
- Modify: `apps/web-v2/src/lib/README.md` (une ligne pour le nouveau fichier, s'il liste les fichiers)

**Interfaces:**
- Consumes: `Horizon`, `searchWindow`, `beyondWindow`, `searchPattern` (Task 1).
- Produces:
  - `export interface SearchQuery { q: string; ou: string; quand: string | null; tag: { name: string; slug: string } | null }`
  - `export interface EventRow { id; name; image_url: string | null; tags: string[] | null; start_date: string; end_date: string; city: string; department: string; created_at: string }`
  - `export interface SearchEvent { id: string; name: string; imageUrl: string | null; tags: string[] | null; startDate: Date; endDate: Date; city: string; department: string; isNew: boolean }`
  - `toSearchEvent(row: EventRow, today: Date): SearchEvent`
  - `eventsInWindow(query: SearchQuery, today: Date, horizon: Horizon)` — requête supabase (non attendue)
  - `searchEvents(query: SearchQuery, today: Date, horizon: Horizon)` — la même + mots et lieu
  - `countBeyond(query: SearchQuery, today: Date, horizon: number): Promise<number>`
  - `EVENT_COLUMNS: string`
- `useExplorer` : `ExploreEvent extends SearchEvent`, `ExplorerQuery` devient un alias de `SearchQuery`.

- [ ] **Step 1: Test de `toSearchEvent`**

```ts
/**
 * QUOI     — les tests de lib/event-search.ts : la mise en forme d'une ligne d'événement.
 * POURQUOI — la carte publique et l'Explorer lisent les mêmes champs : une date mal lue décale
 *            toute une grille.
 */
import { describe, expect, it } from 'vitest'
import { toSearchEvent } from './event-search'

describe('toSearchEvent', () => {
  const row = {
    id: 'e1',
    name: 'Salon du tatouage',
    image_url: null,
    tags: ['salon'],
    start_date: '2026-10-17',
    end_date: '2026-10-18',
    city: 'Clermont-Ferrand',
    department: '63',
    created_at: '2026-10-14T09:00:00Z',
  }

  it('lit les dates en jours locaux et garde le lieu', () => {
    const event = toSearchEvent(row, new Date(2026, 9, 15))
    expect(event.startDate).toEqual(new Date(2026, 9, 17))
    expect(event.endDate).toEqual(new Date(2026, 9, 18))
    expect(event.city).toBe('Clermont-Ferrand')
    expect(event.imageUrl).toBeNull()
  })

  it('« Nouveau » suit isRecent', () => {
    expect(toSearchEvent(row, new Date(2026, 9, 15)).isNew).toBe(true)
    expect(toSearchEvent(row, new Date(2027, 0, 15)).isNew).toBe(false)
  })
})
```

- [ ] **Step 2: Lancer, il échoue**

Run: `pnpm --filter web-v2 test -- event-search`
Expected: FAIL (module introuvable). Si `isRecent` a une fenêtre différente de ce que suppose le second test, lire `lib/dates.ts` et ajuster les dates du test à sa vraie fenêtre — sans toucher `isRecent`.

- [ ] **Step 3: Écrire `lib/event-search.ts`** — en déplaçant le code de `useExplorer.ts` (`EVENT_COLUMNS`, `EventRow`, `eventsInWindow`, `countBeyond`) sans changer les requêtes.

```ts
/**
 * QUOI     — la recherche de festivals publics, sans acteur : la requête d'une fenêtre (catégorie
 *            comprise), ses mots et son lieu, le compte de ce qui attend au-delà de l'horizon.
 * POURQUOI — l'Explorer connecté et la recherche publique (lot 11b) cherchent pareil ; seuls
 *            l'horizon et ce qu'on ajoute autour (amis, statut) changent.
 * ATTENTION — seules les fiches publiques : `is_private = false` dans chaque requête.
 */
import { isRecent, parseSqlDate, todayIso } from './dates'
import { beyondWindow, searchPattern, searchWindow, type Horizon } from './explorer'
import { supabase } from './supabase'

export const EVENT_COLUMNS =
  'id, name, image_url, tags, start_date, end_date, city, department, created_at'

export interface SearchQuery {
  q: string
  ou: string
  quand: string | null
  /** Les deux écritures d'une catégorie dans `events.tags` : son nom et son slug. */
  tag: { name: string; slug: string } | null
}

export interface EventRow {
  id: string
  name: string
  image_url: string | null
  tags: string[] | null
  start_date: string
  end_date: string
  city: string
  department: string
  created_at: string
}

export interface SearchEvent {
  id: string
  name: string
  imageUrl: string | null
  tags: string[] | null
  startDate: Date
  endDate: Date
  city: string
  department: string
  isNew: boolean
}

export function toSearchEvent(row: EventRow, today: Date): SearchEvent {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.image_url,
    tags: row.tags,
    startDate: parseSqlDate(row.start_date),
    endDate: parseSqlDate(row.end_date),
    city: row.city,
    department: row.department,
    isNew: isRecent(row.created_at, today),
  }
}

/** Le socle de toutes les requêtes d'événements : publics, dans la fenêtre, de la catégorie. */
export function eventsInWindow(query: SearchQuery, today: Date, horizon: Horizon) {
  const { from, to } = searchWindow(query.quand, horizon, today)
  let request = supabase
    .from('events')
    .select(EVENT_COLUMNS, { count: 'exact' })
    .eq('is_private', false)
    .gte('end_date', todayIso(from))
    .lt('start_date', todayIso(to))
  if (query.tag) request = request.overlaps('tags', [query.tag.name, query.tag.slug])
  return request
}

/** La fenêtre, plus les mots (nom, ville, département) et le lieu (ville, département). */
export function searchEvents(query: SearchQuery, today: Date, horizon: Horizon) {
  const words = searchPattern(query.q)
  const place = searchPattern(query.ou)
  let request = eventsInWindow(query, today, horizon)
  if (words)
    request = request.or(`name.ilike.${words},city.ilike.${words},department.ilike.${words}`)
  if (place) request = request.or(`city.ilike.${place},department.ilike.${place}`)
  return request
}

/** Combien de festivals de la même recherche attendent au-delà de l'horizon. */
export async function countBeyond(
  query: SearchQuery,
  today: Date,
  horizon: number,
): Promise<number> {
  const beyond = beyondWindow(query.quand, today, horizon)
  if (!beyond) return 0
  const words = searchPattern(query.q)
  const place = searchPattern(query.ou)
  let request = supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('is_private', false)
    .gte('start_date', todayIso(beyond.from))
    .lt('start_date', todayIso(beyond.to))
  if (query.tag) request = request.overlaps('tags', [query.tag.name, query.tag.slug])
  if (words)
    request = request.or(`name.ilike.${words},city.ilike.${words},department.ilike.${words}`)
  if (place) request = request.or(`city.ilike.${place},department.ilike.${place}`)
  const { count, error } = await request
  if (error) throw new Error(error.message)
  return count ?? 0
}
```

Le `{ count: 'exact' }` sur `eventsInWindow` donne le total à la page publique (Task 5) ; l'Explorer l'ignore. Si le typage de supabase-js refuse `.or` sur la requête rendue par `eventsInWindow`, garder le patron exact de l'actuel `loadSearch` (variable `let events = …` puis réassignation) — c'est celui qui compile aujourd'hui.

- [ ] **Step 4: Brancher `useExplorer.ts`**
  - Supprimer `EVENT_COLUMNS`, `EventRow`, `eventsInWindow`, `countBeyond` locaux ; importer depuis `@/lib/event-search`.
  - `export type ExplorerQuery = SearchQuery` ; `export interface ExploreEvent extends SearchEvent { friends: Friend[]; myStatus: ParticipationStatus | null }`.
  - Dans `enrich` : `return rows.map((row) => ({ ...toSearchEvent(row, today), friends: friendsByEvent.get(row.id) ?? [], myStatus: statusByEvent.get(row.id) ?? null }))` ; retirer les imports `isRecent, parseSqlDate` s'ils ne servent plus.
  - `loadHome` : `eventsInWindow(query, today, horizonOf(pro))` aux trois endroits.
  - `loadSearch` : `let events = searchEvents(query, today, horizonOf(pro))` ; supprimer les deux `if (words) events = …` / `if (place) events = …` devenus inutiles ; garder `words` / `place` pour la requête des enseignes.
  - `run` : `pro ? Promise.resolve(0) : countBeyond(current, today, FREE_MONTHS)`.
  - Vérifier : `grep -rn "ExplorerQuery\|ExploreEvent" apps/web-v2/src` — tous les usages compilent.

- [ ] **Step 5: Tests, lint, et l'Explorer à la main**

Run: `pnpm --filter web-v2 test` puis `pnpm --filter web-v2 lint`
Expected: PASS. Puis, avec `pnpm dev` + `pnpm dev:v2` (Uriel connecté en admin sur `http://localhost:5174/v2/explorer`) : l'accueil (trois rangées), une recherche « Lyon », la carte « N festivals t'attendent après {mois} » en gratuit (`?plan=free` si `devOverride` le permet) — identiques à avant.

- [ ] **Step 6: Commit**

```bash
git add apps/web-v2/src/lib/event-search.ts apps/web-v2/src/lib/event-search.test.ts apps/web-v2/src/features/explorer/useExplorer.ts apps/web-v2/src/lib/README.md
git commit -m "refactor(v2): la recherche de festivals sort de l'Explorer, sans acteur, pour la servir aussi sans compte"
```

---

### Task 3: La fonction `compter_avis_et_questions`

**Files:**
- Create: `supabase/migrations/20261015120000_compter_avis_et_questions.sql`
- Modify: `apps/web-v2/src/types/supabase.ts` (régénéré)

**Interfaces:**
- Produces: RPC `compter_avis_et_questions(p_event uuid) → TABLE(avis integer, questions integer)`, toujours **une** ligne ; appelable par `anon`.

- [ ] **Step 1: Lire les définitions live** (lecture seule, MCP Supabase `execute_sql` ou `psql`) :

```sql
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name in ('reviews', 'event_threads')
order by table_name, ordinal_position;

select pg_get_functiondef('public.get_event_reviews(uuid, uuid)'::regprocedure);
```

Si `get_event_reviews` filtre les avis (masqués, non vérifiés, supprimés…), reprendre **le même filtre** dans le comptage des avis ci-dessous : l'aperçu ne doit jamais annoncer plus d'avis que la fiche n'en montre. Idem pour `event_threads` si une colonne de suppression ou de modération existe.

- [ ] **Step 2: Écrire la migration**

```sql
-- POURQUOI — lot 11b (spec docs/superpowers/specs/2026-10-15-v2-annuaire-public-11b-design.md) :
-- sur la fiche vue sans compte, un aperçu flouté annonce « 4 avis · 7 questions » pour donner
-- envie de créer un compte. Les avis (reviews) et les fils (event_threads) restent fermés à anon :
-- cette fonction ne rend QUE deux nombres, et seulement pour une fiche publique. Jamais un
-- contenu, jamais un auteur. Une fiche privée ou inconnue rend 0, 0.
CREATE FUNCTION public.compter_avis_et_questions(p_event uuid)
RETURNS TABLE (avis integer, questions integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH fiche AS (
    SELECT id FROM public.events WHERE id = p_event AND is_private = false
  )
  SELECT
    (SELECT count(*) FROM public.reviews r JOIN fiche f ON f.id = r.event_id)::integer,
    (SELECT count(*) FROM public.event_threads t JOIN fiche f ON f.id = t.event_id)::integer;
$$;

REVOKE ALL ON FUNCTION public.compter_avis_et_questions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compter_avis_et_questions(uuid) TO anon, authenticated;
```

(Ajouter au `JOIN` des avis le filtre relevé à l'étape 1, s'il y en a un.)

- [ ] **Step 3: Appliquer**

Run (racine du dépôt) : `node_modules/supabase/bin/supabase.exe db push --linked`
Expected: la migration `20261015120000_compter_avis_et_questions.sql` appliquée, aucune autre.

- [ ] **Step 4: Vérifier avec la clé publique** (lecture seule ; `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` du `.env` racine) :

```bash
set -a; . ./.env; set +a
curl -s "$VITE_SUPABASE_URL/rest/v1/rpc/compter_avis_et_questions" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"p_event":"<id d’une fiche publique qui a des avis>"}'
curl -s "$VITE_SUPABASE_URL/rest/v1/rpc/compter_avis_et_questions" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"p_event":"<id d’une fiche privée>"}'
```

Trouver les deux ids en lecture : `select e.id, count(r.*) from events e join reviews r on r.event_id = e.id where not e.is_private group by e.id limit 1;` et `select id from events where is_private limit 1;`.
Expected: `[{"avis":N,"questions":M}]` avec N ≥ 1 ; puis `[{"avis":0,"questions":0}]`.

- [ ] **Step 5: Régénérer les types** (passer par un fichier temporaire, `.claude/rules/supabase.md`) :

```bash
node_modules/supabase/bin/supabase.exe gen types typescript --linked --schema public > "$TMP/supabase.ts" && cp "$TMP/supabase.ts" apps/web-v2/src/types/supabase.ts
grep -n "compter_avis_et_questions" apps/web-v2/src/types/supabase.ts
```

Expected: la fonction apparaît dans `Functions`. `git diff --stat apps/web-v2/src/types/supabase.ts` : seulement l'ajout attendu (sinon, signaler à Uriel avant de committer).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20261015120000_compter_avis_et_questions.sql apps/web-v2/src/types/supabase.ts
git commit -m "feat(db): compter_avis_et_questions rend à un visiteur le nombre d'avis et de questions d'une fiche publique"
```

---

### Task 4: Le cadre visiteur — barre « ailleurs », pied de page partagé, `GuestShell`

**Files:**
- Modify: `apps/web-v2/src/features/landing/LandingTopBar.tsx`
- Create: `apps/web-v2/src/features/landing/LandingFoot.tsx`
- Modify: `apps/web-v2/src/features/landing/FinalCall.tsx`
- Modify: `apps/web-v2/src/features/landing/README.md`
- Create: `apps/web-v2/src/components/layout/GuestShell.tsx`
- Modify: `apps/web-v2/src/components/layout/README.md`
- Create: `apps/web-v2/src/styles/3-components/guest-shell.css` (+ son import, au même endroit que `app-shell.css`)

**Interfaces:**
- Produces: `<LandingTopBar away? />` ; `<LandingFoot>{enTête?}</LandingFoot>` ; `<GuestShell>{page}</GuestShell>`.

- [ ] **Step 1: `LandingTopBar` hors de la landing** — ajouter la prop `away?: boolean`. Ailleurs que sur la landing, la marque et les chapitres ramènent à la landing (lien plein : le navigateur descend seul jusqu'à l'ancre), et la barre est compacte d'emblée (sans l'ouverture sombre derrière, la crème ne se lirait pas).

```tsx
export function LandingTopBar({ away = false }: { away?: boolean }) {
  const { compact, active } = useLandingNav(IDS)
  const nav = useRef<HTMLElement>(null)
  // Hors de la landing, une ancre seule ne mène nulle part : elle passe par la landing.
  const home = away ? import.meta.env.BASE_URL : ''
  …
    <header className={`landing-bar${compact || away ? ' is-compact' : ''}`}>
      …
        <a className="landing-bar__brand" href={away ? home : '#'} aria-label="Fellowship, accueil">
      …
            <a key={chapter.id} href={`${home}#${chapter.id}`} aria-current={…}>
```

Compléter l'en-tête (`ATTENTION`) : « `away` : la barre posée sur une page publique (résultats, fiche) ».

- [ ] **Step 2: Sortir le pied de page** — `LandingFoot.tsx` reçoit le bloc `<footer className="landing-foot">…</footer>` de `FinalCall.tsx` tel quel, avec `{children}` à la place de `<OrganizersBox />` :

```tsx
/**
 * QUOI     — le pied de page de la landing : la marque, les liens, Runes de Chêne ; en tête, ce
 *            que la page y pose (l'encadré des organisateurs sur la landing).
 * POURQUOI — la landing et la recherche publique (lot 11b, maquette 2314:2) finissent pareil.
 * ATTENTION — les pages légales vivent dans la V1 : liens pleins, hors du routeur de la V2.
 */
import type { ReactNode } from 'react'
…
export function LandingFoot({ children }: { children?: ReactNode }) {
  return (
    <footer className="landing-foot">
      {children}
      <div className="landing-foot__top">…</div>
      <div className="landing-foot__bottom">…</div>
    </footer>
  )
}
```

Dans `FinalCall.tsx` : `<LandingFoot><OrganizersBox /></LandingFoot>` ; retirer les imports devenus inutiles (`Wordmark`, `Link` s'il ne sert plus qu'au bouton : il sert encore — le garder). Le lien « Pourquoi Fellowship » (`#assistant`) et « Organisateurs » (`#organisateurs`) : passer par `${import.meta.env.BASE_URL}#…` pour qu'ils marchent aussi depuis `/festivals`.

- [ ] **Step 3: `GuestShell`**

```tsx
/**
 * QUOI     — le cadre d'une page vue sans compte (la fiche d'un festival) : la barre de la landing,
 *            la page, le mur d'affiche à droite.
 * POURQUOI — lot 11b : un visiteur n'a ni barre latérale, ni cloche, ni compte ; il garde la
 *            barre qu'il connaît depuis la landing, avec « Se connecter » et « Créer ma vitrine ».
 * ATTENTION — le PageChromeProvider enveloppe tout : la fiche déclare son affiche, le mur la rend.
 */
import type { ReactNode } from 'react'
import { LandingTopBar } from '@/features/landing/LandingTopBar'
import { PageChromeProvider } from '@/lib/page-chrome'
import { PosterWall } from './PosterWall'

export function GuestShell({ children }: { children: ReactNode }) {
  return (
    <PageChromeProvider>
      <LandingTopBar away />
      <div className="guest-shell">
        <main className="guest-shell__main">{children}</main>
        <PosterWall />
      </div>
    </PageChromeProvider>
  )
}
```

Si l'import `components/ → features/` est refusé par le lint (règle de frontières), déplacer `LandingTopBar` + `useLandingNav` dans `components/layout/` et mettre à jour leurs imports — ne pas désactiver la règle.

- [ ] **Step 4: Le style du cadre** — `guest-shell.css` reprend la coque de `app-shell.css` sans barre latérale, sous la barre fixe :

```css
/**
 * QUOI     — le cadre d'une page vue sans compte (components/layout/GuestShell.tsx).
 * POURQUOI — la fiche garde sa mise en page de l'app : le contenu, et le mur d'affiche collé à
 *            droite ; la barre de la landing, fixe, passe au-dessus.
 */
.guest-shell {
  display: flex;
  min-height: 100vh;
  overflow-x: clip;
  background: var(--surface-app);
  font-family: var(--family-sans);
}

.guest-shell__main {
  position: relative;
  isolation: isolate;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  padding-top: var(--landing-bar-height);
}
```

Vérifier que `--landing-bar-height`, `--landing-cream` et les autres variables `--landing-*` sont définies sur `:root` (`2-semantic.css`) et non sous `.landing` ; si elles sont sous `.landing`, poser `className="landing"` sur un `<div>` qui enveloppe seulement `<LandingTopBar away />`.

- [ ] **Step 5: README** — `components/layout/README.md` : « `GuestShell.tsx` — le cadre d'une page vue sans compte : barre de la landing, page, mur d'affiche (lot 11b). » ; `features/landing/README.md` : « `LandingFoot.tsx` — le pied de page, partagé avec la recherche publique. »

- [ ] **Step 6: Lint, landing inchangée**

Run: `pnpm --filter web-v2 lint`
Expected: PASS. Sur `http://localhost:5174/v2/decouvrir` : la barre, les ancres et le pied de page sont identiques à avant.

- [ ] **Step 7: Commit**

```bash
git add apps/web-v2/src/features/landing apps/web-v2/src/components/layout apps/web-v2/src/styles
git commit -m "feat(v2): le cadre visiteur — la barre de la landing hors de la landing, son pied de page partagé"
```

---

### Task 5: La page de résultats publique `/festivals` et la recherche de la landing

**Files:**
- Modify: `apps/web-v2/src/lib/explorer.ts` (+ `explorer.test.ts`) : `publicTitle`, `beyondTitle`
- Create: `apps/web-v2/src/features/landing/LandingSearch.tsx`
- Modify: `apps/web-v2/src/features/landing/Opening.tsx`
- Create: `apps/web-v2/src/features/public-search/README.md`
- Create: `apps/web-v2/src/features/public-search/PublicSearchPage.tsx`
- Create: `apps/web-v2/src/features/public-search/PublicEventCard.tsx`
- Create: `apps/web-v2/src/features/public-search/usePublicSearch.ts`
- Create: `apps/web-v2/src/styles/3-components/public-search.css` (+ import)
- Modify: `apps/web-v2/src/styles/3-components/landing.css` (champs Où / Quand devenus de vrais champs)
- Modify: `apps/web-v2/src/App.tsx`

**Interfaces:**
- Consumes: `GUEST_MONTHS`, `quandChoices`, `windowMonths`, `lastOpenMonth` (Task 1) ; `searchEvents`, `countBeyond`, `toSearchEvent`, `SearchEvent`, `SearchQuery`, `EventRow` (Task 2) ; `LandingTopBar away`, `LandingFoot` (Task 4).
- Produces:
  - `publicTitle(count: number, query: string, months: number): string`
  - `beyondTitle(count: number, month: Date): string`
  - `usePublicSearch(query: SearchQuery): { events: SearchEvent[]; total: number; hiddenCount: number; loading: boolean; error: string | null }`
  - Route `/festivals`.

- [ ] **Step 1: Tests des titres** (dans `explorer.test.ts`, imports `publicTitle, beyondTitle`) :

```ts
describe('publicTitle', () => {
  it('sans mots : le nombre et la fenêtre', () => {
    expect(publicTitle(16, '', 3)).toBe('16 festivals dans les 3 prochains mois.')
    expect(publicTitle(1, '', 3)).toBe('1 festival dans les 3 prochains mois.')
    expect(publicTitle(4, '', 1)).toBe('4 festivals ce mois-ci.')
    expect(publicTitle(0, '', 3)).toBe('Aucun festival dans les 3 prochains mois.')
  })
  it('avec des mots : le titre des résultats', () => {
    expect(publicTitle(2, 'Lyon', 3)).toBe('2 résultats pour « Lyon ».')
    expect(publicTitle(0, 'zzz', 3)).toBe('Aucun résultat pour « zzz ».')
  })
})

describe('beyondTitle', () => {
  it('accorde et nomme le mois', () => {
    expect(beyondTitle(13, new Date(2026, 11, 1))).toBe(
      '13 festivals de plus t’attendent après décembre.',
    )
    expect(beyondTitle(1, new Date(2026, 11, 1))).toBe(
      '1 festival de plus t’attend après décembre.',
    )
  })
})
```

(Si `monthName` rend « Décembre » avec une capitale, utiliser le formateur en minuscules de `lib/dates.ts` que `ProEndCard` affiche — vérifier lequel donne « décembre » et l'utiliser ; ne pas ajouter de formateur.)

- [ ] **Step 2: Lancer, ils échouent** — Run: `pnpm --filter web-v2 test -- explorer` — Expected: FAIL (non exportés).

- [ ] **Step 3: Écrire les deux fonctions** dans `lib/explorer.ts` :

```ts
/** Le titre de la recherche publique : « 16 festivals dans les 3 prochains mois. » ; avec des
 *  mots, celui des résultats. */
export function publicTitle(count: number, query: string, months: number): string {
  if (query.trim() !== '') return `${resultsTitle(count, query.trim())}.`
  const when = months === 1 ? 'ce mois-ci' : `dans les ${months} prochains mois`
  if (count === 0) return `Aucun festival ${when}.`
  return `${count} ${count > 1 ? 'festivals' : 'festival'} ${when}.`
}

/** « 13 festivals de plus t'attendent après décembre. » */
export function beyondTitle(count: number, month: Date): string {
  const verb = count > 1 ? 'festivals de plus t’attendent' : 'festival de plus t’attend'
  return `${count} ${verb} après ${monthName(month)}.`
}
```

(Importer `monthName` depuis `./dates`.) Run: `pnpm --filter web-v2 test -- explorer` — Expected: PASS.

- [ ] **Step 4: `LandingSearch`** — la recherche de la maquette, qui marche : elle mène à `/festivals` avec `q`, `ou`, `quand` (rien quand c'est la valeur par défaut).

```tsx
/**
 * QUOI     — la recherche de la landing et de la page publique : Rechercher · Où · Quand.
 * POURQUOI — lot 11b : elle mène à de vrais résultats, sans compte, sur 3 mois (règle du
 *            14/10/2026), au lieu de la connexion.
 * ATTENTION — un formulaire natif : Entrée lance la recherche. L'état vit dans l'adresse.
 */
import { Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { GUEST_MONTHS, quandChoices } from '@/lib/explorer'

interface LandingSearchProps {
  q?: string
  ou?: string
  quand?: string | null
}

export function LandingSearch({ q = '', ou = '', quand = null }: LandingSearchProps) {
  const navigate = useNavigate()
  const choices = quandChoices(GUEST_MONTHS, quand)
  const [words, setWords] = useState(q)
  const [place, setPlace] = useState(ou)
  const [when, setWhen] = useState(
    choices.some((option) => option.value === quand) ? (quand ?? '') : (choices[0]?.value ?? ''),
  )

  function submit(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams()
    if (words.trim()) next.set('q', words.trim())
    if (place.trim()) next.set('ou', place.trim())
    if (when !== String(GUEST_MONTHS)) next.set('quand', when)
    const search = next.toString()
    void navigate(`/festivals${search ? `?${search}` : ''}`)
  }

  return (
    <form className="landing-search" role="search" onSubmit={submit}>
      <label className="landing-search__field landing-search__field--what">
        <span className="landing-search__label">Rechercher</span>
        <input
          className="landing-search__value"
          value={words}
          placeholder="Un festival, une ville…"
          onChange={(change) => {
            setWords(change.target.value)
          }}
        />
      </label>
      <label className="landing-search__field landing-search__field--where">
        <span className="landing-search__label">Où</span>
        <input
          className="landing-search__value"
          value={place}
          placeholder="Toute la France"
          onChange={(change) => {
            setPlace(change.target.value)
          }}
        />
      </label>
      <label className="landing-search__field landing-search__field--when">
        <span className="landing-search__label">Quand</span>
        <select
          className="landing-search__value landing-search__select"
          value={when}
          onChange={(change) => {
            setWhen(change.target.value)
          }}
        >
          {choices.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="landing-search__submit" aria-label="Rechercher">
        <Search size={18} strokeWidth={2.2} />
      </button>
    </form>
  )
}
```

Dans `Opening.tsx` : remplacer le `<form>…</form>` et la fonction `toLogin` par `<LandingSearch />` ; retirer `useNavigate`, `FormEvent`, `Search` s'ils ne servent plus ; mettre à jour l'`ATTENTION` de l'en-tête (« la recherche mène à `/festivals` »).

Dans `landing.css`, les champs Où / Quand étaient des `<button>` : lire leurs règles (`.landing-search__field--where`, `--when`) et les adapter à un `<label>` ; ajouter pour le menu :

```css
.landing-search__select {
  appearance: none;
  border: 0;
  background: none;
  padding: 0;
  cursor: pointer;
}

.landing-search input.landing-search__value,
.landing-search__select {
  color: var(--landing-search-ink);
}
```

(Si `--landing-search-ink` n'existe pas, prendre le jeton de couleur du texte saisi déjà utilisé par `.landing-search__field--what input` ; s'il n'y en a pas, l'ajouter dans `2-semantic.css` à côté de `--landing-search-placeholder`, valeur relevée dans la maquette `2290:2`.)

- [ ] **Step 5: `usePublicSearch`**

```ts
/**
 * QUOI     — charge la recherche publique : les festivals des 3 prochains mois (ou moins) qui
 *            répondent à ?q / ?ou / ?quand, leur total, et combien attendent au-delà.
 * POURQUOI — lot 11b : la même requête que l'Explorer (lib/event-search.ts), sans acteur ;
 *            la fonction rend l'état, l'effet l'applique une fois.
 */
import { useEffect, useState } from 'react'
import {
  countBeyond,
  searchEvents,
  toSearchEvent,
  type SearchEvent,
  type SearchQuery,
} from '@/lib/event-search'
import { GUEST_MONTHS } from '@/lib/explorer'
import { must } from '@/lib/supabase'

/** Au-delà, « Voir les N festivals » annonce le vrai total mais la grille s'arrête là. */
export const PUBLIC_LIMIT = 100

interface PublicSearch {
  events: SearchEvent[]
  total: number
  hiddenCount: number
  loading: boolean
  error: string | null
}

const EMPTY: PublicSearch = { events: [], total: 0, hiddenCount: 0, loading: true, error: null }

async function loadPublicSearch(query: SearchQuery): Promise<PublicSearch> {
  const today = new Date()
  const [response, hiddenCount] = await Promise.all([
    searchEvents(query, today, GUEST_MONTHS)
      .order('start_date', { ascending: true })
      .limit(PUBLIC_LIMIT),
    countBeyond(query, today, GUEST_MONTHS),
  ])
  const rows = must(response)
  return {
    events: rows.map((row) => toSearchEvent(row, today)),
    total: response.count ?? rows.length,
    hiddenCount,
    loading: false,
    error: null,
  }
}

export function usePublicSearch({ q, ou, quand }: SearchQuery): PublicSearch {
  const [state, setState] = useState<PublicSearch>(EMPTY)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setState((current) => ({ ...current, loading: true, error: null }))
      let next: PublicSearch
      try {
        next = await loadPublicSearch({ q, ou, quand, tag: null })
      } catch {
        next = { ...EMPTY, loading: false, error: 'La recherche n’a pas pu être chargée.' }
      }
      if (cancelled) return
      setState(next)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [q, ou, quand])

  return state
}
```

(Si `must(response)` perd le type des lignes, typer : `const rows: EventRow[] = must(response)` avec `type EventRow` importé — c'est la forme de `EVENT_COLUMNS`. Si le lint signale `set-state-in-effect` sur le `setState` synchrone, reprendre l'exception commentée exactement comme dans `useExplorer.ts`.)

- [ ] **Step 6: `PublicEventCard`**

```tsx
/**
 * QUOI     — une carte de la recherche publique : l'affiche, le nom, la plage et la ville.
 * POURQUOI — maquette 2314:2 : sans compte, ni étoile « Repérer », ni amis ; la carte ouvre la
 *            fiche, ouverte à tous par lien direct.
 */
import { Link } from 'react-router-dom'
import { PosterArt } from '@/components/ui/PosterArt'
import { formatDateRange } from '@/lib/dates'
import type { SearchEvent } from '@/lib/event-search'

export function PublicEventCard({ event }: { event: SearchEvent }) {
  return (
    <Link to={`/evenement/${event.id}`} className="public-card">
      <PosterArt
        imageUrl={event.imageUrl}
        tags={event.tags}
        startDate={event.startDate}
        daysAway={0}
        friends={[]}
        badge={null}
      />
      <span className="public-card__name">{event.name}</span>
      <span className="public-card__meta">
        {formatDateRange(event.startDate, event.endDate)} · {event.city} ({event.department})
      </span>
    </Link>
  )
}
```

- [ ] **Step 7: `PublicSearchPage`** — l'ordre de la maquette : bande terre (barre, recherche, titre), bande papier (grille, « Voir les N »), bande nuit (au-delà, appels, pied de page).

```tsx
/**
 * QUOI     — la recherche publique (/festivals) : la recherche, « N festivals dans les 3 prochains
 *            mois. », six affiches puis toutes, ce qui attend au-delà, le pied de page.
 * POURQUOI — lot 11b, maquette 2314:2 : sans compte, on fouille 3 mois (règle du 14/10/2026) ; la
 *            suite se débloque avec un compte gratuit (6 mois) ou le Pro (toute l'année).
 * ATTENTION — tout l'état vit dans l'adresse (?q, ?ou, ?quand, ?tout) ; un compte connecté est
 *            renvoyé sur l'Explorer par la route (App.tsx).
 */
import { ArrowRight } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { LandingBand } from '@/features/landing/LandingBand'
import { LandingFoot } from '@/features/landing/LandingFoot'
import { LandingSearch } from '@/features/landing/LandingSearch'
import { LandingTopBar } from '@/features/landing/LandingTopBar'
import {
  GUEST_MONTHS,
  beyondTitle,
  lastOpenMonth,
  publicTitle,
  windowMonths,
} from '@/lib/explorer'
import { PublicEventCard } from './PublicEventCard'
import { usePublicSearch } from './usePublicSearch'

/** La maquette montre six affiches avant « Voir les N festivals ». */
const PREVIEW = 6

export function PublicSearchPage() {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const ou = params.get('ou') ?? ''
  const quand = params.get('quand')
  const all = params.has('tout')
  const data = usePublicSearch({ q, ou, quand, tag: null })
  const shown = all ? data.events : data.events.slice(0, PREVIEW)
  const posters = data.events.flatMap((event) => (event.imageUrl ? [event.imageUrl] : []))

  const withAll = new URLSearchParams(params)
  withAll.set('tout', '')

  return (
    <div className="landing public-search">
      <LandingTopBar away />
      <LandingBand tone="earth" slant="fall" posters={posters} className="public-search__head">
        <LandingSearch key={`${q}|${ou}|${quand ?? ''}`} q={q} ou={ou} quand={quand} />
        {!data.loading && !data.error && (
          <h1 className="public-search__title">
            {publicTitle(data.total, q || ou, windowMonths(quand, GUEST_MONTHS))}
          </h1>
        )}
        <p className="public-search__lead">
          Ajoutés et tenus à jour par les exposants eux-mêmes, dans toute la France.
        </p>
      </LandingBand>

      <LandingBand tone="paper" slant="rise" className="public-search__results">
        {data.error && <p className="public-search__state">{data.error}</p>}
        {data.loading && <p className="public-search__state">Chargement…</p>}
        {!data.loading && !data.error && (
          <>
            <div className="public-search__grid">
              {shown.map((event) => (
                <PublicEventCard key={event.id} event={event} />
              ))}
            </div>
            {!all && data.total > PREVIEW && (
              <Link className="public-search__more" to={`?${withAll.toString()}`}>
                Voir les {data.total} festivals
                <ArrowRight size={15} strokeWidth={2} aria-hidden />
              </Link>
            )}
          </>
        )}
      </LandingBand>

      <LandingBand tone="night" slant="rise" posters={posters} className="landing-end">
        {data.hiddenCount > 0 && (
          <div className="public-search__beyond">
            <p className="landing-statement">
              <strong>
                {beyondTitle(data.hiddenCount, lastOpenMonth(new Date(), GUEST_MONTHS))}
              </strong>{' '}
              Crée ton compte gratuit pour voir davantage dans le futur, ajouter tes dates et
              suivre tes collègues exposants.
            </p>
            <div className="landing-pro__ctas">
              <Link className="landing-button landing-button--brand" to="/connexion">
                Créer mon compte gratuit
                <ArrowRight size={17} strokeWidth={2} aria-hidden />
              </Link>
              <Link className="landing-pro__more" to="/pro">
                Découvrir le Pro
                <ArrowRight size={17} strokeWidth={2} aria-hidden />
              </Link>
            </div>
          </div>
        )}
        <LandingFoot />
      </LandingBand>
    </div>
  )
}
```

Note : `publicTitle(…, q || ou, …)` — si seul `ou` est rempli, le titre cite le lieu (« 3 résultats pour « Lyon ». »).

- [ ] **Step 8: Le style** — `public-search.css`, au pixel de la maquette `2314:2` : relever les valeurs exactes avec le MCP Figma (`get_design_context` sur `2314:2`, après avoir chargé `figma:figma-design-to-code`) ; les tailles de titre, de grille (3 colonnes, gouttière), de carte et du lien « Voir les… » se mappent sur les jetons existants de `landing.css` / `2-semantic.css`, une couleur absente s'ajoute à `1-primitives.css` puis prend son sens dans `2-semantic.css`. Squelette (classes utilisées par les composants) :

```css
/**
 * QUOI     — la recherche publique (features/public-search/), maquette 2314:2.
 * POURQUOI — la direction artistique de la landing : bandes penchées, serif, affiches.
 */
.public-search__title { font: var(--type-landing-statement); color: var(--landing-cream); }
.public-search__lead { font: var(--type-landing-lead); color: var(--landing-cream-soft); }
.public-search__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-40) var(--space-24);
}
.public-card { display: flex; flex-direction: column; gap: var(--space-4); color: inherit; text-decoration: none; }
.public-card__name { font: var(--type-landing-card-name); }
.public-card__meta { font: var(--type-landing-card-meta); color: var(--landing-ink-soft); }
.public-search__more { display: inline-flex; align-items: center; gap: var(--space-6); }
.public-search__state { font: var(--type-landing-lead); }

@media (width <= 720px) {
  .public-search__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
```

Chaque jeton cité ci-dessus doit exister : `grep -n "<jeton>" apps/web-v2/src/styles/*.css` ; un jeton absent se remplace par celui que la landing utilise pour le même rôle (lire `landing.css`), ou se crée dans `2-semantic.css`. stylelint refuse toute valeur brute.

- [ ] **Step 9: La route** — dans `App.tsx` :

```tsx
/** `/festivals` : la recherche publique pour un visiteur ; un compte connecté retrouve sa
 *  recherche dans l'Explorer (6 mois en gratuit, toute l'année en Pro). */
function PublicSearchRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (user) return <Navigate to={`/explorer${location.search}`} replace />
  return <PublicSearchPage />
}
```

et `<Route path="/festivals" element={<PublicSearchRoute />} />` à côté de `/decouvrir`. Mettre à jour l'en-tête `QUOI` d'`App.tsx` (« recherche publique »).

- [ ] **Step 10: README** — `features/public-search/README.md` :

```md
# features/public-search — la recherche publique

`/festivals`, sans compte (lot 11b, spec `docs/superpowers/specs/2026-10-15-v2-annuaire-public-11b-design.md`,
maquette `2314:2`). Un compte connecté est renvoyé sur l'Explorer.

- `PublicSearchPage.tsx` — la page : recherche, titre, grille, « Voir les N festivals », la bande
  « N festivals de plus t'attendent après {mois} », le pied de page.
- `PublicEventCard.tsx` — une carte : affiche, nom, plage, ville ; elle ouvre la fiche.
- `usePublicSearch.ts` — le chargement, par `lib/event-search.ts`, sur 3 mois.
```

Et dans `features/landing/README.md` : « `LandingSearch.tsx` — la recherche, qui mène à `/festivals`. »

- [ ] **Step 11: Tests, lint, et à l'œil sans compte** — Run: `pnpm --filter web-v2 test` puis `pnpm --filter web-v2 lint` — Expected: PASS. Dans une fenêtre privée sur `http://localhost:5174/v2/` : taper « tatouage » → `/festivals?q=tatouage` ; vide → « N festivals dans les 3 prochains mois. » ; « Voir les N festivals » ; `?q=zzz` → « Aucun résultat pour « zzz ». », pas de grille. Capture comparée à `get_screenshot` de `2314:2` ; reprendre chaque écart.

- [ ] **Step 12: Commit** (version `2.45.0`)

```bash
git add apps/web-v2
git commit -m "feat(v2): la recherche de la landing mène à de vrais résultats, sans compte, sur 3 mois (V2 2.45.0)"
```

---

### Task 6: La fiche visiteur et son aperçu flouté

**Files:**
- Create: `apps/web-v2/src/lib/teaser.ts`, `apps/web-v2/src/lib/teaser.test.ts`
- Create: `apps/web-v2/src/features/event/GuestTeaser.tsx`, `apps/web-v2/src/features/event/useEventTeaser.ts`
- Create: `apps/web-v2/src/features/event/MyReportBlock.tsx` (le bloc « Mon bilan » sorti d'`EventPage`)
- Create: `apps/web-v2/src/styles/3-components/guest-teaser.css` (+ import)
- Modify: `apps/web-v2/src/features/event/EventPage.tsx`, `Applying.tsx:136`, `useEvent.ts:121-131`, `README.md`
- Modify: `apps/web-v2/src/App.tsx` (route `/evenement/:id`)

**Interfaces:**
- Consumes: RPC `compter_avis_et_questions` (Task 3, typée) ; `GuestShell` (Task 4).
- Produces: `teaserLine(reviews: number, questions: number): string | null` ; `useEventTeaser(eventId: string): { reviews: number; questions: number } | null` ; `<GuestTeaser eventId />` ; `<MyReportBlock eventId ledger net revenue pro />`.

- [ ] **Step 1: Test de `teaserLine`**

```ts
/**
 * QUOI     — les tests de lib/teaser.ts : la ligne de l'aperçu flouté d'une fiche vue sans compte.
 * POURQUOI — l'aperçu ne doit jamais annoncer ce qui n'existe pas (« 0 avis »).
 */
import { describe, expect, it } from 'vitest'
import { teaserLine } from './teaser'

describe('teaserLine', () => {
  it('les deux nombres, accordés', () => {
    expect(teaserLine(4, 7)).toBe('4 avis · 7 questions')
    expect(teaserLine(1, 1)).toBe('1 avis · 1 question')
  })
  it('une seule moitié quand l’autre est vide', () => {
    expect(teaserLine(3, 0)).toBe('3 avis')
    expect(teaserLine(0, 2)).toBe('2 questions')
  })
  it('rien du tout : pas d’aperçu', () => {
    expect(teaserLine(0, 0)).toBeNull()
  })
})
```

- [ ] **Step 2: Lancer, il échoue** — Run: `pnpm --filter web-v2 test -- teaser` — Expected: FAIL (module introuvable).

- [ ] **Step 3: `lib/teaser.ts`**

```ts
/**
 * QUOI     — la ligne de l'aperçu flouté d'une fiche vue sans compte : « 4 avis · 7 questions ».
 * POURQUOI — lot 11b : donner envie de créer un compte avec ce qui existe vraiment ; sans avis
 *            ni question, pas d'aperçu.
 */
export function teaserLine(reviews: number, questions: number): string | null {
  const parts = [
    reviews > 0 ? `${reviews} avis` : null,
    questions > 0 ? `${questions} ${questions > 1 ? 'questions' : 'question'}` : null,
  ].filter((part): part is string => part !== null)
  return parts.length > 0 ? parts.join(' · ') : null
}
```

Run: `pnpm --filter web-v2 test -- teaser` — Expected: PASS.

- [ ] **Step 4: `useEventTeaser.ts`**

```ts
/**
 * QUOI     — les nombres de l'aperçu flouté : combien d'avis et de questions a une fiche publique.
 * POURQUOI — lot 11b : la fonction compter_avis_et_questions ne rend que ces deux nombres à un
 *            visiteur, jamais un contenu.
 * ATTENTION — en cas d'échec, pas d'aperçu (null) plutôt qu'un « 0 » : l'aperçu est une invitation,
 *            pas une information ; son absence ne ment pas.
 */
import { useEffect, useState } from 'react'
import { must, supabase } from '@/lib/supabase'

interface TeaserCounts {
  reviews: number
  questions: number
}

async function loadTeaser(eventId: string): Promise<TeaserCounts> {
  const response = await supabase.rpc('compter_avis_et_questions', { p_event: eventId })
  const [row] = must(response)
  return { reviews: row?.avis ?? 0, questions: row?.questions ?? 0 }
}

export function useEventTeaser(eventId: string): TeaserCounts | null {
  const [counts, setCounts] = useState<TeaserCounts | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      let next: TeaserCounts | null
      try {
        next = await loadTeaser(eventId)
      } catch {
        next = null
      }
      if (cancelled) return
      setCounts(next)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [eventId])

  return counts
}
```

- [ ] **Step 5: `GuestTeaser.tsx`**

```tsx
/**
 * QUOI     — sur la fiche vue sans compte, l'aperçu des avis et des questions : « 4 avis · 7
 *            questions », des lignes floutées, « Crée ton compte gratuit pour les lire ».
 * POURQUOI — lot 11b (Uriel, 15/10/2026) : montrer qu'il y a de quoi lire, pour donner envie
 *            de créer un compte.
 * ATTENTION — les lignes sont décoratives : AUCUN contenu réel n'arrive au navigateur. Sans avis
 *            ni question, l'aperçu ne s'affiche pas.
 */
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { teaserLine } from '@/lib/teaser'
import { useEventTeaser } from './useEventTeaser'

export function GuestTeaser({ eventId }: { eventId: string }) {
  const counts = useEventTeaser(eventId)
  const line = counts ? teaserLine(counts.reviews, counts.questions) : null
  if (!line) return null

  return (
    <section className="event-page__block guest-teaser" aria-labelledby="guest-teaser-title">
      <h2 id="guest-teaser-title" className="event-page__block-title">
        {line}
      </h2>
      <div className="guest-teaser__ghost" aria-hidden>
        <span className="guest-teaser__line" />
        <span className="guest-teaser__line" />
        <span className="guest-teaser__line" />
        <span className="guest-teaser__line" />
      </div>
      <Link className="guest-teaser__cta" to="/connexion">
        Crée ton compte gratuit pour les lire
        <ArrowRight size={14} strokeWidth={2} aria-hidden />
      </Link>
    </section>
  )
}
```

`guest-teaser.css` (le flou porte sur un petit bloc, pas sur un grand calque : `interface.md` le permet) :

```css
/**
 * QUOI     — l'aperçu flouté des avis et des questions (features/event/GuestTeaser.tsx).
 * POURQUOI — une carte de la fiche, comme les avis qu'elle annonce, dont les lignes sont floutées.
 */
.guest-teaser__ghost {
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
  padding: var(--space-20);
  border: 1px solid var(--line-card);
  border-radius: var(--radius-card);
  background: var(--surface-card);
  filter: blur(var(--space-4));
}

.guest-teaser__line {
  height: var(--space-12);
  border-radius: var(--radius-pill);
  background: var(--ink-section-pale);
}

.guest-teaser__line:nth-child(1) { width: 92%; }
.guest-teaser__line:nth-child(2) { width: 78%; }
.guest-teaser__line:nth-child(3) { width: 85%; }
.guest-teaser__line:nth-child(4) { width: 54%; }

.guest-teaser__cta {
  display: inline-flex;
  align-items: center;
  gap: var(--space-6);
  font: var(--type-dossier-link);
  color: var(--ink-title);
}
```

(Vérifier chaque jeton par `grep` ; les largeurs en `%` passent-elles stylelint ? sinon, des jetons `--teaser-line-*` dans `2-semantic.css`. `--radius-card` / `--radius-pill` : prendre les noms réels de `1-primitives.css`.)

- [ ] **Step 6: Sortir « Mon bilan »** — `MyReportBlock.tsx` reçoit tel quel le `<section className="event-page__block">…</section>` du bloc « Mon bilan » d'`EventPage.tsx` (l.396-433 actuelles), avec ses imports (`ArrowRight`, `ProBadge`, `ProVeil`, `MyReportCard`, `formatSignedEuros`, `formatEuros`, `useTransitionNavigate`) :

```tsx
/**
 * QUOI     — « Mon bilan » sur la fiche d'une date passée : bénéfice et CA en Pro, sous voile en
 *            gratuit.
 * POURQUOI — sorti d'EventPage (lot 11b) : la fiche approchait les 400 lignes, et ce bloc n'a
 *            de sens que pour un compte.
 */
interface MyReportBlockProps {
  eventId: string
  ledger: LedgerLine[]
  net: number | null
  revenue: number | null
  pro: boolean
}
```

(`LedgerLine` : le type réel de `ledger` dans `useEvent.ts` — le reprendre tel qu'il y est exporté.) Dans `EventPage.tsx` : `{past && member && <MyReportBlock eventId={event.id} ledger={ledger} net={net} revenue={revenue} pro={pro} />}` et retirer les imports devenus inutiles (le lint les signale).

- [ ] **Step 7: La fiche masque ce qui demande un compte** — dans `EventPage.tsx` :

```tsx
  const { user, actor, person, entities } = useAuth()
  // Sans compte (lot 11b) : la fiche se lit, elle ne se pilote pas.
  const member = Boolean(user)
```

puis :
- `<Companions … />` et `<KeptUpToDate … />` → enveloppés dans `{member && (<>…</>)}` ;
- `<EventStatus … />` → `{member && <EventStatus … />}` ;
- `<EventReviews … />` et `<DiscussionBlock … />` → 

```tsx
        {member ? (
          <>
            <EventReviews
              eventId={event.id}
              viewerId={actor?.id}
              canReview={past && status === 'inscrit'}
            />
            <DiscussionBlock eventId={event.id} status={status} />
          </>
        ) : (
          <GuestTeaser eventId={event.id} />
        )}
```

- [ ] **Step 8: Le rappel de clôture, l'accès aux fiches privées**
  - `Applying.tsx:136` : `{deadline && actorId && daysUntil(deadline) >= 0 && (` — sans compte, pas de rappel.
  - `useEvent.ts`, dans `loadEvent`, juste après `if (!event) return …` :

```ts
  // Sans compte (lot 11b), une fiche privée n'existe pas : la base la laisse lire à anon
  // (anon_read_events, docs/v2/purge-back.md), l'app ne la montre pas.
  if (!actorId && event.is_private)
    return { ...EMPTY, loading: false, error: 'Cet événement est introuvable.' }
```

- [ ] **Step 9: La route** — `App.tsx` :

```tsx
      <Route
        path="/evenement/:id"
        element={
          <ProtectedRoute
            guest={
              <GuestShell>
                <EventPage />
              </GuestShell>
            }
          >
            <AppShell>
              <EventPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
```

- [ ] **Step 10: README de `features/event`** — ajouter : « `GuestTeaser.tsx` — sans compte, l'aperçu flouté des avis et des questions, et `useEventTeaser.ts` qui en lit les nombres. » ; « `MyReportBlock.tsx` — « Mon bilan » d'une date passée. »

- [ ] **Step 11: Tests, lint, à l'œil** — Run: `pnpm --filter web-v2 test` puis `pnpm --filter web-v2 lint` — Expected: PASS, `EventPage.tsx` sous 400 lignes. Fenêtre privée : depuis `/festivals`, ouvrir une fiche publique avec avis → barre de la landing, affiche à droite, infos, « Pour candidater » sans rappel, aperçu « N avis · M questions » flouté, aucun statut ni « Qui y va » ; onglet Réseau des DevTools : aucune requête vers `event_threads`, `histoire_evenement`, `participations`, `follows`, `get_event_reviews`. Une fiche privée par son id → « Cet événement est introuvable. ».

- [ ] **Step 12: Commit** (version `2.45.1`)

```bash
git add apps/web-v2
git commit -m "feat(v2): la fiche s'ouvre sans compte, en lecture, avec l'aperçu flouté de ses avis et questions (V2 2.45.1)"
```

---

### Task 7: Vérifier, montrer à Uriel, tenir les carnets

**Files:**
- Modify: `docs/superpowers/plans/2026-10-07-v2-2027-plan-directeur.md` (lot 11 : 11b livré)
- Modify: `docs/v2/purge-back.md` (rappel : `anon_read_events` laisse lire les fiches privées ; la V2 filtre côté app depuis le lot 11b)
- Modify (vault) : `C:\Users\uriel\Desktop\MON CERVEAU (SYNC)\1. LE MÉTIER\2. Fellowship\_État.md` — *Où on en est* (11b livré), et une ligne dans *Tranché* : « Sans compte, la fiche se lit sans avis ni discussions, avec un aperçu flouté de leurs vrais nombres (Uriel, 15/10/2026). »

- [ ] **Step 1: Parcours sans compte** (fenêtre privée, `http://localhost:5174/v2/`) : landing → recherche « tatouage » → résultats → « Voir les N festivals » → fiche → aperçu → « Crée ton compte gratuit » mène à `/connexion` → retour navigateur jusqu'à la landing. Puis `?q=zzz`, puis une fiche privée par son id.
- [ ] **Step 2: Parcours connecté en admin** : `/festivals?q=tatouage` renvoie sur `/explorer?q=tatouage` ; l'Explorer (accueil, recherche, carte « après mars » en gratuit) et une fiche (statut, avis, discussions, « Mon bilan » d'une date passée) sont identiques à avant.
- [ ] **Step 3: Montrer l'aperçu flouté à Uriel** (pas de maquette) : capture de la fiche visiteur ; appliquer ses retours avant de continuer.
- [ ] **Step 4: Build** — Run: `pnpm build:v2` — Expected: succès.
- [ ] **Step 5: Carnets** — les trois fichiers ci-dessus ; commit :

```bash
git add docs/superpowers/plans/2026-10-07-v2-2027-plan-directeur.md docs/v2/purge-back.md
git commit -m "docs(v2): lot 11b livré — l'annuaire public"
git push
```

- [ ] **Step 6: Déploiement** — décision d'Uriel : `pnpm deploy:v2`, puis `curl -s https://flw.sh/v2/ | grep -o 'src="/v2/assets/[^"]*"'` (même hash que `apps/web-v2/dist/index.html`).
