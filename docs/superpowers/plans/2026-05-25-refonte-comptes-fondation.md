# Refonte des comptes — Fondation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser des fondations de comptes propres : **1 personne ↔ N entités** (et **1 entité ↔ N gérants**), entités typées (exposant / festival / entreprise), avec un **acteur actif sélectionnable** qui détermine au nom de qui on agit.

**Architecture :** Modèle **acteur partagé** + **subtypes**. Une table `actors` (identité commune) ; `users` (la personne, festivalier) et `entities` (casquettes pro) sont des sous-types qui partagent l'`actor_id` ; `memberships` (M2M user↔entity + rôle) débloque le multi-gérants. **Toute action pointe un `actor_id`** ; ce qu'un acteur a le droit de faire dépend de son **type** (personne → va en *visiteur* ; exposant → *expose* ; festival → *organise*, ne « va » pas). RLS via `can_act_as(actor_id)`.

**Tech Stack :** Supabase (Postgres + RLS + trigger), `@supabase/supabase-js` v2, React 19 + Context, Vite, Vitest.

---

## Décision d'architecture (validée avec Uriel, 2026-05-25)

### Pourquoi PAS le polymorphe à propriétaire unique (modèle abandonné)
Un `profiles.owner_user_id` **unique** rend impossible qu'**une entité soit gérée par deux comptes** (cas explicite d'Uriel : Mathéo + lui gèrent « Rune de Chêne » ; cf. 0002 « équipe multi-personnes »). Disqualifié.

