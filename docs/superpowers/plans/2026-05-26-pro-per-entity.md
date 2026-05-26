# Pro par entité — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Déplacer l'abonnement Pro de la personne (`users.plan`) vers la structure (`entities.plan`), et faire lire le plan de l'**acteur actif** par le gating (ProGate, nav, gates Pro).

**Architecture :** colonne `plan` sur `entities` (+ backfill + drop `users.plan`) ; helper pur `planForActor(actor, entityRow)` dans `navModel.ts` ; les 5 consommateurs de `person.plan` lisent `planForActor(currentActor, currentActorRow)`. Séquencé pour garder le build vert (ajout colonne → repoint code → drop colonne).

**Tech Stack :** React 19, TS, Supabase (Postgres, schéma actors local via Docker), Vitest. Stack local : conteneur `supabase_db_fellowship` (psql superuser). MCP Supabase = distant (ne PAS l'utiliser ici — prod n'a pas `entities`).

**Hors périmètre :** mécanisme de paiement/abonnement (Stripe, page Réglages).

---

## File Structure
- **Create** `supabase/migrations/20260526130000_pro_per_entity.sql` — add `entities.plan` + backfill + drop `users.plan` (pour le merge ; en local on applique en 2 temps).
- **Modify** `src/types/supabase.ts` — `entities` gagne `plan` (Task 1) ; `users` perd `plan` (Task 4).
- **Modify** `src/lib/navModel.ts` + **Test** `src/lib/navModel.test.ts` — helper `planForActor`.
- **Modify** `src/components/layout/ProGate.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/BottomBar.tsx`, `src/hooks/use-reviews.ts`, `src/components/reports/EventReportForm.tsx` — lecture du plan de l'acteur actif.

---

## Task 1: Migration (ajout colonne + backfill) + type `entities.plan`

**Files:**
- Create: `supabase/migrations/20260526130000_pro_per_entity.sql`
- Modify: `src/types/supabase.ts` (bloc `entities`)

- [ ] **Step 1: Créer le fichier de migration** (contenu complet, pour le merge) :

```sql
-- Pro par entité : le forfait appartient à la structure, plus à la personne.
ALTER TABLE public.entities ADD COLUMN IF NOT EXISTS plan public.user_plan NOT NULL DEFAULT 'free';

-- Backfill : une entité dont le·la propriétaire (owner) est actuellement Pro devient Pro.
UPDATE public.entities e SET plan = 'pro'
WHERE e.actor_id IN (
  SELECT m.entity_actor_id FROM public.memberships m
  JOIN public.users u ON u.actor_id = m.user_actor_id
  WHERE u.plan = 'pro' AND m.role = 'owner'
);

-- Le plan personne disparaît (le code ne le lit plus à ce stade).
ALTER TABLE public.users DROP COLUMN IF EXISTS plan;
```

- [ ] **Step 2: Appliquer SEULEMENT l'ajout de colonne + backfill au local** (pas le DROP — le code lit encore `users.plan` jusqu'à Task 3) :

Run:
```bash
docker exec -i supabase_db_fellowship psql -U postgres -d postgres -c "ALTER TABLE public.entities ADD COLUMN IF NOT EXISTS plan public.user_plan NOT NULL DEFAULT 'free';"
docker exec -i supabase_db_fellowship psql -U postgres -d postgres -c "UPDATE public.entities e SET plan='pro' WHERE e.actor_id IN (SELECT m.entity_actor_id FROM public.memberships m JOIN public.users u ON u.actor_id=m.user_actor_id WHERE u.plan='pro' AND m.role='owner');"
```
Expected: `ALTER TABLE`, `UPDATE n`.

- [ ] **Step 3: Ajouter `plan` au type `entities` dans `src/types/supabase.ts`** (3 endroits — Row, Insert, Update du bloc `entities:` qui commence ~ligne 55).

