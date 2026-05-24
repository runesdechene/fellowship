# Refonte des comptes — Fondation (Phase 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer le modèle de compte « 1 user = 1 profil de type figé » en « 1 personne → N entités », **sans casser l'authentification** des utilisateurs alpha existants.

**Architecture :** On **conserve la table `profiles` comme table d'acteurs polymorphe** (le moins destructif possible vu que TOUTES les FK et tout le RLS pointent déjà sur `profiles(id) = auth.uid()`). On ajoute une dimension `kind` (`person` | `entity`) et un lien `owner_user_id`. La **personne** garde `id = auth.uid()` ; les **entités** sont de nouvelles lignes possédées par la personne. Migration **expand-contract** (additive, vérifiable, réversible — on ne supprime rien avant validation).

**Tech Stack :** Supabase (Postgres + RLS + trigger), `@supabase/supabase-js` v2, React 19 + Context, Vite, Vitest. Auth = magic-link OTP.

---

## ⚠️ DÉCISION À CONFIRMER PAR URIEL AVANT TOUTE EXÉCUTION

Ce plan **ne doit pas être exécuté tel quel sans validation** du modèle de données ci-dessous — c'est le keystone, et il est quasi irréversible une fois les users migrés. Le reste du plan en découle.

### La contrainte dure (constatée dans le code)
`profiles.id = auth.users.id = auth.uid()`. Et **tout** s'appuie dessus :
- FK : `events.created_by`, `participations.user_id`, `notes.user_id`, `event_reports.user_id`, `reviews.user_id`, `follows.follower_id` + `follows.following_id`, `notifications.user_id`, `push_subscriptions.user_id` → tous `REFERENCES profiles(id)`.
- RLS : chaque policy fait `auth.uid() = id` ou `user_id = auth.uid()`.
- Trigger `handle_new_user()` crée 1 ligne `profiles` par signup.

Conséquence : **toute approche qui déplace l'identité hors de `profiles.id` casse l'auth et 9 tables.** D'où le choix ci-dessous.

### Modèle recommandé : `profiles` = table d'acteurs polymorphe

| | Aujourd'hui | Cible |
|---|---|---|
| Une ligne `profiles` | un user (type figé) | un **acteur** : soit une **personne**, soit une **entité** |
| `id` | = auth.uid() | personne : = auth.uid() · entité : `gen_random_uuid()` |
| Nouvelle colonne `kind` | — | `'person'` \| `'entity'` |
| Nouvelle colonne `owner_user_id` | — | entité → l'id de la personne propriétaire ; personne → NULL |
| `entity_type` | (réutilise `type`) | entité → `'exposant'` (V1) \| `'festival'` (V2) |

- **Personne** (festivalier de base) : `kind='person'`, `id=auth.uid()`, porte `display_name` (prénom), `avatar_url` (photo perso), `city`, `postal_code`, `department`, `sex`, `plan`.
- **Entité** (casquette pro) : `kind='entity'`, `owner_user_id=<personne>`, porte `brand_name`, `craft_type` (texte libre), `bio`, `website`, `banner_url`, `public_slug`, `avatar_url` (logo).
- **Helper SQL `owns_actor(actor_id)`** = `actor_id = auth.uid() OR (SELECT owner_user_id FROM profiles WHERE id = actor_id) = auth.uid()`. Remplace `= auth.uid()` dans les policies d'écriture, **de façon additive**.

**Pourquoi ce modèle (et pas une nouvelle table `entities` séparée) :** une table séparée obligerait à re-router *toutes* les FK et *tout* le RLS de 9 tables en une fois → migration big-bang à haut risque sur l'auth. Garder `profiles` comme acteurs rend les FK **inchangées** (elles pointent un acteur, personne ou entité) et le RLS **patchable de façon additive**. C'est la voie la plus sûre pour une bascule sans coupure.

### Alternatives écartées
- **Table `entities` distincte + `users` distincte** : propre conceptuellement, mais big-bang sur 9 tables de FK + réécriture totale du RLS → risque auth maximal. ❌ pour une bascule sûre.
- **Garder 1 profil = 1 type, ajouter juste un toggle** : ne permet pas le multi-entités ni la séparation personne/marque voulue (0001 §7). ❌ ne répond pas au besoin.