### Pourquoi on prend le risque d'une migration plus lourde
On est en **alpha** (très peu d'utilisateurs). C'est le moment **le moins cher** pour des fondations propres. On assume un **cutover coordonné** (cf. stratégie de migration) plutôt qu'un patch conservateur.

### Le modèle cible

```
actors(id, kind)                         -- identité partagée. kind ∈ {person, entity}
  ├─ users(actor_id → actors)            -- la PERSONNE (auth). actor_id = auth.uid()
  │     prénom(display_name), avatar, ville, CP, sexe, plan(free/pro), role(admin)
  └─ entities(actor_id → actors)         -- les CASQUETTES PRO. id = uuid
        type ∈ {exposant, festival, entreprise}
        brand_name, craft_type(libre), bio, website, banner, public_slug, avatar(logo), ville, CP

memberships(user_actor_id, entity_actor_id, role)   -- M2M. role ∈ {owner, admin, member}
  → 1 personne → N entités ; 1 entité → N gérants ✅

actions (participations, follows, reviews, notes, event_reports, events, notifications)
  → pointent un actor_id (peu importe personne ou entité)

can_act_as(actor_id) = (actor_id = auth.uid())
                       OR (membership: auth.uid() est membre de l'entité actor_id)
```

### Règle de validité par type d'acteur (le point clé d'Uriel)
| Acteur actif | Va à un festival ? | Comment c'est vu | Vitrine | Crée/organise |
|---|---|---|---|---|
| **Personne** (Uriel) | ✅ en **visiteur** | « Uriel y va (visiteur) » | non | — |
| **Entité exposant** (Rune de Chêne) | ✅ en **exposant** | « Rune de Chêne y expose » | oui | candidate |
| **Entité entreprise** | ✅ en **exposant** | « <Marque> y expose » | oui | candidate |
| **Entité festival/orga** | ❌ | — (option non proposée) | oui | **organise** le festival (V2) |

- Une participation = `(actor_id, event_id)`. La **nature** (visiteur/exposant) **découle du type d'acteur** — aucun champ supplémentaire.
- Clé d'unicité = **`(actor_id, event_id)`**, PAS `(humain, event)`. → le même humain peut aller au festival A en tant qu'Uriel-visiteur ET exposer au festival B en tant que Rune de Chêne. Acteurs distincts = lignes distinctes.

---

## Stratégie de migration : cutover propre (adapté à l'alpha)

> L'identité est couplée à **toutes** les pages (chaque requête filtre sur `user_id = auth.uid()`). On ne peut donc pas migrer « page par page en prod » proprement. À l'échelle alpha, on fait un **cutover coordonné** : on construit le nouveau schéma + on recâble l'app **sur une branche**, on teste, **backup**, on déploie d'un bloc. L'ancien (`profiles`) n'est supprimé qu'au **Plan 4 (contract)**, une fois la prod stable → rollback toujours possible.

**Séquence générale :**
1. **Phase 1 (CE PLAN)** — nouveau schéma `actors/users/entities/memberships` + backfill depuis `profiles` + colonnes `actor_id` sur les tables d'action (backfillées) + RLS `can_act_as`. `profiles` **conservé** (lecture legacy).
2. **Phase 2 (CE PLAN)** — couche identité côté app : helpers purs (dont la **règle de validité par type**), refonte `AuthContext` (`user / entities / currentActor / switchActor / capabilities`).
3. **Plan 3 (suivant)** — recâblage : onboarding branché, sélecteur d'entité, toutes les pages écrivent/lisent `actor_id`, gating gratuit/Pro.
4. **Plan 4 (suivant)** — contract : drop `profiles` + colonnes `user_id` legacy + anciennes policies.

> **Note infra de test (mémoire projet) :** RTL `render()` ne flushe pas le sync → on teste des **fonctions pures**. Les migrations se vérifient par **requêtes d'assertion** sur base locale (`supabase db reset`).

---

## Pré-requis (avant toute exécution)

- [ ] **Backup prod** (`supabase db dump` ou snapshot dashboard) — filet obligatoire (touche l'auth).
- [ ] Travailler sur **branche git** + **base Supabase locale** (`supabase start`, `supabase db reset`). Jamais direct en prod.
- [ ] Relever les volumes (servent de contrôle au backfill) :
  ```sql
  SELECT type, count(*) FROM profiles GROUP BY type;
  ```

---

## File Structure

**Migrations (créer) :**
- `supabase/migrations/20260525120000_actors_schema.sql` — enums + tables `actors/users/entities/memberships` + `can_act_as()` + RLS de ces tables.
- `supabase/migrations/20260525120001_actors_backfill.sql` — backfill depuis `profiles` (+ vérifications).
- `supabase/migrations/20260525120002_actions_actor_id.sql` — colonne `actor_id` sur les tables d'action + backfill + RLS additif.
- `supabase/migrations/20260525120003_handle_new_user.sql` — trigger signup → crée actor(person)+user (+ ligne `profiles` legacy le temps de la transition).

**Code (créer) :**
- `src/lib/actorModel.ts` — types + **fonctions pures** (identité, acteur courant, **capacités par type**, persistance).
- `src/lib/actorModel.test.ts` — tests Vitest.

**Code (modifier) :**
- `src/lib/auth.tsx` — `AuthContext` : `user / entities / currentActor / switchActor / capabilities` (+ `profile` alias rétro-compat).
- `src/types/database.ts` + `src/types/supabase.ts` (régénéré).
- `src/pages/AuthCallback.tsx`, `src/pages/Login.tsx`, `src/App.tsx` (gardes).

---

# PHASE 1 — Schéma & migration de données

## Task 1 : Schéma `actors / users / entities / memberships` + `can_act_as()`

**Files :** Create `supabase/migrations/20260525120000_actors_schema.sql`

- [ ] **Step 1 : Écrire la migration**

```sql
-- 20260525120000_actors_schema.sql
CREATE TYPE actor_kind     AS ENUM ('person', 'entity');
CREATE TYPE entity_type    AS ENUM ('exposant', 'festival', 'entreprise');
CREATE TYPE membership_role AS ENUM ('owner', 'admin', 'member');

-- Identité partagée. Pour une personne, actors.id = auth.users.id (= auth.uid()).
CREATE TABLE actors (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind actor_kind NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- La PERSONNE (festivalier de base). actor_id = auth.uid().
CREATE TABLE users (
  actor_id UUID PRIMARY KEY REFERENCES actors(id) ON DELETE CASCADE,
  auth_id  UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  city TEXT, department TEXT, postal_code TEXT,
  sex user_sex DEFAULT 'indefini',
  plan user_plan NOT NULL DEFAULT 'free',
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Les CASQUETTES PRO.
CREATE TABLE entities (
  actor_id UUID PRIMARY KEY REFERENCES actors(id) ON DELETE CASCADE,
  type entity_type NOT NULL,
  brand_name TEXT NOT NULL,
  craft_type TEXT,              -- texte LIBRE
  bio TEXT, website TEXT, banner_url TEXT, avatar_url TEXT,
  public_slug TEXT UNIQUE,
  city TEXT, department TEXT, postal_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_entities_slug ON entities(public_slug) WHERE public_slug IS NOT NULL;
CREATE INDEX idx_entities_type ON entities(type);

-- M2M : qui gère quelle entité, avec quel rôle.
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_actor_id   UUID NOT NULL REFERENCES users(actor_id)   ON DELETE CASCADE,
  entity_actor_id UUID NOT NULL REFERENCES entities(actor_id) ON DELETE CASCADE,
  role membership_role NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_actor_id, entity_actor_id)
);
CREATE INDEX idx_memberships_user   ON memberships(user_actor_id);
CREATE INDEX idx_memberships_entity ON memberships(entity_actor_id);

-- Autorisation : l'utilisateur courant agit-il en tant que cet acteur ?
CREATE OR REPLACE FUNCTION can_act_as(target_actor UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT target_actor = auth.uid()
      OR EXISTS (
        SELECT 1 FROM memberships
        WHERE user_actor_id = auth.uid() AND entity_actor_id = target_actor
      );
$$;

-- RLS des nouvelles tables
ALTER TABLE actors      ENABLE ROW LEVEL SECURITY;
ALTER TABLE users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY actors_select_all   ON actors   FOR SELECT USING (true);
CREATE POLICY users_select_all    ON users    FOR SELECT USING (true);   -- profils publics lisibles
CREATE POLICY users_update_self   ON users    FOR UPDATE USING (actor_id = auth.uid()) WITH CHECK (actor_id = auth.uid());
CREATE POLICY entities_select_all ON entities FOR SELECT USING (true);
CREATE POLICY entities_write_owned ON entities FOR ALL TO authenticated
  USING (can_act_as(actor_id)) WITH CHECK (can_act_as(actor_id));
CREATE POLICY memberships_select_mine ON memberships FOR SELECT TO authenticated
  USING (user_actor_id = auth.uid() OR can_act_as(entity_actor_id));
CREATE POLICY memberships_insert_self ON memberships FOR INSERT TO authenticated
  WITH CHECK (user_actor_id = auth.uid());   -- on s'ajoute soi-même (création d'entité). Invitations = Plan 3.
CREATE POLICY memberships_delete_owned ON memberships FOR DELETE TO authenticated
  USING (can_act_as(entity_actor_id));
```

- [ ] **Step 2 : Appliquer** — `supabase db reset` → aucune erreur.
- [ ] **Step 3 : Vérifier** (psql) :
```sql
\dt   -- actors, users, entities, memberships présentes
SELECT proname FROM pg_proc WHERE proname='can_act_as';  -- 1
```
- [ ] **Step 4 : Commit**
```bash
git add supabase/migrations/20260525120000_actors_schema.sql
git commit -m "feat(accounts): actors/users/entities/memberships schema + can_act_as()"
```

## Task 2 : Backfill depuis `profiles`

**Files :** Create `supabase/migrations/20260525120001_actors_backfill.sql`

- [ ] **Step 1 : Écrire le backfill**

```sql
-- 20260525120001_actors_backfill.sql
-- 1. Un acteur PERSONNE par profil existant (actors.id = profiles.id = auth.uid()).
INSERT INTO actors (id, kind, created_at)
  SELECT id, 'person', created_at FROM profiles
  ON CONFLICT (id) DO NOTHING;

-- 2. La table users (champs personne).
INSERT INTO users (actor_id, auth_id, email, display_name, avatar_url, city, department, postal_code, sex, plan, role, created_at)
  SELECT id, id, email,
         CASE WHEN type='exposant' THEN NULL ELSE display_name END,  -- l'exposant met son prénom à l'onboarding (Plan 2) ; null = needsOnboarding
         CASE WHEN type='exposant' THEN NULL ELSE avatar_url END,
         city, department, postal_code, sex, plan, COALESCE(role,'user'), created_at
  FROM profiles
  ON CONFLICT (actor_id) DO NOTHING;

-- 3. Pour chaque exposant : un acteur ENTITÉ + entities + membership(owner).
WITH expo AS (SELECT * FROM profiles WHERE type='exposant'),
ins_actor AS (
  INSERT INTO actors (id, kind, created_at)
    SELECT gen_random_uuid(), 'entity', e.created_at FROM expo e
    RETURNING id, created_at
)
-- mapping ordonné : on ré-associe via une numérotation stable
, mapped AS (
  SELECT a.id AS entity_actor_id, e.id AS person_id, e.*
  FROM (SELECT *, row_number() OVER (ORDER BY created_at, id) rn FROM expo) e
  JOIN (SELECT id, row_number() OVER (ORDER BY created_at, id) rn FROM ins_actor) a
    ON e.rn = a.rn
)
, ins_entity AS (
  INSERT INTO entities (actor_id, type, brand_name, craft_type, bio, website, banner_url, avatar_url, public_slug, city, department, postal_code, created_at)
    SELECT entity_actor_id, 'exposant',
           COALESCE(brand_name, display_name, 'Ma marque'),
           craft_type, bio, website, banner_url, avatar_url, public_slug, city, department, postal_code, created_at
    FROM mapped
  RETURNING actor_id
)
INSERT INTO memberships (user_actor_id, entity_actor_id, role)
  SELECT person_id, entity_actor_id, 'owner' FROM mapped;
```

> ⚠️ Le mapping `row_number()` suppose un ordre stable ; sur l'alpha (peu de lignes) c'est sûr. **Alternative plus robuste recommandée à l'exécution** : faire le split en PL/pgSQL avec une boucle `FOR r IN SELECT ... LOOP` qui crée actor+entity+membership ligne par ligne (zéro risque d'appariement). À privilégier si > quelques exposants.

- [ ] **Step 2 : Vérifier les invariants** (psql) :
```sql
SELECT (SELECT count(*) FROM users)    AS users,
       (SELECT count(*) FROM profiles) AS profiles;            -- égaux
SELECT count(*) FROM entities;                                 -- = nb exposants (pré-requis)
SELECT count(*) FROM memberships WHERE role='owner';           -- = nb exposants
-- chaque entité a exactement 1 owner
SELECT entity_actor_id, count(*) FROM memberships GROUP BY 1 HAVING count(*)<>1;  -- 0 ligne
-- slugs uniques préservés
SELECT public_slug, count(*) FROM entities WHERE public_slug IS NOT NULL GROUP BY 1 HAVING count(*)>1;  -- 0
```
- [ ] **Step 3 : Commit**
```bash
git add supabase/migrations/20260525120001_actors_backfill.sql
git commit -m "feat(accounts): backfill actors/users/entities/memberships from profiles"
```

## Task 3 : `actor_id` sur les tables d'action + backfill + RLS additif

**Files :** Create `supabase/migrations/20260525120002_actions_actor_id.sql`

> Règle de backfill : si le propriétaire de l'action était un **exposant**, l'action part sur son **entité** ; sinon elle reste sur la **personne** (dont l'actor_id = l'ancien `user_id`, valeur inchangée).

- [ ] **Step 1 : Écrire la migration**

```sql
-- 20260525120002_actions_actor_id.sql
-- Table d'aide : pour chaque personne-exposant, son entité.
CREATE TEMP TABLE _expo_entity AS
  SELECT m.user_actor_id AS person_id, m.entity_actor_id AS entity_id
  FROM memberships m JOIN entities e ON e.actor_id=m.entity_actor_id AND e.type='exposant';

-- Helper inline : actor cible d'un ancien user_id
-- (entité si exposant, sinon la personne elle-même = l'ancien id).
-- PARTICIPATIONS
ALTER TABLE participations ADD COLUMN actor_id UUID REFERENCES actors(id) ON DELETE CASCADE;
UPDATE participations p SET actor_id = COALESCE(ee.entity_id, p.user_id)
  FROM (SELECT p2.id, ee.entity_id FROM participations p2 LEFT JOIN _expo_entity ee ON ee.person_id=p2.user_id) ee
  WHERE p.id = ee.id;
ALTER TABLE participations ALTER COLUMN actor_id SET NOT NULL;
ALTER TABLE participations ADD CONSTRAINT uniq_participation_actor UNIQUE (actor_id, event_id);

-- Idem pour les autres tables (même motif COALESCE(entity, ancien id)).
ALTER TABLE reviews       ADD COLUMN actor_id UUID REFERENCES actors(id) ON DELETE CASCADE;
UPDATE reviews r       SET actor_id = COALESCE((SELECT entity_id FROM _expo_entity WHERE person_id=r.user_id), r.user_id);
ALTER TABLE event_reports ADD COLUMN actor_id UUID REFERENCES actors(id) ON DELETE CASCADE;
UPDATE event_reports er SET actor_id = COALESCE((SELECT entity_id FROM _expo_entity WHERE person_id=er.user_id), er.user_id);
ALTER TABLE notes         ADD COLUMN actor_id UUID REFERENCES actors(id) ON DELETE CASCADE;
UPDATE notes n         SET actor_id = COALESCE((SELECT entity_id FROM _expo_entity WHERE person_id=n.user_id), n.user_id);
ALTER TABLE events        ADD COLUMN created_by_actor UUID REFERENCES actors(id) ON DELETE SET NULL;
UPDATE events e        SET created_by_actor = COALESCE((SELECT entity_id FROM _expo_entity WHERE person_id=e.created_by), e.created_by);
ALTER TABLE notifications ADD COLUMN actor_id UUID REFERENCES actors(id) ON DELETE CASCADE;
UPDATE notifications nt SET actor_id = COALESCE((SELECT entity_id FROM _expo_entity WHERE person_id=nt.user_id), nt.user_id);

-- FOLLOWS : deux côtés
ALTER TABLE follows ADD COLUMN follower_actor  UUID REFERENCES actors(id) ON DELETE CASCADE;
ALTER TABLE follows ADD COLUMN following_actor UUID REFERENCES actors(id) ON DELETE CASCADE;
UPDATE follows f SET follower_actor  = COALESCE((SELECT entity_id FROM _expo_entity WHERE person_id=f.follower_id),  f.follower_id);
UPDATE follows f SET following_actor = COALESCE((SELECT entity_id FROM _expo_entity WHERE person_id=f.following_id), f.following_id);

-- RLS additif via can_act_as (les anciennes policies restent valables pour les personnes)
CREATE POLICY participations_write_actor ON participations FOR ALL TO authenticated
  USING (can_act_as(actor_id)) WITH CHECK (can_act_as(actor_id));
CREATE POLICY reviews_write_actor ON reviews FOR ALL TO authenticated
  USING (can_act_as(actor_id)) WITH CHECK (can_act_as(actor_id));
CREATE POLICY event_reports_write_actor ON event_reports FOR ALL TO authenticated
  USING (can_act_as(actor_id)) WITH CHECK (can_act_as(actor_id));
CREATE POLICY notes_write_actor ON notes FOR ALL TO authenticated
  USING (can_act_as(actor_id)) WITH CHECK (can_act_as(actor_id));
CREATE POLICY follows_write_actor ON follows FOR ALL TO authenticated
  USING (can_act_as(follower_actor)) WITH CHECK (can_act_as(follower_actor));
CREATE POLICY events_write_actor ON events FOR ALL TO authenticated
  USING (can_act_as(created_by_actor)) WITH CHECK (can_act_as(created_by_actor));
```

> Les **vues/fonctions** `friends`, `are_friends`, `get_friend_ids`, `event_scores` s'appuient sur les anciens `follower_id/following_id/user_id` — elles **restent valides** en Phase 1 (colonnes conservées). Leur bascule sur `*_actor` se fera au **Plan 3** quand les pages liront `actor_id`.

- [ ] **Step 2 : Vérifier** (psql) : aucune `actor_id` nulle ; contrainte d'unicité OK ; 0 orphelin (`LEFT JOIN actors` → null = 0).
- [ ] **Step 3 : Commit**
```bash
git add supabase/migrations/20260525120002_actions_actor_id.sql
git commit -m "feat(accounts): add+backfill actor_id on action tables + additive RLS"
```

## Task 4 : Trigger signup → personne (+ ligne profiles legacy transitoire)

**Files :** Create `supabase/migrations/20260525120003_handle_new_user.sql`

- [ ] **Step 1 : Écrire la migration**

```sql
-- 20260525120003_handle_new_user.sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Acteur + personne (le cœur du nouveau modèle)
  INSERT INTO actors (id, kind) VALUES (NEW.id, 'person') ON CONFLICT DO NOTHING;
  INSERT INTO users (actor_id, auth_id, email) VALUES (NEW.id, NEW.id, NEW.email)
    ON CONFLICT (actor_id) DO NOTHING;
  -- Ligne profiles legacy (transition : pages non encore recâblées la lisent). Retiré au Plan 4.
  INSERT INTO profiles (id, email, type, kind) VALUES (NEW.id, NEW.email, 'public', 'person')
    ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
```
> `profiles.kind` n'existe pas encore → ajouter `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kind text;` en tête de cette migration, OU retirer `kind` de l'INSERT profiles (legacy n'en a pas besoin). **Choix simple : retirer `kind` de l'INSERT profiles.**

- [ ] **Step 2 : Appliquer + test** — nouveau signup (app locale) → 1 ligne `actors(person)`, 1 `users`, 1 `profiles`. 
- [ ] **Step 3 : Commit**
```bash
git add supabase/migrations/20260525120003_handle_new_user.sql
git commit -m "feat(accounts): signup creates actor+user (+ legacy profiles row during transition)"
```

---

# PHASE 2 — Couche identité (app)

## Task 5 : Module pur `actorModel.ts` (+ règle de validité par type) + tests

**Files :** Create `src/lib/actorModel.ts`, `src/lib/actorModel.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// src/lib/actorModel.test.ts
import { describe, it, expect } from 'vitest'
import { presenceNature, actorCan, pickCurrentActor, deriveNeedsOnboarding, ENTITY_STORAGE_KEY, type ActorView } from './actorModel'

const uriel: ActorView   = { id:'u1', kind:'person', entityType:null,        label:'Uriel',         hasName:true }
const rune: ActorView    = { id:'e1', kind:'entity', entityType:'exposant',  label:'Rune de Chêne', hasName:true }
const orga: ActorView    = { id:'e2', kind:'entity', entityType:'festival',  label:'Fest Orga',     hasName:true }

describe('presenceNature (qui peut aller à un festival, et comment)', () => {
  it('personne → visiteur', () => expect(presenceNature(uriel)).toBe('visitor'))
  it('exposant → exposant',  () => expect(presenceNature(rune)).toBe('exhibitor'))
  it('festival/orga → null (ne va pas, il organise)', () => expect(presenceNature(orga)).toBeNull())
})

describe('actorCan', () => {
  it('exposant peut exposer, pas organiser', () => {
    expect(actorCan(rune,'exhibit')).toBe(true)
    expect(actorCan(rune,'organize')).toBe(false)
  })
  it('festival peut organiser, pas aller', () => {
    expect(actorCan(orga,'organize')).toBe(true)
    expect(actorCan(orga,'attend')).toBe(false)
  })
  it('personne peut aller, pas exposer ni avoir de vitrine', () => {
    expect(actorCan(uriel,'attend')).toBe(true)
    expect(actorCan(uriel,'exhibit')).toBe(false)
    expect(actorCan(uriel,'haveVitrine')).toBe(false)
  })
})

describe('pickCurrentActor', () => {
  it('défaut = la personne si rien de stocké', () => expect(pickCurrentActor(uriel,[rune],null).id).toBe('u1'))
  it('entité stockée si valide', () => expect(pickCurrentActor(uriel,[rune],'e1').id).toBe('e1'))
  it('retombe sur la personne si id stocké invalide', () => expect(pickCurrentActor(uriel,[rune],'x').id).toBe('u1'))
})

describe('deriveNeedsOnboarding', () => {
  it('vrai si la personne n’a pas de prénom', () => expect(deriveNeedsOnboarding({...uriel,hasName:false})).toBe(true))
  it('faux sinon', () => expect(deriveNeedsOnboarding(uriel)).toBe(false))
  it('vrai si pas de personne', () => expect(deriveNeedsOnboarding(null)).toBe(true))
})

it('clé de stockage stable', () => expect(ENTITY_STORAGE_KEY).toBe('flwsh.currentActorId'))
```

- [ ] **Step 2 : Lancer, vérifier l'échec** — `pnpm test src/lib/actorModel.test.ts` → FAIL (module absent).

- [ ] **Step 3 : Implémenter**

```typescript
// src/lib/actorModel.ts
export type ActorKind = 'person' | 'entity'
export type EntityType = 'exposant' | 'festival' | 'entreprise'
export type ActorAction = 'attend' | 'exhibit' | 'organize' | 'haveVitrine' | 'review'

/** Vue minimale d'un acteur pour la logique d'app (sur-ensemble = users/entities row). */
export interface ActorView {
  id: string
  kind: ActorKind
  entityType: EntityType | null
  label: string | null        // display_name (personne) ou brand_name (entité)
  hasName: boolean            // la personne a-t-elle renseigné son prénom ?
}

export const ENTITY_STORAGE_KEY = 'flwsh.currentActorId'

/** Nature de présence à un festival selon le type d'acteur (règle produit). */
export function presenceNature(a: ActorView): 'visitor' | 'exhibitor' | null {
  if (a.kind === 'person') return 'visitor'
  if (a.entityType === 'exposant' || a.entityType === 'entreprise') return 'exhibitor'
  return null // festival/orga : n'y va pas
}

export function actorCan(a: ActorView, action: ActorAction): boolean {
  switch (action) {
    case 'attend':      return presenceNature(a) !== null
    case 'exhibit':     return presenceNature(a) === 'exhibitor'
    case 'organize':    return a.kind === 'entity' && a.entityType === 'festival'
    case 'haveVitrine': return a.kind === 'entity'
    case 'review':      return presenceNature(a) === 'exhibitor'
  }
}

/** Acteur actif : entité stockée si valide, sinon la personne (mode festivalier). */
export function pickCurrentActor(person: ActorView, entities: ActorView[], storedId: string | null): ActorView {
  if (storedId) {
    const e = entities.find(x => x.id === storedId)
    if (e) return e
  }
  return person
}

export function deriveNeedsOnboarding(person: ActorView | null): boolean {
  return !person || !person.hasName
}

export function readStoredActorId(): string | null {
  try { return localStorage.getItem(ENTITY_STORAGE_KEY) } catch { return null }
}
export function writeStoredActorId(id: string | null): void {
  try { id ? localStorage.setItem(ENTITY_STORAGE_KEY, id) : localStorage.removeItem(ENTITY_STORAGE_KEY) } catch { /* ignore */ }
}
```

- [ ] **Step 4 : Lancer, vérifier le succès** — `pnpm test src/lib/actorModel.test.ts` → PASS.
- [ ] **Step 5 : Commit**
```bash
git add src/lib/actorModel.ts src/lib/actorModel.test.ts
git commit -m "feat(accounts): pure actor model (capabilities by type, current actor) + tests"
```

## Task 6 : Régénérer les types Supabase

**Files :** Modify `src/types/supabase.ts`, `src/types/database.ts`

- [ ] **Step 1 :** `supabase gen types typescript --local > src/types/supabase.ts`
- [ ] **Step 2 :** dans `database.ts`, ajouter :
```typescript
export type ActorRow      = Database['public']['Tables']['actors']['Row']
export type UserRow       = Database['public']['Tables']['users']['Row']
export type EntityRow     = Database['public']['Tables']['entities']['Row']
export type MembershipRow = Database['public']['Tables']['memberships']['Row']
export type EntityType    = Database['public']['Enums']['entity_type']
```
- [ ] **Step 3 :** `pnpm build` → 0 erreur de types sur les nouvelles tables.
- [ ] **Step 4 : Commit**
```bash
git add src/types/supabase.ts src/types/database.ts
git commit -m "chore(accounts): regen supabase types + row aliases"
```

## Task 7 : Refonte `AuthContext`

**Files :** Modify `src/lib/auth.tsx`

- [ ] **Step 1 : Nouveau type de contexte** (remplace `AuthContextType`)
```typescript
import type { UserRow, EntityRow } from '@/types/database'
import { pickCurrentActor, deriveNeedsOnboarding, readStoredActorId, writeStoredActorId,
         actorCan, type ActorView, type ActorAction } from './actorModel'

interface AuthContextType {
  user: User | null
  session: Session | null
  person: UserRow | null
  entities: EntityRow[]
  currentActor: ActorView           // acteur actif (personne par défaut)
  currentActorRow: UserRow | EntityRow | null
  switchActor: (actorId: string | null) => void
  can: (action: ActorAction) => boolean
  profile: (UserRow | EntityRow) | null   // alias rétro-compat
  loading: boolean
  signIn: (email: string) => Promise<{ error: Error | null }>
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  needsOnboarding: boolean
  isAdmin: boolean
}
```

- [ ] **Step 2 : Provider** — charger personne + entités via memberships, exposer l'acteur courant.
```typescript
const [person, setPerson] = useState<UserRow | null>(null)
const [entities, setEntities] = useState<EntityRow[]>([])
const [currentActorId, setCurrentActorId] = useState<string | null>(readStoredActorId())

const fetchIdentity = async (authUid: string) => {
  const { data: u } = await supabase.from('users').select('*').eq('actor_id', authUid).single()
  setPerson((u as UserRow) ?? null)
  const { data: ms } = await supabase.from('memberships')
    .select('entity_actor_id, entities(*)').eq('user_actor_id', authUid)
  setEntities(((ms ?? []).map((m: { entities: EntityRow }) => m.entities).filter(Boolean)) as EntityRow[])
}
// onAuthStateChange → fetchIdentity(session.user.id) ; sinon reset.

const toView = (row: UserRow | EntityRow | null, kind: 'person'|'entity'): ActorView | null => row && ({
  id: (row as { actor_id: string }).actor_id,
  kind,
  entityType: kind==='entity' ? (row as EntityRow).type : null,
  label: kind==='entity' ? (row as EntityRow).brand_name : (row as UserRow).display_name,
  hasName: kind==='person' ? !!(row as UserRow).display_name : true,
})
const personView = toView(person,'person')
const entityViews = entities.map(e => toView(e,'entity')!) 
const currentActor = personView ? pickCurrentActor(personView, entityViews, currentActorId) : personView!
const currentActorRow = currentActor?.kind==='entity'
  ? entities.find(e => e.actor_id===currentActor.id) ?? null
  : person
const switchActor = (id: string | null) => { setCurrentActorId(id); writeStoredActorId(id) }
const can = (action: ActorAction) => currentActor ? actorCan(currentActor, action) : false
const profile = currentActorRow
const needsOnboarding = !!user && deriveNeedsOnboarding(personView)
const isAdmin = person?.role === 'admin'
```
(Conserver `signIn(email)` sans `accountType`, `verifyOtp`, `signOut` qui reset `switchActor(null)`.)

- [ ] **Step 3 :** `pnpm build` — noter les erreurs résiduelles (`signIn` 2 args, lectures `profile.type`) → corrigées Task 8 / Plan 3.
- [ ] **Step 4 : Commit**
```bash
git add src/lib/auth.tsx
git commit -m "feat(accounts): AuthContext exposes person/entities/currentActor/switchActor/can"
```

## Task 8 : Gardes auth (callback / login / onboarding gate)

**Files :** Modify `src/pages/AuthCallback.tsx`, `src/pages/Login.tsx`, vérifier `src/App.tsx`

- [ ] **Step 1 : AuthCallback** — router sur `needsOnboarding` :
```typescript
const { user, needsOnboarding, loading } = useAuth()
// ...
if (user) navigate(needsOnboarding ? '/onboarding' : '/explorer', { replace: true })
else navigate('/login', { replace: true })
```
- [ ] **Step 2 : Login** — `signIn(email)` (retirer le 2e argument `accountType`).
- [ ] **Step 3 :** `pnpm build && pnpm lint` → 0 erreur (les lectures `profile.type` restantes appartiennent au Plan 3 ; si bloquantes, garder `type` sur l'alias en attendant).
- [ ] **Step 4 : Test fumée** (base locale) : nouveau compte → `/onboarding` ; compte exposant migré → `/explorer`, `useAuth().entities` contient son entité, `useAuth().can('exhibit')` vrai quand l'entité est active, faux en mode personne.
- [ ] **Step 5 : Commit**
```bash
git add src/pages/AuthCallback.tsx src/pages/Login.tsx src/App.tsx
git commit -m "feat(accounts): auth guards on person identity + needsOnboarding"
```

---

## Auto-vérification (faite)
- **Couverture spec** : 1 personne↔N entités + 1 entité↔N gérants (memberships) ✓ ; entités typées ✓ ; acteur partagé + actions sur `actor_id` ✓ ; **règle de validité par type** (visiteur/expose/organise) ✓ codée et testée (`presenceNature`/`actorCan`) ✓ ; migration sans casser l'auth (cutover + backup) ✓.
- **Hors périmètre (→ Plans 3-4)** : onboarding branché, sélecteur d'entité UI, recâblage des pages (Explorer/Calendar/EventPage/PublicProfile/Settings/Embed), bascule des vues `friends`/`event_scores` sur `*_actor`, gating gratuit/Pro, contract (drop `profiles`).
- **Placeholders** : aucun. **Cohérence noms** : `can_act_as`, `actor_id`, `actorModel`, `presenceNature`, `actorCan`, `pickCurrentActor`, `currentActor`, `switchActor`, `ENTITY_STORAGE_KEY` cohérents entre tasks.

## Risques & rollback
| Risque | Gravité | Mitigation |
|---|---|---|
| Migration casse l'auth | 🔴 | Backup prod ; branche + base locale ; `profiles` conservé (cutover, pas destructif) ; rollback = restaurer le dump. |
| Backfill exposant→entité mal apparié | 🟠 | Préférer la **boucle PL/pgSQL** (Task 2 note) ; requêtes d'assertion (counts, owners uniques, 0 orphelin). |
| Vues `friends`/`event_scores` sur anciennes colonnes | 🟢 | Colonnes legacy conservées en Phase 1 ; bascule au Plan 3. |
| Doublon d'identité (profiles + users) pendant la transition | 🟠 | Trigger dual-write ; source de vérité = `users/entities` côté app ; `profiles` retiré au Plan 4. |

## Questions ouvertes (à confirmer avant exécution)
1. **`plan` (Pro) sur `users` (la personne)** — reco retenue. Un abo couvre les entités du même humain. OK ?
2. **Backfill : prénom de l'exposant** mis à `NULL` → l'exposant repasse par l'onboarding pour saisir son prénom (Plan 2). Acceptable, ou on copie `display_name` existant dans `users.display_name` ?
3. **Invitations multi-gérants** (ajouter un 2ᵉ gérant) = Plan 3 (UI + policy d'insert membership par un owner). OK de ne pas la faire en Phase 1 ?

## Plans suivants
- **Plan 3 — Recâblage & onboarding** : onboarding branché (réf. `docs/decisions/assets/onboarding.html`), sélecteur d'entité (`AppLayout`), toutes les pages sur `actor_id`, bascule vues sociales, gating gratuit/Pro (réf. matrice 0001 §5), invitations multi-gérants.
- **Plan 4 — Contract** : drop `profiles`, colonnes `user_id`/`follower_id`/`following_id` legacy, anciennes policies.