Dans `Row` (après `department: string | null`) :
```ts
          plan: Database["public"]["Enums"]["user_plan"]
```
Dans `Insert` (après `department?: string | null`) :
```ts
          plan?: Database["public"]["Enums"]["user_plan"]
```
Dans `Update` (après `department?: string | null`) :
```ts
          plan?: Database["public"]["Enums"]["user_plan"]
```
> NE PAS toucher au bloc `users` à cette étape (il garde `plan` jusqu'à Task 4).

- [ ] **Step 4: Build + lint** → vert (rien dans les consommateurs n'a changé).

Run: `pnpm build && pnpm lint`

- [ ] **Step 5: Commit.**
```bash
git add supabase/migrations/20260526130000_pro_per_entity.sql src/types/supabase.ts
git commit -m "feat(pro): add entities.plan (+ backfill migration), type entities.plan"
```

---

## Task 2: Helper pur `planForActor` (TDD)

**Files:**
- Modify: `src/lib/navModel.ts`
- Test: `src/lib/navModel.test.ts`

- [ ] **Step 1: Écrire le test** (ajouter au `navModel.test.ts` existant) :

```ts
import { planForActor } from './navModel'

describe('planForActor', () => {
  it('entité pro → pro', () => {
    expect(planForActor({ kind: 'entity' }, { plan: 'pro' })).toBe('pro')
  })
  it('entité free → free', () => {
    expect(planForActor({ kind: 'entity' }, { plan: 'free' })).toBe('free')
  })
  it('entité sans plan (null) → free', () => {
    expect(planForActor({ kind: 'entity' }, { plan: null })).toBe('free')
    expect(planForActor({ kind: 'entity' }, {})).toBe('free')
  })
  it('personne → free quelle que soit la valeur', () => {
    expect(planForActor({ kind: 'person' }, { plan: 'pro' } as never)).toBe('free')
  })
  it('acteur null → free', () => {
    expect(planForActor(null, null)).toBe('free')
  })
})
```

- [ ] **Step 2: Lancer le test → échoue** (`planForActor` non exporté).

Run: `pnpm vitest run src/lib/navModel.test.ts -t planForActor`

- [ ] **Step 3: Implémenter dans `src/lib/navModel.ts`** (le type `Plan = 'free' | 'pro'` existe déjà ligne 3) — ajouter à la fin du fichier :

```ts
/** Plan effectif de l'acteur actif : le Pro vit sur l'entité, jamais sur la personne. */
export function planForActor(
  actor: { kind: string } | null,
  entityRow: { plan?: Plan | null } | null,
): Plan {
  if (actor?.kind === 'entity') return entityRow?.plan === 'pro' ? 'pro' : 'free'
  return 'free'
}
```

- [ ] **Step 4: Lancer le test → passe.**

Run: `pnpm vitest run src/lib/navModel.test.ts`

- [ ] **Step 5: Commit.**
```bash
git add src/lib/navModel.ts src/lib/navModel.test.ts
git commit -m "feat(pro): planForActor pure helper (plan lives on active entity)"
```

---

## Task 3: Repointer les 5 consommateurs sur l'acteur actif

**Files:** `ProGate.tsx`, `Sidebar.tsx`, `BottomBar.tsx`, `use-reviews.ts`, `EventReportForm.tsx`

> Chaque fichier appelle déjà `useAuth()`. On récupère `currentActor` + `currentActorRow` et on appelle `planForActor`. Import : `import { planForActor } from '@/lib/navModel'`.

- [ ] **Step 1: `src/components/layout/ProGate.tsx`** — remplacer ligne 8-9 :
```tsx
  const { person } = useAuth()
  if (person?.plan === 'pro') return <>{children}</>
```
par :
```tsx
  const { currentActor, currentActorRow } = useAuth()
  if (planForActor(currentActor, currentActorRow) === 'pro') return <>{children}</>
```
(+ import de `planForActor`.)

- [ ] **Step 2: `src/components/layout/Sidebar.tsx:20-22`** — remplacer :
```tsx
  const { currentActor, person, isAdmin } = useAuth()
  const navigate = useNavigate()
  const plan = person?.plan === 'pro' ? 'pro' : 'free'
```
par :
```tsx
  const { currentActor, currentActorRow, isAdmin } = useAuth()
  const navigate = useNavigate()
  const plan = planForActor(currentActor, currentActorRow)
```
(+ import `planForActor`. Si `person` n'est plus utilisé ailleurs dans le fichier, retirer de la destructuration ; sinon le garder.)

- [ ] **Step 3: `src/components/layout/BottomBar.tsx:17`** — remplacer `const plan = person?.plan === 'pro' ? 'pro' : 'free'` par `const plan = planForActor(currentActor, currentActorRow)`. Adapter la destructuration `useAuth()` pour exposer `currentActor` + `currentActorRow` (au lieu de / en plus de `person`), + import `planForActor`. Vérifier les autres usages de `person`/`currentActor` dans le fichier et garder ce qui sert.

- [ ] **Step 4: `src/hooks/use-reviews.ts:37`** — remplacer :
```ts
  const canSeeDetails = currentActor?.kind === 'entity' && person?.plan === 'pro'
```
par :
```ts
  const canSeeDetails = planForActor(currentActor, currentActorRow) === 'pro'
```
S'assurer que `currentActorRow` est récupéré du `useAuth()` dans ce hook (l'ajouter à la destructuration), retirer `person` s'il n'est plus utilisé, + import `planForActor`.

- [ ] **Step 5: `src/components/reports/EventReportForm.tsx:34`** — remplacer `if (person?.plan !== 'pro') {` par `if (planForActor(currentActor, currentActorRow) !== 'pro') {`. Récupérer `currentActor` + `currentActorRow` du `useAuth()`, retirer `person` s'il devient inutilisé, + import `planForActor`.

- [ ] **Step 6: Vérifier qu'aucune lecture de `.plan` côté personne ne subsiste.**

Run: `pnpm exec grep -rn "person?.plan\|person.plan" src/`
Expected: aucun résultat.

- [ ] **Step 7: Build + lint + tests** → vert. Corriger les imports/vars inutilisés.

Run: `pnpm build && pnpm lint && pnpm vitest run`

- [ ] **Step 8: Commit.**
```bash
git add src/components/layout/ProGate.tsx src/components/layout/Sidebar.tsx src/components/layout/BottomBar.tsx src/hooks/use-reviews.ts src/components/reports/EventReportForm.tsx
git commit -m "feat(pro): gating reads active entity plan via planForActor (5 consumers)"
```

---

## Task 4: Drop `users.plan` (DB local + types) + vérif + bump

**Files:** `src/types/supabase.ts` (bloc `users`), version

- [ ] **Step 1: Dropper la colonne sur le local** (le code ne la lit plus) :

Run: `docker exec -i supabase_db_fellowship psql -U postgres -d postgres -c "ALTER TABLE public.users DROP COLUMN IF EXISTS plan;"`
Expected: `ALTER TABLE`.

- [ ] **Step 2: Retirer `plan` du type `users` dans `src/types/supabase.ts`** (bloc `users:` ~ligne 733) — supprimer les 3 lignes :
  - Row : `          plan: Database["public"]["Enums"]["user_plan"]`
  - Insert : `          plan?: Database["public"]["Enums"]["user_plan"]`
  - Update : `          plan?: Database["public"]["Enums"]["user_plan"]`

- [ ] **Step 3: Build + lint + tests** → vert (si une erreur surgit, c'est un lecteur de `users.plan` oublié → le repointer sur `planForActor`).

Run: `pnpm build && pnpm lint && pnpm vitest run`

- [ ] **Step 4: Vérification visuelle (local, Docker up).**

Run: `pnpm dev`. En tant qu'**entité Pro** → calendrier/dashboard accessibles. Passer l'entité en `free` (`docker exec ... psql -c "UPDATE entities SET plan='free' WHERE ..."`) → teaser. En tant que **personne** → pas d'items Pro en nav. Re-Pro l'entité après test.

- [ ] **Step 5: Bump version + commit + push.**

`package.json` patch +1 (0.7.37 → 0.7.38).
```bash
git add -A
git commit -m "feat(pro): drop users.plan (Pro now lives only on entities) + bump"
git push
```

---

## Self-Review

**Couverture spec :**
- `entities.plan` + backfill + drop `users.plan` → Tasks 1 & 4. ✓
- `planForActor` pur + test → Task 2. ✓
- 5 consommateurs repointés (ProGate, Sidebar, BottomBar, use-reviews, EventReportForm) → Task 3. ✓
- Types : `entities` +plan (T1), `users` -plan (T4). ✓
- Hors périmètre paiement → respecté. ✓

**Séquençage / build vert :** T1 ajoute (rien ne casse), T3 repointe (plus de lecture `users.plan`), T4 droppe (aucun lecteur). Le grep T3 Step 6 garantit l'absence de lecteur avant le drop.

**Placeholders :** aucun — SQL et edits de types donnés exactement ; les edits TSX donnent l'avant/après. Les « retirer `person` si inutilisé » sont des nettoyages lint déterministes.

**Cohérence types/noms :** `planForActor(actor, entityRow)` (T2) appelé partout avec `(currentActor, currentActorRow)` (T3). `Plan` réutilisé (navModel l.3). `currentActor`/`currentActorRow` déjà exposés par `useAuth` (auth.tsx).

**Risques :** prod non touché (schéma actors absent) — la migration part au merge. Local : Docker doit tourner. Si `currentActorRow` (union `UserRow|EntityRow`) ne type-check pas sur `.plan` → `planForActor` prend `{ plan?: Plan | null }` (structurel, `UserRow` sans `plan` reste assignable). 