### Questions ouvertes qui impactent le modèle (à trancher avec Uriel)
1. **`plan` (free/pro) sur la personne ou sur l'entité ?** Reco : **sur la personne** (un humain paie une fois, ses entités exposant héritent du Pro). Impact : 1 sub couvre N entités du même humain. À confirmer.
2. **Attribution des participations/follows existants** lors du split d'un exposant alpha : tout l'historique exposant part **sur l'entité** (cf. Task 3). Les festivaliers (type `public`) n'ont pas d'entité → rien à déplacer. OK ?
3. **`follows` personne↔entité** : en V1 on suit des **entités** (vitrines). Une personne (festivalier) est-elle « suivable » ? Reco V1 : non (festivaliers privés) → `following_id` = toujours une entité. À confirmer (n'impacte pas Phase 1, juste le wiring social ultérieur).

---

## Périmètre de CE plan (Scope Check)

La refonte complète couvre 4 sous-systèmes. **Ce plan ne traite que le 1er** (la fondation irréversible). Chacun des suivants sera un plan dédié, écrit une fois celui-ci validé et exécuté :

- ✅ **CE PLAN — Phase 1 : Fondation données + contexte auth.** Produit un logiciel qui marche : login OK, `profiles` devient polymorphe, chaque humain a une personne + (si exposant) une entité, `useAuth()` expose `currentEntity` + `switchEntity()`. Aucune régression fonctionnelle visible.
- ⏭️ **Plan 2 — Onboarding branché** (réécriture `Onboarding.tsx` : parcours festivalier vs exposant créant l'entité — maquette `docs/decisions/assets/onboarding.html`).
- ⏭️ **Plan 3 — Câblage par surface** (Explorer, Calendar, EventPage, PublicProfile/vitrine, Settings, Embed, sélecteur d'entité dans `AppLayout`, gating gratuit/Pro) → consommer `currentEntity` partout.
- ⏭️ **Plan 4 — Contract** (supprimer l'ancienne colonne `type`/champs legacy une fois tout vérifié en prod ; nettoyage RLS).

> **Pourquoi ce découpage :** la fondation doit être posée, vérifiée et stable AVANT de recâbler les écrans. Recâbler sur un modèle non figé = retravail garanti. Phase 1 est aussi la seule partie « auth/DB irréversible » → c'est celle qui mérite ta relecture la plus attentive.

---

## File Structure (Phase 1)

**Migrations (créer) :**
- `supabase/migrations/20260525120000_actors_expand.sql` — ajoute enum `actor_kind`, colonnes `kind`/`owner_user_id`/`entity_type`, backfill des personnes, helper `owns_actor()`.
- `supabase/migrations/20260525120001_actors_split_exposants.sql` — crée une entité pour chaque exposant alpha existant + re-route ses données + vérifications.
- `supabase/migrations/20260525120002_actors_rls_additive.sql` — policies additives basées sur `owns_actor()` (sans supprimer les anciennes).
- `supabase/migrations/20260525120003_handle_new_user_person.sql` — le trigger crée désormais une **personne** (`kind='person'`).

**Code (créer) :**
- `src/lib/actorContext.ts` — helpers **purs** (split personne/entités, choix de l'entité courante, persistance, needsOnboarding).
- `src/lib/actorContext.test.ts` — tests Vitest (fonctions pures, pas de RTL — cf. contrainte infra de test du projet).

**Code (modifier) :**
- `src/lib/auth.tsx` — `AuthContext` : expose `person`, `entities`, `currentEntity`, `switchEntity()`, garde `profile` en alias rétro-compatible.
- `src/types/database.ts` — types `Actor` / `Person` / `Entity` dérivés.
- `src/types/supabase.ts` — **régénéré** (`supabase gen types`) après migrations.
- `src/pages/AuthCallback.tsx` + `src/App.tsx` (`OnboardingGuard`) — `needsOnboarding` basé sur la personne.

**Note infra de test (mémoire projet) :** `render()` de React Testing Library ne flushe pas le sync sur cette stack → **on teste des fonctions pures** (`actorContext.ts`), pas des composants. Les migrations SQL se vérifient par **requêtes d'assertion** sur une base Supabase locale (`supabase db reset`), pas par Vitest.

---

## Pré-requis (avant Task 1)

- [ ] **Sauvegarde** de la base de prod (`supabase db dump` ou snapshot dashboard). La migration touche l'auth → **filet obligatoire**.
- [ ] Exécution d'abord sur **branche + base locale** (`supabase start` puis `supabase db reset`), jamais direct en prod.
- [ ] Confirmer le **nombre d'utilisateurs alpha** et combien sont `type='exposant'` :
  ```sql
  SELECT type, count(*) FROM profiles GROUP BY type;
  ```
  Noter les chiffres — ils servent de contrôle dans Task 3.

---

## Task 1 : Module pur `actorContext.ts` + tests

**Files :**
- Create: `src/lib/actorContext.ts`
- Test: `src/lib/actorContext.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// src/lib/actorContext.test.ts
import { describe, it, expect } from 'vitest'
import {
  resolvePersonAndEntities,
  pickCurrentEntity,
  deriveNeedsOnboarding,
  ENTITY_STORAGE_KEY,
  type ActorRow,
} from './actorContext'

const AUTH = 'auth-uid-1'
const person: ActorRow = { id: AUTH, kind: 'person', owner_user_id: null, display_name: 'Uriel', entity_type: null } as ActorRow
const entityA: ActorRow = { id: 'e-a', kind: 'entity', owner_user_id: AUTH, brand_name: 'Rune de Chêne', entity_type: 'exposant' } as ActorRow
const entityB: ActorRow = { id: 'e-b', kind: 'entity', owner_user_id: AUTH, brand_name: 'Autre Marque', entity_type: 'exposant' } as ActorRow

describe('resolvePersonAndEntities', () => {
  it('sépare la personne (id=authUid) de ses entités', () => {
    const { person: p, entities } = resolvePersonAndEntities([person, entityA, entityB], AUTH)
    expect(p?.id).toBe(AUTH)
    expect(entities.map(e => e.id)).toEqual(['e-a', 'e-b'])
  })
  it('renvoie person=null si aucune ligne personne', () => {
    const { person: p, entities } = resolvePersonAndEntities([entityA], AUTH)
    expect(p).toBeNull()
    expect(entities).toHaveLength(1)
  })
})

describe('pickCurrentEntity', () => {
  it('choisit l\'entité stockée si elle existe', () => {
    expect(pickCurrentEntity([entityA, entityB], 'e-b')?.id).toBe('e-b')
  })
  it('retombe sur null (mode personne/festivalier) si rien de stocké', () => {
    expect(pickCurrentEntity([entityA], null)).toBeNull()
  })
  it('ignore un id stocké qui n\'existe plus', () => {
    expect(pickCurrentEntity([entityA], 'disparue')).toBeNull()
  })
})

describe('deriveNeedsOnboarding', () => {
  it('vrai si la personne n\'a pas de display_name', () => {
    expect(deriveNeedsOnboarding({ ...person, display_name: null } as ActorRow)).toBe(true)
  })
  it('faux si display_name présent', () => {
    expect(deriveNeedsOnboarding(person)).toBe(false)
  })
  it('vrai si personne absente', () => {
    expect(deriveNeedsOnboarding(null)).toBe(true)
  })
})

it('expose une clé de stockage stable', () => {
  expect(ENTITY_STORAGE_KEY).toBe('flwsh.currentEntityId')
})
```

- [ ] **Step 2 : Lancer les tests, vérifier l'échec**

Run: `pnpm test src/lib/actorContext.test.ts`
Expected: FAIL — « Cannot find module './actorContext' ».

- [ ] **Step 3 : Implémenter le module**

```typescript
// src/lib/actorContext.ts
export type ActorKind = 'person' | 'entity'

// Forme minimale dont dépend la logique de contexte (sur-ensemble = la Row profiles).
export interface ActorRow {
  id: string
  kind: ActorKind
  owner_user_id: string | null
  entity_type: 'exposant' | 'festival' | null
  display_name: string | null
  brand_name?: string | null
  [key: string]: unknown
}

export const ENTITY_STORAGE_KEY = 'flwsh.currentEntityId'

/** Sépare la personne (id === authUid) de ses entités (owner_user_id === authUid). */
export function resolvePersonAndEntities(rows: ActorRow[], authUid: string) {
  const person = rows.find(r => r.id === authUid && r.kind === 'person') ?? null
  const entities = rows.filter(r => r.kind === 'entity' && r.owner_user_id === authUid)
  return { person, entities }
}

/** Choisit l'entité active : celle stockée si encore présente, sinon null (= mode personne/festivalier). */
export function pickCurrentEntity(entities: ActorRow[], storedId: string | null): ActorRow | null {
  if (!storedId) return null
  return entities.find(e => e.id === storedId) ?? null
}

/** Onboarding requis tant que la personne n'a pas de prénom (display_name). */
export function deriveNeedsOnboarding(person: ActorRow | null): boolean {
  return !person || !person.display_name
}

export function readStoredEntityId(): string | null {
  try { return localStorage.getItem(ENTITY_STORAGE_KEY) } catch { return null }
}
export function writeStoredEntityId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ENTITY_STORAGE_KEY, id)
    else localStorage.removeItem(ENTITY_STORAGE_KEY)
  } catch { /* localStorage indisponible : on ignore */ }
}
```

- [ ] **Step 4 : Lancer les tests, vérifier le succès**

Run: `pnpm test src/lib/actorContext.test.ts`
Expected: PASS (toutes).

- [ ] **Step 5 : Commit**

```bash
git add src/lib/actorContext.ts src/lib/actorContext.test.ts
git commit -m "feat(accounts): pure actor-context helpers (person/entities) + tests"
```

---

## Task 2 : Migration EXPAND — colonnes acteurs + backfill personnes + `owns_actor()`

**Files :**
- Create: `supabase/migrations/20260525120000_actors_expand.sql`

- [ ] **Step 1 : Écrire la migration (additive, non destructive)**

```sql
-- 20260525120000_actors_expand.sql
-- EXPAND : on ajoute la dimension "acteur" sans rien supprimer.

-- 1. Type "kind"
DO $$ BEGIN
  CREATE TYPE actor_kind AS ENUM ('person', 'entity');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Type "entity_type" (exposant V1, festival V2)
DO $$ BEGIN
  CREATE TYPE entity_type AS ENUM ('exposant', 'festival');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Colonnes sur profiles (toutes nullable / avec défaut → additif)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kind actor_kind NOT NULL DEFAULT 'person';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS entity_type entity_type;

CREATE INDEX IF NOT EXISTS idx_profiles_owner ON profiles(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_kind ON profiles(kind);

-- 4. Backfill : toute ligne existante est une PERSONNE pour l'instant
--    (les exposants seront splittés en personne + entité dans la migration suivante).
UPDATE profiles SET kind = 'person' WHERE kind IS NULL;

-- 5. Helper d'autorisation : l'utilisateur courant agit-il en tant que cet acteur ?
CREATE OR REPLACE FUNCTION owns_actor(actor_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT actor_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles WHERE id = actor_id AND owner_user_id = auth.uid());
$$;
```

- [ ] **Step 2 : Appliquer sur base locale**

Run: `supabase db reset` (recharge toutes les migrations sur la base locale).
Expected: aucune erreur ; la migration passe.

- [ ] **Step 3 : Vérifier le schéma**

Run (psql local) :
```sql
\d profiles    -- doit montrer kind, owner_user_id, entity_type
SELECT proname FROM pg_proc WHERE proname = 'owns_actor';  -- 1 ligne
SELECT kind, count(*) FROM profiles GROUP BY kind;  -- tout en 'person'
```
Expected: colonnes présentes, fonction présente, 100 % `person`.

- [ ] **Step 4 : Commit**

```bash
git add supabase/migrations/20260525120000_actors_expand.sql
git commit -m "feat(accounts): expand profiles into polymorphic actors + owns_actor()"
```

---

## Task 3 : Migration SPLIT — créer une entité par exposant alpha + re-router ses données

> ⚠️ **Migration de données la plus sensible.** Sur l'alpha (poignée d'exposants) le volume est faible et vérifiable. On ne supprime jamais la ligne d'origine ; on la **convertit en personne** et on **crée une entité** qui reprend les champs marque + l'historique pro.

**Files :**
- Create: `supabase/migrations/20260525120001_actors_split_exposants.sql`

- [ ] **Step 1 : Écrire la migration**

```sql
-- 20260525120001_actors_split_exposants.sql
-- Pour chaque profil de type 'exposant' : on garde la ligne comme PERSONNE
-- (id = auth.uid()) et on crée une ENTITÉ qui porte la marque + reprend l'historique pro.

-- 1. Créer une entité par exposant existant, en copiant les champs "marque".
WITH created AS (
  INSERT INTO profiles (
    id, kind, owner_user_id, entity_type, type, email,
    brand_name, craft_type, bio, website, banner_url, public_slug, avatar_url,
    city, department, postal_code, plan, created_at
  )
  SELECT
    gen_random_uuid(), 'entity', p.id, 'exposant', 'exposant', p.email,
    p.brand_name, p.craft_type, p.bio, p.website, p.banner_url, p.public_slug, p.avatar_url,
    p.city, p.department, p.postal_code, p.plan, p.created_at
  FROM profiles p
  WHERE p.type = 'exposant' AND p.kind = 'person' AND p.owner_user_id IS NULL
  RETURNING id AS entity_id, owner_user_id AS person_id
)
-- 2. Mémoriser le mapping personne→entité le temps de la migration.
SELECT * INTO TEMP TABLE _split_map FROM created;

-- 3. Re-router l'historique PRO de la personne vers l'entité.
UPDATE events e        SET created_by = m.entity_id FROM _split_map m WHERE e.created_by = m.person_id;
UPDATE participations x SET user_id   = m.entity_id FROM _split_map m WHERE x.user_id   = m.person_id;
UPDATE reviews r       SET user_id    = m.entity_id FROM _split_map m WHERE r.user_id    = m.person_id;
UPDATE event_reports er SET user_id   = m.entity_id FROM _split_map m WHERE er.user_id   = m.person_id;
UPDATE notes n         SET user_id    = m.entity_id FROM _split_map m WHERE n.user_id     = m.person_id;
-- follows : l'exposant suivait/était suivi en tant que marque → on déplace vers l'entité.
UPDATE follows f       SET following_id = m.entity_id FROM _split_map m WHERE f.following_id = m.person_id;
UPDATE follows f       SET follower_id  = m.entity_id FROM _split_map m WHERE f.follower_id  = m.person_id;

-- 4. Nettoyer les champs "marque" sur la PERSONNE (ils vivent désormais sur l'entité).
--    public_slug est UNIQUE → on doit le libérer côté personne (l'entité le détient).
UPDATE profiles p SET
  brand_name = NULL, craft_type = NULL, bio = NULL, website = NULL,
  banner_url = NULL, public_slug = NULL, entity_type = NULL,
  type = 'public'  -- la personne redevient un acteur "public" (festivalier de base)
FROM _split_map m WHERE p.id = m.person_id;

DROP TABLE _split_map;
```

- [ ] **Step 2 : Appliquer + vérifier les invariants**

Run: `supabase db reset` puis (psql) :
```sql
-- autant d'entités créées que d'exposants d'origine
SELECT count(*) FROM profiles WHERE kind='entity' AND entity_type='exposant';
-- aucune personne ne garde un slug (les slugs sont sur les entités)
SELECT count(*) FROM profiles WHERE kind='person' AND public_slug IS NOT NULL;  -- attendu : 0
-- aucune participation/review orpheline
SELECT count(*) FROM participations x LEFT JOIN profiles p ON p.id=x.user_id WHERE p.id IS NULL;  -- 0
SELECT count(*) FROM follows f WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id=f.follower_id)
   OR NOT EXISTS (SELECT 1 FROM profiles WHERE id=f.following_id);  -- 0
```
Expected: nb entités = nb exposants relevé en pré-requis ; 0 / 0 / 0.

- [ ] **Step 3 : Test de connexion (manuel, base locale)**

Se connecter avec un compte exposant de test → vérifier que l'auth passe (la personne existe, `id=auth.uid()`), et que l'entité est bien rattachée (`owner_user_id`).

- [ ] **Step 4 : Commit**

```bash
git add supabase/migrations/20260525120001_actors_split_exposants.sql
git commit -m "feat(accounts): split existing exposants into person + entity (data re-routed)"
```

---

## Task 4 : RLS additif basé sur `owns_actor()`

> On **ajoute** des policies qui autorisent l'écriture quand on « possède » l'acteur, **sans supprimer** les anciennes (`= auth.uid()`). Les anciennes restent vraies pour les personnes (id=auth.uid()) ; les nouvelles couvrent les entités. Nettoyage = Plan 4 (contract).

**Files :**
- Create: `supabase/migrations/20260525120002_actors_rls_additive.sql`

- [ ] **Step 1 : Écrire les policies additives**

```sql
-- 20260525120002_actors_rls_additive.sql
-- Écritures "au nom d'un acteur possédé" (personne OU entité de l'utilisateur).

-- PARTICIPATIONS
CREATE POLICY "participations_insert_owned" ON participations
  FOR INSERT TO authenticated WITH CHECK (owns_actor(user_id));
CREATE POLICY "participations_update_owned" ON participations
  FOR UPDATE TO authenticated USING (owns_actor(user_id)) WITH CHECK (owns_actor(user_id));
CREATE POLICY "participations_delete_owned" ON participations
  FOR DELETE TO authenticated USING (owns_actor(user_id));

-- NOTES
CREATE POLICY "notes_insert_owned" ON notes
  FOR INSERT TO authenticated WITH CHECK (owns_actor(user_id));
CREATE POLICY "notes_update_owned" ON notes
  FOR UPDATE TO authenticated USING (owns_actor(user_id)) WITH CHECK (owns_actor(user_id));
CREATE POLICY "notes_delete_owned" ON notes
  FOR DELETE TO authenticated USING (owns_actor(user_id));

-- EVENT REPORTS
CREATE POLICY "event_reports_owned" ON event_reports
  FOR ALL TO authenticated USING (owns_actor(user_id)) WITH CHECK (owns_actor(user_id));

-- REVIEWS (l'entité exposant écrit ; on conserve la contrainte "est un exposant")
CREATE POLICY "reviews_insert_owned_exposant" ON reviews
  FOR INSERT TO authenticated WITH CHECK (
    owns_actor(user_id)
    AND EXISTS (SELECT 1 FROM profiles WHERE id = reviews.user_id AND entity_type = 'exposant')
  );
CREATE POLICY "reviews_update_owned" ON reviews
  FOR UPDATE TO authenticated USING (owns_actor(user_id)) WITH CHECK (owns_actor(user_id));

-- FOLLOWS (on suit "en tant que" un acteur possédé)
CREATE POLICY "follows_insert_owned" ON follows
  FOR INSERT TO authenticated WITH CHECK (owns_actor(follower_id));
CREATE POLICY "follows_delete_owned" ON follows
  FOR DELETE TO authenticated USING (owns_actor(follower_id));

-- EVENTS (création par une entité exposant possédée)
CREATE POLICY "events_insert_owned_exposant" ON events
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = events.created_by
            AND entity_type = 'exposant' AND owns_actor(events.created_by))
  );
CREATE POLICY "events_update_owned" ON events
  FOR UPDATE TO authenticated USING (owns_actor(created_by)) WITH CHECK (owns_actor(created_by));

-- PROFILES : mise à jour d'un acteur possédé (la personne OU ses entités)
CREATE POLICY "profiles_update_owned" ON profiles
  FOR UPDATE TO authenticated USING (owns_actor(id)) WITH CHECK (owns_actor(id));
-- INSERT d'une entité par son propriétaire (pour "créer une entité")
CREATE POLICY "profiles_insert_owned_entity" ON profiles
  FOR INSERT TO authenticated WITH CHECK (kind = 'entity' AND owner_user_id = auth.uid());
```

- [ ] **Step 2 : Appliquer + tester les policies (psql, en simulant un utilisateur)**

Run: `supabase db reset` puis, pour un exposant de test (avec `SET request.jwt.claim.sub = '<auth-uid>'` via le helper de test Supabase ou via l'app) : insérer une participation `user_id = <entity_id>` → doit réussir ; `user_id = <entité d'un autre>` → doit échouer.

- [ ] **Step 3 : Commit**

```bash
git add supabase/migrations/20260525120002_actors_rls_additive.sql
git commit -m "feat(accounts): additive RLS via owns_actor() for owned entities"
```

---

## Task 5 : Trigger `handle_new_user` crée une PERSONNE

**Files :**
- Create: `supabase/migrations/20260525120003_handle_new_user_person.sql`

- [ ] **Step 1 : Écrire la migration**

```sql
-- 20260525120003_handle_new_user_person.sql
-- Au signup, on crée une PERSONNE (kind='person'). L'entité exposant est créée
-- explicitement par l'onboarding (Plan 2), plus via raw_user_meta_data.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, kind, type)
  VALUES (NEW.id, NEW.email, 'person', 'public');
  RETURN NEW;
END;
$$;
```

- [ ] **Step 2 : Appliquer + tester**

Run: `supabase db reset`. Créer un nouvel utilisateur de test (via l'app sur la base locale) → une ligne `profiles` avec `kind='person'`, `type='public'`.
Expected: OK.

- [ ] **Step 3 : Commit**

```bash
git add supabase/migrations/20260525120003_handle_new_user_person.sql
git commit -m "feat(accounts): new signups create a person actor"
```

---

## Task 6 : Régénérer les types Supabase

**Files :**
- Modify: `src/types/supabase.ts`
- Modify: `src/types/database.ts`

- [ ] **Step 1 : Régénérer les types depuis le schéma local**

Run (cf. mémoire projet — binaire supabase direct sous Windows) :
```bash
supabase gen types typescript --local > src/types/supabase.ts
```
Expected: `profiles.Row` contient `kind`, `owner_user_id`, `entity_type` ; enums `actor_kind`, `entity_type` présents.

- [ ] **Step 2 : Ajouter les types dérivés**

Dans `src/types/database.ts`, après `export type Profile = ...` :
```typescript
export type ActorKind = Database['public']['Enums']['actor_kind']
export type EntityType = Database['public']['Enums']['entity_type']
/** Un acteur = une ligne profiles (personne ou entité). */
export type Actor = Profile
```

- [ ] **Step 3 : Vérifier la compilation**

Run: `pnpm build`
Expected: `tsc -b` passe (0 erreur).

- [ ] **Step 4 : Commit**

```bash
git add src/types/supabase.ts src/types/database.ts
git commit -m "chore(accounts): regen supabase types + actor type aliases"
```

---

## Task 7 : Refonte `AuthContext` → personne + entités + entité courante

> On **ne supprime pas** `profile` : on le garde en **alias rétro-compatible** (= `currentEntity ?? person`) pour que les pages existantes continuent de tourner jusqu'au Plan 3. Zéro régression.

**Files :**
- Modify: `src/lib/auth.tsx`

- [ ] **Step 1 : Étendre le type du contexte**

Remplacer l'interface `AuthContextType` (auth.tsx:6-17) par :
```typescript
interface AuthContextType {
  user: User | null
  session: Session | null
  /** La personne (festivalier de base, id = auth.uid()). */
  person: Actor | null
  /** Les entités (casquettes pro) possédées par la personne. */
  entities: Actor[]
  /** L'entité active dans le sélecteur, ou null = mode personne/festivalier. */
  currentEntity: Actor | null
  /** Alias rétro-compat : l'acteur "courant" (entité active sinon personne). */
  profile: Actor | null
  switchEntity: (entityId: string | null) => void
  loading: boolean
  signIn: (email: string) => Promise<{ error: Error | null }>
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  needsOnboarding: boolean
  isAdmin: boolean
}
```

- [ ] **Step 2 : Réécrire le provider**

Remplacer le corps de `AuthProvider` (auth.tsx:21-95) par :
```typescript
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [person, setPerson] = useState<Actor | null>(null)
  const [entities, setEntities] = useState<Actor[]>([])
  const [currentEntityId, setCurrentEntityId] = useState<string | null>(readStoredEntityId())
  const [loading, setLoading] = useState(true)

  const fetchActors = async (authUid: string) => {
    // La personne (id=authUid) + ses entités (owner_user_id=authUid), en une requête.
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`id.eq.${authUid},owner_user_id.eq.${authUid}`)
    const rows = (data ?? []) as unknown as ActorRow[]
    const { person: p, entities: ents } = resolvePersonAndEntities(rows, authUid)
    setPerson((p as Actor) ?? null)
    setEntities(ents as Actor[])
  }

  const refreshProfile = async () => { if (user) await fetchActors(user.id) }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchActors(session.user.id).catch(() => {})
      else { setPerson(null); setEntities([]) }
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const switchEntity = (entityId: string | null) => {
    setCurrentEntityId(entityId)
    writeStoredEntityId(entityId)
  }

  const signIn = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email, options: { shouldCreateUser: true },
    })
    return { error: error as Error | null }
  }
  const verifyOtp = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    return { error: error as Error | null }
  }
  const signOut = async () => {
    await supabase.auth.signOut({ scope: 'local' })
    setPerson(null); setEntities([]); switchEntity(null)
  }

  const currentEntity = pickCurrentEntity(entities as ActorRow[], currentEntityId) as Actor | null
  const profile = currentEntity ?? person  // alias rétro-compat
  const needsOnboarding = !!user && deriveNeedsOnboarding(person as ActorRow | null)
  const isAdmin = (person as { role?: string } | null)?.role === 'admin'

  return (
    <AuthContext.Provider value={{
      user, session, person, entities, currentEntity, profile,
      switchEntity, loading, signIn, verifyOtp, signOut, refreshProfile,
      needsOnboarding, isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
```
Et compléter les imports en tête de fichier :
```typescript
import { supabase } from './supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { Actor } from '@/types/database'
import {
  resolvePersonAndEntities, pickCurrentEntity, deriveNeedsOnboarding,
  readStoredEntityId, writeStoredEntityId, type ActorRow,
} from './actorContext'
```

> **Note :** `signIn` perd le paramètre `accountType` (le type ne se choisit plus au login mais à l'onboarding — Plan 2). `Login.tsx` l'appelle peut-être avec un 2e argument : à ajuster en Task 8.

- [ ] **Step 3 : Vérifier la compilation**

Run: `pnpm build`
Expected: erreurs UNIQUEMENT là où `signIn(email, type)` est appelé avec 2 args (corrigé en Task 8) et là où `profile.type==='exposant'` est lu (toléré : alias en place). Noter ces erreurs pour Task 8.

- [ ] **Step 4 : Commit**

```bash
git add src/lib/auth.tsx
git commit -m "feat(accounts): AuthContext exposes person/entities/currentEntity/switchEntity"
```

---

## Task 8 : Adapter les gardes auth (callback, onboarding gate, login)

**Files :**
- Modify: `src/pages/AuthCallback.tsx:13-21`
- Modify: `src/pages/Login.tsx` (appel `signIn`)
- Modify: `src/App.tsx` (`OnboardingGuard` — déjà basé sur `needsOnboarding`, vérifier)

- [ ] **Step 1 : AuthCallback — router sur la personne**

Remplacer le bloc de redirection (AuthCallback.tsx:13-21) par :
```typescript
    if (user) {
      if (needsOnboarding) {
        navigate('/onboarding', { replace: true })
      } else {
        navigate('/explorer', { replace: true })  // home unique ; le type se gère via currentEntity
      }
    } else {
      navigate('/login', { replace: true })
    }
```
et adapter le hook : `const { user, needsOnboarding, loading } = useAuth()` (retirer `profile`).

> Le routage exposant-vs-festivalier (`/dashboard` vs `/explorer`) sera affiné au Plan 3 selon `currentEntity`. Pour Phase 1, tout le monde atterrit sur `/explorer` (déjà la cible réelle aujourd'hui — `/dashboard` y redirige).

- [ ] **Step 2 : Login — retirer le 2e argument**

Dans `src/pages/Login.tsx`, repérer l'appel `signIn(email, ...)` et le réduire à `signIn(email)`. (Le choix festivalier/exposant se fait à l'onboarding désormais.)

- [ ] **Step 3 : Vérifier compilation + lint**

Run: `pnpm build && pnpm lint`
Expected: 0 erreur de compilation. Les lectures résiduelles de `profile.type` compilent (le champ `type` existe encore sur l'acteur en Phase 1).

- [ ] **Step 4 : Test fumée manuel (base locale)**

1. Login nouveau compte → arrive sur `/onboarding` (personne sans `display_name`). 
2. (Onboarding réel = Plan 2 ; pour tester, renseigner `display_name` à la main en base) → re-login → arrive sur `/explorer`.
3. Login compte exposant migré → `/explorer`, et en console : `useAuth().entities` contient son entité.

- [ ] **Step 5 : Commit**

```bash
git add src/pages/AuthCallback.tsx src/pages/Login.tsx src/App.tsx
git commit -m "feat(accounts): auth guards based on person + needsOnboarding"
```

---

## Auto-vérification du plan (faite)

- **Couverture spec** : modèle personne→entités (0001 §7) ✓ ; migration sans casser l'auth ✓ ; AuthContext `{person, entities, currentEntity, switchEntity}` ✓ ; RLS ✓. **Hors périmètre Phase 1 (→ plans 2-4, listés)** : onboarding branché, sélecteur d'entité UI, câblage Explorer/Calendar/EventPage/PublicProfile/Settings/Embed, gating gratuit/Pro, contract.
- **Placeholders** : aucun (toutes les étapes ont SQL/TS réels).
- **Cohérence des noms** : `owns_actor`, `resolvePersonAndEntities`, `pickCurrentEntity`, `deriveNeedsOnboarding`, `currentEntity`, `switchEntity`, `ENTITY_STORAGE_KEY` — identiques entre tasks.

## Risques & rollback

| Risque | Gravité | Mitigation |
|---|---|---|
| **Migration auth casse le login** | 🔴 critique | Expand-contract (rien supprimé) ; backup pré-migration ; test intégral sur base locale + staging avant prod ; rollback = restaurer le dump. |
| Re-routage de données (Task 3) erroné | 🟠 | Requêtes d'assertion (counts orphelins = 0) ; volume alpha faible ; lignes d'origine conservées (juste converties). |
| `public_slug UNIQUE` en conflit (slug sur 2 lignes) | 🟠 | Task 3 libère le slug côté personne dans la même transaction. |
| RLS trop permissif/restrictif | 🟠 | Policies additives testées par insert simulé (Task 4 step 2) ; anciennes conservées. |
| Pages lisant `profile.type` | 🟢 | `type` conservé en Phase 1 + alias `profile` ; nettoyage au Plan 3/4. |

## Questions ouvertes pour Uriel (à trancher avant exécution)

1. **`plan` (Pro) sur la personne ou l'entité ?** (reco : personne).
2. **Historique d'un exposant alpha → entité** (reco : oui, Task 3). OK ?
3. **Une personne peut-elle être suivie ?** (reco V1 : non).
4. **Confirmer le modèle « profiles polymorphe »** vs table `entities` séparée (reco : polymorphe, cf. §décision).

## Plans suivants (à écrire après validation + exécution de Phase 1)

- **Plan 2 — Onboarding branché** (`Onboarding.tsx`, création d'entité, avatars, slug, métier libre) — réf. `docs/decisions/assets/onboarding.html`.
- **Plan 3 — Câblage par surface** + sélecteur d'entité (`AppLayout`) + gating gratuit/Pro (réf. matrice 0001 §5).
- **Plan 4 — Contract** (drop `type`/champs legacy, nettoyage RLS) une fois la prod stable.
