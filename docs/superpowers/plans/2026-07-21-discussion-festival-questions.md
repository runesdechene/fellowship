# Discussion du festival — onglet Questions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le placeholder `DiscussionTeaser` par un vrai Q&R multi-publics (festivalier / exposant) sur l'événement de l'année en cours, avec threads, fil plat de réponses, meilleure réponse élue, notifications et signalement.

**Architecture:** Deux tables Postgres dédiées (`event_threads`, `event_thread_replies`) sur le modèle acteur (RLS `can_act_as` + contrainte d'audience), triggers de notification (`thread_reply`, `best_reply`), signalement via `content_reports` étendu. Front React : fonctions pures testables (`lib/event-threads.ts`), hooks CRUD (`use-event-threads`, `use-thread-replies`), composants DA verre branchés dans `EventPage`. On calque fidèlement le précédent « réponses aux avis » (`review_replies`).

**Tech Stack:** Supabase/Postgres (migrations CLI), React 19 + TS, Vitest (fonctions pures uniquement — cf. contrainte RTL du projet), Tailwind v4 (CSS-first).

## Global Constraints

- **Prod live** : le Supabase lié = production. Toute migration touche le site déployé + les iframes clients. Migrations **rétro-compatibles poussées AVANT** le front qui en dépend. **Prévenir Uriel avant chaque `supabase db push`.**
- **OAuth MCP Supabase cassé** → appliquer les migrations via le **CLI lié** (`supabase db push`), pas via le MCP.
- **Modèle acteur** : autorisation via `can_act_as(actor_id)` (owner/membre) et `is_admin()` (`SECURITY DEFINER`). Ne jamais retomber sur un pattern legacy `user_id = auth.uid()`.
- **Tests** : RTL ne flush pas synchro sur cette stack → **tester les fonctions pures**, pas les composants (cf. `reference_react_test_infra`). Composants vérifiés par `pnpm build` + smoke manuel.
- **DA** : classes verre `.glass-card`, tokens `--app-bg`, `--accent-app` (terracotta = action), `--forest` (vert = résolu/meilleure réponse), canaux Festivaliers `#8bb5e0` / Exposants `--copper`. **Pas de scroll interne imbriqué** (`feedback_no_inner_scroll`). Maquette validée : `.superpowers/brainstorm/1024-1784616696/content/discussion-hifi-A.html`.
- **Colonne event** : le nom de l'événement est `events.name` (pas `event_name`), la confidentialité `events.is_private`.
- **Auto-commit + bump** : après changement de code, bump `package.json` `version` (patch), commit conventional, push sur `main`.
- **Spec de référence** : `docs/superpowers/specs/2026-07-21-discussion-festival-questions-design.md`.

---

### Task 1: Migration — schéma `event_threads` / `event_thread_replies` + RLS

**Files:**
- Create: `supabase/migrations/20260721140000_event_threads.sql`

**Interfaces:**
- Produces (DB) : tables `public.event_threads(id, event_id, actor_id, acted_by_user_id, audience, title, body, best_reply_id, created_at, updated_at)` et `public.event_thread_replies(id, thread_id, actor_id, acted_by_user_id, body, created_at, updated_at)` ; type enum `thread_audience` (`'festivalier' | 'exposant' | 'organisateur'`) ; trigger d'intégrité `enforce_best_reply_thread`.

- [ ] **Step 1: Écrire la migration**

Créer `supabase/migrations/20260721140000_event_threads.sql` :

```sql
-- Discussion du festival — onglet Questions. Q&R multi-publics sur l'event de
-- l'année en cours. Modèle acteur, RLS calquée sur review_replies (can_act_as).
-- audience = canal du thread, dérivé du type de l'acteur qui poste.

CREATE TYPE public.thread_audience AS ENUM ('festivalier', 'exposant', 'organisateur');

-- La QUESTION
CREATE TABLE public.event_threads (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         uuid NOT NULL REFERENCES public.events(id)  ON DELETE CASCADE,
  actor_id         uuid NOT NULL REFERENCES public.actors(id)  ON DELETE CASCADE,
  acted_by_user_id uuid REFERENCES public.users(actor_id)      ON DELETE SET NULL,
  audience         public.thread_audience NOT NULL,
  title            text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 140),
  body             text CHECK (body IS NULL OR char_length(body) <= 2000),
  best_reply_id    uuid,   -- FK ajoutée après event_thread_replies (cycle)
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_event_threads_event ON public.event_threads(event_id, created_at DESC);

-- La RÉPONSE (fil plat)
CREATE TABLE public.event_thread_replies (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id        uuid NOT NULL REFERENCES public.event_threads(id) ON DELETE CASCADE,
  actor_id         uuid NOT NULL REFERENCES public.actors(id)        ON DELETE CASCADE,
  acted_by_user_id uuid REFERENCES public.users(actor_id)            ON DELETE SET NULL,
  body             text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_event_thread_replies_thread ON public.event_thread_replies(thread_id, created_at);

-- Lien « meilleure réponse » (SET NULL si la réponse élue est supprimée)
ALTER TABLE public.event_threads
  ADD CONSTRAINT fk_best_reply
  FOREIGN KEY (best_reply_id) REFERENCES public.event_thread_replies(id) ON DELETE SET NULL;

-- Intégrité : la réponse élue doit appartenir AU MÊME thread.
CREATE OR REPLACE FUNCTION public.enforce_best_reply_thread()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.best_reply_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.event_thread_replies r
      WHERE r.id = NEW.best_reply_id AND r.thread_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'best_reply_id % does not belong to thread %', NEW.best_reply_id, NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enforce_best_reply ON public.event_threads;
CREATE TRIGGER trg_enforce_best_reply
  BEFORE INSERT OR UPDATE OF best_reply_id ON public.event_threads
  FOR EACH ROW EXECUTE FUNCTION public.enforce_best_reply_thread();

-- ---------- RLS ----------
ALTER TABLE public.event_threads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_thread_replies ENABLE ROW LEVEL SECURITY;

-- SELECT ouvert (cohérent avec reviews / review_replies).
CREATE POLICY event_threads_select ON public.event_threads
  FOR SELECT TO authenticated USING (true);
CREATE POLICY event_thread_replies_select ON public.event_thread_replies
  FOR SELECT TO authenticated USING (true);

-- INSERT thread : acteur contrôlé ET (audience concorde avec le type d'acteur).
CREATE POLICY event_threads_insert ON public.event_threads
  FOR INSERT TO authenticated
  WITH CHECK (
    can_act_as(actor_id) AND (
      (audience = 'festivalier'  AND EXISTS (SELECT 1 FROM public.users u    WHERE u.actor_id = event_threads.actor_id)) OR
      (audience = 'exposant'     AND EXISTS (SELECT 1 FROM public.entities e WHERE e.actor_id = event_threads.actor_id AND e.type = 'exposant')) OR
      (audience = 'organisateur' AND EXISTS (SELECT 1 FROM public.entities e WHERE e.actor_id = event_threads.actor_id AND e.type = 'festival'))
    )
  );

-- UPDATE thread : l'auteur (édition titre/corps + élection best_reply_id).
CREATE POLICY event_threads_update ON public.event_threads
  FOR UPDATE TO authenticated
  USING (can_act_as(actor_id)) WITH CHECK (can_act_as(actor_id));

-- DELETE thread : auteur OU admin.
CREATE POLICY event_threads_delete ON public.event_threads
  FOR DELETE TO authenticated
  USING (can_act_as(actor_id) OR public.is_admin());

-- INSERT réponse : acteur contrôlé (participation cross-canal autorisée, aucune contrainte d'audience).
CREATE POLICY event_thread_replies_insert ON public.event_thread_replies
  FOR INSERT TO authenticated
  WITH CHECK (can_act_as(actor_id));

-- UPDATE réponse : l'auteur.
CREATE POLICY event_thread_replies_update ON public.event_thread_replies
  FOR UPDATE TO authenticated
  USING (can_act_as(actor_id)) WITH CHECK (can_act_as(actor_id));

-- DELETE réponse : auteur OU admin.
CREATE POLICY event_thread_replies_delete ON public.event_thread_replies
  FOR DELETE TO authenticated
  USING (can_act_as(actor_id) OR public.is_admin());
```

- [ ] **Step 2: Prévenir Uriel puis pousser la migration**

Annoncer : « Je pousse la migration schéma Discussion en prod (rétro-compatible, purement additive). »
Run: `supabase db push`
Expected: la migration `20260721140000_event_threads` s'applique sans erreur ; historique synchro.

- [ ] **Step 3: Vérifier le schéma en prod**

Run (via `supabase db push` réussi puis vérification) :
```bash
supabase db execute --sql "SELECT to_regclass('public.event_threads'), to_regclass('public.event_thread_replies'), enum_range(NULL::public.thread_audience);"
```
Expected: les deux tables existent, l'enum vaut `{festivalier,exposant,organisateur}`.
(Si `db execute` indisponible sur cette version du CLI, vérifier via le dashboard SQL editor.)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260721140000_event_threads.sql
git commit -m "feat(db): tables event_threads + event_thread_replies + RLS"
```

---

### Task 2: Migration — valeurs d'enum `notification_type`

**Files:**
- Create: `supabase/migrations/20260721140050_notification_types_thread.sql`

**Interfaces:**
- Produces (DB) : valeurs `'thread_reply'` et `'best_reply'` sur l'enum `notification_type`.

- [ ] **Step 1: Écrire la migration**

Fichier séparé (une valeur d'enum ne peut pas être employée dans la même transaction que son `ADD VALUE` — même contrainte que `review_reply`) :

```sql
-- Valeurs d'enum ajoutées AVANT la migration des triggers qui les emploient.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'thread_reply';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'best_reply';
```

- [ ] **Step 2: Pousser**

Run: `supabase db push`
Expected: migration appliquée sans erreur.

- [ ] **Step 3: Vérifier**

Run: `supabase db execute --sql "SELECT enum_range(NULL::public.notification_type);"`
Expected: la liste contient `thread_reply` et `best_reply`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260721140050_notification_types_thread.sql
git commit -m "feat(db): notification_type += thread_reply, best_reply"
```

---

### Task 3: Migration — triggers de notification

**Files:**
- Create: `supabase/migrations/20260721140100_event_thread_notif.sql`

**Interfaces:**
- Consumes (DB) : enum values de Task 2, tables de Task 1, vue `public.actor_public(actor_id, label, avatar_url)`, table `public.notifications(actor_id, type, data)`.
- Produces (DB) : fonctions `notify_thread_reply()`, `notify_best_reply()` + triggers.

- [ ] **Step 1: Écrire la migration**

```sql
-- Notif « thread_reply » : quelqu'un répond à ta question.
--  - garde anti-auto-notif : auteur du thread == répondeur -> rien.
--  - garde is_private : thread sur event privé -> rien.
CREATE OR REPLACE FUNCTION public.notify_thread_reply()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  thread_author uuid;
  thread_title  text;
  ev_id uuid; ev_name text; ev_private boolean;
  replier_name text; replier_avatar text;
BEGIN
  SELECT t.actor_id, t.title, t.event_id INTO thread_author, thread_title, ev_id
    FROM event_threads t WHERE t.id = NEW.thread_id;
  IF thread_author IS NULL OR thread_author = NEW.actor_id THEN
    RETURN NEW;
  END IF;

  SELECT e.name, e.is_private INTO ev_name, ev_private FROM events e WHERE e.id = ev_id;
  IF ev_private THEN RETURN NEW; END IF;

  SELECT COALESCE(label, 'Quelqu''un'), avatar_url INTO replier_name, replier_avatar
    FROM actor_public WHERE actor_id = NEW.actor_id;

  INSERT INTO notifications (actor_id, type, data)
  VALUES (
    thread_author, 'thread_reply',
    jsonb_build_object(
      'actor_id', NEW.actor_id, 'actor_name', replier_name, 'actor_avatar_url', replier_avatar,
      'event_id', ev_id, 'event_name', ev_name,
      'thread_id', NEW.thread_id, 'thread_title', thread_title
    )
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_thread_reply ON event_thread_replies;
CREATE TRIGGER on_thread_reply
  AFTER INSERT ON event_thread_replies
  FOR EACH ROW EXECUTE FUNCTION notify_thread_reply();

-- Notif « best_reply » : ta réponse a été élue meilleure réponse.
--  - déclenchée seulement quand best_reply_id passe à une valeur non nulle (ou change).
--  - garde anti-auto-notif : auteur de la réponse == auteur du thread -> rien.
--  - garde is_private.
CREATE OR REPLACE FUNCTION public.notify_best_reply()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  reply_author uuid;
  ev_name text; ev_private boolean;
  thread_author_name text;
BEGIN
  IF NEW.best_reply_id IS NULL OR NEW.best_reply_id IS NOT DISTINCT FROM OLD.best_reply_id THEN
    RETURN NEW;
  END IF;

  SELECT r.actor_id INTO reply_author
    FROM event_thread_replies r WHERE r.id = NEW.best_reply_id;
  IF reply_author IS NULL OR reply_author = NEW.actor_id THEN
    RETURN NEW;                         -- l'auteur du thread élit sa propre réponse
  END IF;

  SELECT e.name, e.is_private INTO ev_name, ev_private FROM events e WHERE e.id = NEW.event_id;
  IF ev_private THEN RETURN NEW; END IF;

  SELECT COALESCE(label, 'L''auteur') INTO thread_author_name
    FROM actor_public WHERE actor_id = NEW.actor_id;

  INSERT INTO notifications (actor_id, type, data)
  VALUES (
    reply_author, 'best_reply',
    jsonb_build_object(
      'actor_id', NEW.actor_id, 'actor_name', thread_author_name,
      'event_id', NEW.event_id, 'event_name', ev_name,
      'thread_id', NEW.id, 'thread_title', NEW.title
    )
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_best_reply ON event_threads;
CREATE TRIGGER on_best_reply
  AFTER UPDATE OF best_reply_id ON event_threads
  FOR EACH ROW EXECUTE FUNCTION notify_best_reply();
```

- [ ] **Step 2: Pousser**

Run: `supabase db push`
Expected: appliquée sans erreur.

- [ ] **Step 3: Vérifier les triggers**

Run: `supabase db execute --sql "SELECT tgname FROM pg_trigger WHERE tgname IN ('on_thread_reply','on_best_reply');"`
Expected: deux lignes.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260721140100_event_thread_notif.sql
git commit -m "feat(db): triggers notify_thread_reply + notify_best_reply"
```

---

### Task 4: Migration — cibles de signalement `content_reports`

**Files:**
- Create: `supabase/migrations/20260721140200_content_reports_thread_targets.sql`

**Interfaces:**
- Produces (DB) : `content_reports.target_type` accepte `'event_thread'` et `'event_thread_reply'`.

- [ ] **Step 1: Écrire la migration**

Le `target_type` est contraint par un CHECK ; on le remplace :

```sql
-- Étendre les cibles de signalement aux threads de discussion et à leurs réponses.
ALTER TABLE public.content_reports DROP CONSTRAINT IF EXISTS content_reports_target_type_check;
ALTER TABLE public.content_reports
  ADD CONSTRAINT content_reports_target_type_check
  CHECK (target_type IN ('event', 'profile', 'event_thread', 'event_thread_reply'));
```

- [ ] **Step 2: Pousser**

Run: `supabase db push`
Expected: appliquée sans erreur.

- [ ] **Step 3: Vérifier**

Run: `supabase db execute --sql "INSERT INTO public.content_reports (reporter_actor_id, reporter_auth_id, target_type, target_id, reason) VALUES (gen_random_uuid(), gen_random_uuid(), 'event_thread', gen_random_uuid(), 'spam'); ROLLBACK;"`
Expected: pas d'erreur de contrainte CHECK (l'INSERT est valide ; le ROLLBACK annule). Si `db execute` n'ouvre pas de transaction implicite, tester via SQL editor et supprimer la ligne test.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260721140200_content_reports_thread_targets.sql
git commit -m "feat(db): content_reports cibles event_thread + event_thread_reply"
```

---

### Task 5: Régénérer les types Supabase

**Files:**
- Modify: `src/types/supabase.ts`

**Interfaces:**
- Produces : types TS des nouvelles tables. Fallback documenté : caster `supabase.from(...) as any` (précédent projet, `reference_supabase_rpc_types`) si la régénération n'est pas possible.

- [ ] **Step 1: Régénérer**

Run: `supabase gen types typescript --linked > src/types/supabase.ts`
Expected: `event_threads`, `event_thread_replies` apparaissent dans le fichier.

- [ ] **Step 2: Vérifier la présence**

Run: `grep -c "event_thread" src/types/supabase.ts`
Expected: > 0. Si la régénération échoue (auth CLI), **ne pas bloquer** : les hooks casteront `as any` (voir Tasks 7). Noter ce choix dans le commit.

- [ ] **Step 3: Commit**

```bash
git add src/types/supabase.ts
git commit -m "chore(types): régénère types Supabase (event_threads)"
```

---

### Task 6: Fonctions pures `lib/event-threads.ts` (TDD)

**Files:**
- Create: `src/lib/event-threads.ts`
- Test: `src/lib/event-threads.test.ts`

**Interfaces:**
- Produces :
  - `type ThreadAudience = 'festivalier' | 'exposant' | 'organisateur'`
  - `type ThreadActor = { id: string; kind: 'person' | 'entity'; entityType?: string | null } | null`
  - `deriveAudience(actor: ThreadActor): ThreadAudience | null`
  - `visibleChannels(opts: { hasPerson: boolean; entityTypes: string[] }): ThreadAudience[]`
  - `canAsk(actor: ThreadActor): boolean`
  - `canReply(actor: ThreadActor): boolean`
  - `canEdit(actor: ThreadActor, content: { actor_id: string }): boolean`
  - `canDelete(actor: ThreadActor, content: { actor_id: string }, isAdmin: boolean): boolean`
  - `canMarkBest(actor: ThreadActor, thread: { actor_id: string }): boolean`
  - `isSolved(thread: { best_reply_id: string | null }): boolean`
  - `sortReplies<T extends { id: string; created_at: string }>(rows: T[], bestReplyId: string | null): T[]`
  - `sortThreads<T extends { created_at: string }>(rows: T[]): T[]`
  - `filterByChannels<T extends { audience: ThreadAudience }>(rows: T[], active: ThreadAudience[]): T[]`
  - `channelLabel(a: ThreadAudience): string`

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/lib/event-threads.test.ts` :

```ts
import { describe, it, expect } from 'vitest'
import {
  deriveAudience, visibleChannels, canAsk, canReply, canEdit, canDelete,
  canMarkBest, isSolved, sortReplies, sortThreads, filterByChannels, channelLabel,
} from './event-threads'

describe('deriveAudience', () => {
  it('personne -> festivalier', () => {
    expect(deriveAudience({ id: 'p', kind: 'person' })).toBe('festivalier')
  })
  it('entité exposant -> exposant', () => {
    expect(deriveAudience({ id: 'e', kind: 'entity', entityType: 'exposant' })).toBe('exposant')
  })
  it('entité festival -> organisateur', () => {
    expect(deriveAudience({ id: 'e', kind: 'entity', entityType: 'festival' })).toBe('organisateur')
  })
  it('entité entreprise -> null (ne peut pas poster)', () => {
    expect(deriveAudience({ id: 'e', kind: 'entity', entityType: 'entreprise' })).toBeNull()
  })
  it('non connecté -> null', () => {
    expect(deriveAudience(null)).toBeNull()
  })
})

describe('visibleChannels', () => {
  it('festivalier pur : un seul canal', () => {
    expect(visibleChannels({ hasPerson: true, entityTypes: [] })).toEqual(['festivalier'])
  })
  it('exposant : les deux canaux (a toujours un compte perso)', () => {
    expect(visibleChannels({ hasPerson: true, entityTypes: ['exposant'] })).toEqual(['festivalier', 'exposant'])
  })
  it('festival : festivalier + organisateur', () => {
    expect(visibleChannels({ hasPerson: true, entityTypes: ['festival'] })).toEqual(['festivalier', 'organisateur'])
  })
})

describe('canAsk / canReply', () => {
  it('canAsk vrai pour une personne', () => {
    expect(canAsk({ id: 'p', kind: 'person' })).toBe(true)
  })
  it('canAsk faux pour une entreprise', () => {
    expect(canAsk({ id: 'e', kind: 'entity', entityType: 'entreprise' })).toBe(false)
  })
  it('canReply vrai pour tout acteur connecté (cross-canal)', () => {
    expect(canReply({ id: 'p', kind: 'person' })).toBe(true)
    expect(canReply(null)).toBe(false)
  })
})

describe('canEdit / canDelete / canMarkBest', () => {
  const me = { id: 'a1', kind: 'person' as const }
  it('canEdit seulement son propre contenu', () => {
    expect(canEdit(me, { actor_id: 'a1' })).toBe(true)
    expect(canEdit(me, { actor_id: 'a2' })).toBe(false)
  })
  it('canDelete son contenu ou si admin', () => {
    expect(canDelete(me, { actor_id: 'a2' }, false)).toBe(false)
    expect(canDelete(me, { actor_id: 'a2' }, true)).toBe(true)
    expect(canDelete(me, { actor_id: 'a1' }, false)).toBe(true)
  })
  it('canMarkBest seulement pour l\'auteur du thread', () => {
    expect(canMarkBest(me, { actor_id: 'a1' })).toBe(true)
    expect(canMarkBest(me, { actor_id: 'a2' })).toBe(false)
  })
})

describe('isSolved', () => {
  it('résolu si best_reply_id non nul', () => {
    expect(isSolved({ best_reply_id: 'r1' })).toBe(true)
    expect(isSolved({ best_reply_id: null })).toBe(false)
  })
})

describe('sortReplies', () => {
  it('meilleure réponse en tête, puis chrono', () => {
    const rows = [
      { id: 'r1', created_at: '2026-01-01T10:00:00Z' },
      { id: 'r2', created_at: '2026-01-01T09:00:00Z' },
      { id: 'r3', created_at: '2026-01-01T11:00:00Z' },
    ]
    expect(sortReplies(rows, 'r3').map(r => r.id)).toEqual(['r3', 'r2', 'r1'])
  })
  it('sans meilleure réponse : chrono ascendant', () => {
    const rows = [
      { id: 'r1', created_at: '2026-01-01T10:00:00Z' },
      { id: 'r2', created_at: '2026-01-01T09:00:00Z' },
    ]
    expect(sortReplies(rows, null).map(r => r.id)).toEqual(['r2', 'r1'])
  })
})

describe('sortThreads', () => {
  it('plus récent d\'abord', () => {
    const rows = [
      { created_at: '2026-01-01T09:00:00Z' },
      { created_at: '2026-01-01T11:00:00Z' },
    ]
    expect(sortThreads(rows)[0].created_at).toBe('2026-01-01T11:00:00Z')
  })
})

describe('filterByChannels', () => {
  it('ne garde que les canaux actifs', () => {
    const rows = [
      { audience: 'festivalier' as const },
      { audience: 'exposant' as const },
    ]
    expect(filterByChannels(rows, ['festivalier'])).toEqual([{ audience: 'festivalier' }])
  })
})

describe('channelLabel', () => {
  it('libellés FR', () => {
    expect(channelLabel('festivalier')).toBe('Festivaliers')
    expect(channelLabel('exposant')).toBe('Exposants')
    expect(channelLabel('organisateur')).toBe('Organisateurs')
  })
})
```

- [ ] **Step 2: Lancer les tests → échec attendu**

Run: `pnpm vitest run src/lib/event-threads.test.ts`
Expected: FAIL (module `./event-threads` introuvable).

- [ ] **Step 3: Écrire l'implémentation minimale**

Créer `src/lib/event-threads.ts` :

```ts
export type ThreadAudience = 'festivalier' | 'exposant' | 'organisateur'
export type ThreadActor = { id: string; kind: 'person' | 'entity'; entityType?: string | null } | null

/** Canal dans lequel un nouvel élément posté par cet acteur atterrit. null = ne peut pas poster de thread. */
export function deriveAudience(actor: ThreadActor): ThreadAudience | null {
  if (!actor) return null
  if (actor.kind === 'person') return 'festivalier'
  if (actor.entityType === 'exposant') return 'exposant'
  if (actor.entityType === 'festival') return 'organisateur'
  return null // entreprise, etc.
}

/** Canaux proposés en toggles selon les types de compte possédés. Ordre stable. */
export function visibleChannels(opts: { hasPerson: boolean; entityTypes: string[] }): ThreadAudience[] {
  const chans: ThreadAudience[] = []
  if (opts.hasPerson) chans.push('festivalier')
  if (opts.entityTypes.includes('exposant')) chans.push('exposant')
  if (opts.entityTypes.includes('festival')) chans.push('organisateur')
  return chans
}

export function canAsk(actor: ThreadActor): boolean {
  return deriveAudience(actor) !== null
}

/** Répondre est ouvert à tout acteur connecté (participation cross-canal). */
export function canReply(actor: ThreadActor): boolean {
  return !!actor
}

export function canEdit(actor: ThreadActor, content: { actor_id: string }): boolean {
  return !!actor && actor.id === content.actor_id
}

export function canDelete(actor: ThreadActor, content: { actor_id: string }, isAdmin: boolean): boolean {
  if (!actor) return false
  return actor.id === content.actor_id || isAdmin
}

/** Seul l'auteur du thread élit la meilleure réponse. */
export function canMarkBest(actor: ThreadActor, thread: { actor_id: string }): boolean {
  return !!actor && actor.id === thread.actor_id
}

export function isSolved(thread: { best_reply_id: string | null }): boolean {
  return thread.best_reply_id != null
}

/** Meilleure réponse en tête, puis chronologique ascendant. Non mutant. */
export function sortReplies<T extends { id: string; created_at: string }>(rows: T[], bestReplyId: string | null): T[] {
  return [...rows].sort((a, b) => {
    if (bestReplyId) {
      if (a.id === bestReplyId) return -1
      if (b.id === bestReplyId) return 1
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

/** Plus récent d'abord. Non mutant. */
export function sortThreads<T extends { created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function filterByChannels<T extends { audience: ThreadAudience }>(rows: T[], active: ThreadAudience[]): T[] {
  return rows.filter(t => active.includes(t.audience))
}

const CHANNEL_LABELS: Record<ThreadAudience, string> = {
  festivalier: 'Festivaliers',
  exposant: 'Exposants',
  organisateur: 'Organisateurs',
}
export function channelLabel(a: ThreadAudience): string {
  return CHANNEL_LABELS[a]
}
```

- [ ] **Step 4: Lancer les tests → succès attendu**

Run: `pnpm vitest run src/lib/event-threads.test.ts`
Expected: PASS (tous les cas verts).

- [ ] **Step 5: Commit**

```bash
git add src/lib/event-threads.ts src/lib/event-threads.test.ts
git commit -m "feat(discussion): fonctions pures event-threads + tests"
```

---

### Task 7: Hooks `use-event-threads` + `use-thread-replies`

**Files:**
- Create: `src/hooks/use-event-threads.ts`
- Create: `src/hooks/use-thread-replies.ts`

**Interfaces:**
- Consumes : `supabase` client, vue `actor_public(actor_id, label, avatar_url, public_slug)`, types de `lib/event-threads`.
- Produces :
  - `useEventThreads(eventId)` → `{ threads: ThreadWithActor[]; loading; refetch }`
  - `type ThreadWithActor` (voir code)
  - `createThread(input)`, `updateThread(id, patch)`, `deleteThread(id)`, `markBestReply(threadId, replyId)`
  - `useThreadReplies(threadId)` → `{ replies: ThreadReplyWithActor[]; loading; refetch }`
  - `type ThreadReplyWithActor`
  - `createThreadReply(input)`, `updateThreadReply(id, body)`, `deleteThreadReply(id)`

- [ ] **Step 1: Écrire `use-event-threads.ts`**

On calque `use-review-replies.ts` (même `attachActors` via `actor_public`). `reply_count` calculé par une requête légère. `supabase.from(...) as any` si les types ne connaissent pas encore les tables (fallback Task 5).

```ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { sortThreads, type ThreadAudience } from '@/lib/event-threads'

export type ThreadWithActor = {
  id: string
  event_id: string
  actor_id: string
  audience: ThreadAudience
  title: string
  body: string | null
  best_reply_id: string | null
  created_at: string
  updated_at: string
  reply_count: number
  actor_label: string | null
  actor_avatar_url: string | null
  actor_slug: string | null
}

async function actorMap(actorIds: string[]) {
  const ids = [...new Set(actorIds)]
  if (ids.length === 0) return {} as Record<string, { label: string | null; avatar_url: string | null; public_slug: string | null }>
  const { data } = await supabase
    .from('actor_public').select('actor_id, label, avatar_url, public_slug').in('actor_id', ids)
  return Object.fromEntries(
    (data ?? [])
      .filter((a: { actor_id: string | null }) => a.actor_id != null)
      .map((a: { actor_id: string; label: string | null; avatar_url: string | null; public_slug: string | null }) =>
        [a.actor_id, { label: a.label, avatar_url: a.avatar_url, public_slug: a.public_slug }]),
  )
}

export function useEventThreads(eventId: string) {
  const [threads, setThreads] = useState<ThreadWithActor[]>([])
  const [loading, setLoading] = useState(true)

  const fetchThreads = useCallback(async () => {
    const { data } = await (supabase.from('event_threads') as any)
      .select('*').eq('event_id', eventId)
    const rows = (data as Array<Record<string, unknown>> | null) ?? []

    // comptage des réponses par thread (requête légère : ids seuls)
    const threadIds = rows.map(r => r.id as string)
    const counts: Record<string, number> = {}
    if (threadIds.length > 0) {
      const { data: rep } = await (supabase.from('event_thread_replies') as any)
        .select('thread_id').in('thread_id', threadIds)
      for (const r of (rep as Array<{ thread_id: string }> | null) ?? []) {
        counts[r.thread_id] = (counts[r.thread_id] ?? 0) + 1
      }
    }

    const map = await actorMap(rows.map(r => r.actor_id as string))
    const enriched: ThreadWithActor[] = rows.map(r => ({
      id: r.id as string,
      event_id: r.event_id as string,
      actor_id: r.actor_id as string,
      audience: r.audience as ThreadAudience,
      title: r.title as string,
      body: (r.body as string | null) ?? null,
      best_reply_id: (r.best_reply_id as string | null) ?? null,
      created_at: r.created_at as string,
      updated_at: r.updated_at as string,
      reply_count: counts[r.id as string] ?? 0,
      actor_label: map[r.actor_id as string]?.label ?? null,
      actor_avatar_url: map[r.actor_id as string]?.avatar_url ?? null,
      actor_slug: map[r.actor_id as string]?.public_slug ?? null,
    }))
    setThreads(sortThreads(enriched))
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchThreads()
  }, [fetchThreads])

  return { threads, loading, refetch: fetchThreads }
}

export async function createThread(input: {
  event_id: string; actor_id: string; acted_by_user_id: string | null
  audience: ThreadAudience; title: string; body: string | null
}) {
  const { data, error } = await (supabase.from('event_threads') as any).insert(input).select('*').single()
  return { data, error }
}

export async function updateThread(id: string, patch: { title?: string; body?: string | null }) {
  const { data, error } = await (supabase.from('event_threads') as any)
    .update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select('*').single()
  return { data, error }
}

export async function deleteThread(id: string) {
  const { error } = await (supabase.from('event_threads') as any).delete().eq('id', id)
  return { error }
}

/** Élire (ou changer) la meilleure réponse. replyId null = désélectionner. */
export async function markBestReply(threadId: string, replyId: string | null) {
  const { data, error } = await (supabase.from('event_threads') as any)
    .update({ best_reply_id: replyId }).eq('id', threadId).select('*').single()
  return { data, error }
}
```

- [ ] **Step 2: Écrire `use-thread-replies.ts`**

```ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export type ThreadReplyWithActor = {
  id: string
  thread_id: string
  actor_id: string
  body: string
  created_at: string
  updated_at: string
  actor_label: string | null
  actor_avatar_url: string | null
  actor_slug: string | null
}

export function useThreadReplies(threadId: string) {
  const [replies, setReplies] = useState<ThreadReplyWithActor[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReplies = useCallback(async () => {
    const { data } = await (supabase.from('event_thread_replies') as any)
      .select('*').eq('thread_id', threadId)
    const rows = (data as Array<Record<string, unknown>> | null) ?? []
    const ids = [...new Set(rows.map(r => r.actor_id as string))]
    let byId: Record<string, { label: string | null; avatar_url: string | null; public_slug: string | null }> = {}
    if (ids.length > 0) {
      const { data: actors } = await supabase
        .from('actor_public').select('actor_id, label, avatar_url, public_slug').in('actor_id', ids)
      byId = Object.fromEntries(
        (actors ?? [])
          .filter((a: { actor_id: string | null }) => a.actor_id != null)
          .map((a: { actor_id: string; label: string | null; avatar_url: string | null; public_slug: string | null }) =>
            [a.actor_id, { label: a.label, avatar_url: a.avatar_url, public_slug: a.public_slug }]),
      )
    }
    setReplies(rows.map(r => ({
      id: r.id as string,
      thread_id: r.thread_id as string,
      actor_id: r.actor_id as string,
      body: r.body as string,
      created_at: r.created_at as string,
      updated_at: r.updated_at as string,
      actor_label: byId[r.actor_id as string]?.label ?? null,
      actor_avatar_url: byId[r.actor_id as string]?.avatar_url ?? null,
      actor_slug: byId[r.actor_id as string]?.public_slug ?? null,
    })))
    setLoading(false)
  }, [threadId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReplies()
  }, [fetchReplies])

  return { replies, loading, refetch: fetchReplies }
}

export async function createThreadReply(input: {
  thread_id: string; actor_id: string; acted_by_user_id: string | null; body: string
}) {
  const { data, error } = await (supabase.from('event_thread_replies') as any).insert(input).select('*').single()
  return { data, error }
}

export async function updateThreadReply(id: string, body: string) {
  const { data, error } = await (supabase.from('event_thread_replies') as any)
    .update({ body, updated_at: new Date().toISOString() }).eq('id', id).select('*').single()
  return { data, error }
}

export async function deleteThreadReply(id: string) {
  const { error } = await (supabase.from('event_thread_replies') as any).delete().eq('id', id)
  return { error }
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm build`
Expected: pas d'erreur TS liée aux hooks (les composants ne les consomment pas encore ; build doit passer).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-event-threads.ts src/hooks/use-thread-replies.ts
git commit -m "feat(discussion): hooks CRUD threads + réponses"
```

---

### Task 8: CSS de la Discussion

**Files:**
- Modify: `src/pages/EventPage.css` (ajouter les classes `disc-*`, retirer/garder les `fest-disc-*` du teaser au choix du composant)

**Interfaces:**
- Produces : classes CSS `.disc`, `.disc-toggles`, `.disc-tg`, `.disc-ask`, `.disc-thread`, `.disc-chan`, `.disc-solved`, `.disc-best`, `.disc-mark`, `.disc-reply`, `.disc-compose` (mappées 1:1 sur la maquette hi-fi).

- [ ] **Step 1: Ajouter les styles**

Ajouter à la fin de `src/pages/EventPage.css` (valeurs reprises de la maquette validée, en tokens DA réels) :

```css
/* ---- Discussion du festival (onglet Questions) ---- */
.disc { display:flex; flex-direction:column; gap:14px; }
.disc-toggles { display:flex; gap:8px; flex-wrap:wrap; }
.disc-tg { display:inline-flex; align-items:center; gap:7px; background:var(--surface);
  border:1px solid var(--border-color, hsl(var(--border))); border-radius:999px; padding:7px 13px;
  font-size:12.5px; font-weight:600; color:var(--font-color-lowtitle); cursor:pointer; transition:.16s; }
.disc-tg.on { color:var(--font-color-text);
  border-color:color-mix(in srgb, var(--accent-app) 55%, transparent);
  background:color-mix(in srgb, var(--accent-app) 12%, var(--surface)); }
.disc-tg .sw { width:8px; height:8px; border-radius:50%; }
.disc-ask { display:flex; align-items:center; gap:11px; padding:13px 15px; border-radius:14px; cursor:text; }
.disc-ask .ph { color:var(--font-color-lowtitle); flex:1; font-size:14px; }
.disc-thread { border-radius:16px; overflow:hidden; }
.disc-t-main { padding:15px 16px; }
.disc-t-top { display:flex; align-items:center; gap:8px; margin-bottom:9px; font-size:11px; }
.disc-chan { font-weight:700; padding:2px 9px; border-radius:999px; display:inline-flex; align-items:center; gap:5px; }
.disc-chan .sw { width:7px; height:7px; border-radius:50%; }
.disc-chan.festivalier { color:#8bb5e0; border:1px solid color-mix(in srgb,#8bb5e0 40%, transparent); }
.disc-chan.festivalier .sw { background:#8bb5e0; }
.disc-chan.exposant { color:var(--copper); border:1px solid color-mix(in srgb,var(--copper) 40%, transparent); }
.disc-chan.exposant .sw { background:var(--copper); }
.disc-chan.organisateur { color:var(--forest); border:1px solid color-mix(in srgb,var(--forest) 40%, transparent); }
.disc-chan.organisateur .sw { background:var(--forest); }
.disc-solved { margin-left:auto; display:inline-flex; align-items:center; gap:5px; color:var(--forest);
  font-weight:700; border:1px solid color-mix(in srgb,var(--forest) 42%, transparent); border-radius:999px; padding:2px 9px; }
.disc-q-title { font-family:var(--font-heading); font-weight:700; font-size:17px; line-height:1.32; margin-bottom:5px; }
.disc-q-body { color:var(--font-color-lowtitle); font-size:13.5px; line-height:1.55; margin-bottom:11px; }
.disc-q-foot { display:flex; align-items:center; gap:9px; font-size:12px; color:var(--font-color-lowtitle); }
.disc-replies { border-top:1px solid color-mix(in srgb, hsl(var(--border)) 70%, transparent);
  background:rgba(0,0,0,.14); padding:6px 16px 14px; }
.light .disc-replies { background:rgba(0,0,0,.03); }
.disc-best { background:color-mix(in srgb,var(--forest) 11%, transparent);
  border:1px solid color-mix(in srgb,var(--forest) 30%, transparent); border-radius:12px; padding:11px 12px; margin:8px 0 4px; }
.disc-mark { font-size:11px; font-weight:600; color:var(--font-color-lowtitle);
  border:1px solid hsl(var(--border)); border-radius:999px; padding:3px 9px; cursor:pointer; transition:.15s; }
.disc-mark:hover { color:var(--forest); border-color:color-mix(in srgb,var(--forest) 45%, transparent); }
.disc-compose { display:flex; align-items:center; gap:9px; margin-top:12px; background:var(--surface);
  border:1px solid hsl(var(--border)); border-radius:999px; padding:6px 7px 6px 13px; }
.disc-compose input { flex:1; background:none; border:none; color:var(--font-color-text);
  font-family:var(--font-body); font-size:13px; outline:none; }
.disc-ctx { font-size:10.5px; color:var(--font-color-lowtitle); text-align:right; margin-top:6px; }
```

- [ ] **Step 2: Vérifier le build CSS**

Run: `pnpm build`
Expected: build OK (CSS valide, aucun token cassé).

- [ ] **Step 3: Commit**

```bash
git add src/pages/EventPage.css
git commit -m "style(discussion): classes DA de l'onglet Questions"
```

---

### Task 9: Composant `ThreadReplies` (fil + meilleure réponse + composer)

**Files:**
- Create: `src/components/events/ThreadReplies.tsx`

**Interfaces:**
- Consumes : `useThreadReplies`, `createThreadReply`, `updateThreadReply`, `deleteThreadReply`, `markBestReply`, `canReply/canEdit/canDelete/canMarkBest/sortReplies` de `lib/event-threads`, `useAuth`, `ReportButton`.
- Produces : `<ThreadReplies thread={ThreadWithActor} onChanged={() => void} />` — affiche le fil plat, la meilleure réponse épinglée, les actions, le composer.

- [ ] **Step 1: Écrire le composant**

```tsx
import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { ReportButton } from '@/components/reports/ReportButton'
import {
  useThreadReplies, createThreadReply, updateThreadReply, deleteThreadReply,
  type ThreadReplyWithActor,
} from '@/hooks/use-thread-replies'
import { markBestReply, type ThreadWithActor } from '@/hooks/use-event-threads'
import { canReply, canEdit, canDelete, canMarkBest, sortReplies } from '@/lib/event-threads'

function timeAgo(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function ThreadReplies({ thread, onChanged }: { thread: ThreadWithActor; onChanged: () => void }) {
  const { currentActor, isAdmin } = useAuth()
  const { replies, loading, refetch } = useThreadReplies(thread.id)
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')

  const actor = currentActor ? { id: currentActor.id, kind: currentActor.kind, entityType: currentActor.entityType } : null
  const ordered = sortReplies(replies, thread.best_reply_id)

  async function submit() {
    const body = draft.trim()
    if (!body || !currentActor) return
    await createThreadReply({
      thread_id: thread.id, actor_id: currentActor.id,
      acted_by_user_id: currentActor.kind === 'entity' ? null : currentActor.id, body,
    })
    setDraft(''); await refetch(); onChanged()
  }

  async function saveEdit(id: string) {
    const body = editBody.trim()
    if (!body) return
    await updateThreadReply(id, body); setEditingId(null); await refetch()
  }

  async function remove(id: string) {
    await deleteThreadReply(id); await refetch(); onChanged()
  }

  async function elect(replyId: string) {
    await markBestReply(thread.id, thread.best_reply_id === replyId ? null : replyId)
    onChanged()
  }

  if (loading) return <div className="disc-replies"><p className="disc-ctx">Chargement…</p></div>

  return (
    <div className="disc-replies">
      {ordered.map(r => {
        const isBest = r.id === thread.best_reply_id
        return (
          <ReplyRow
            key={r.id} reply={r} isBest={isBest} eventOwnerActorId={r.actor_id}
            editing={editingId === r.id} editBody={editBody} setEditBody={setEditBody}
            onStartEdit={() => { setEditingId(r.id); setEditBody(r.body) }}
            onSaveEdit={() => saveEdit(r.id)} onCancelEdit={() => setEditingId(null)}
            onDelete={() => remove(r.id)} onElect={() => elect(r.id)}
            canEditThis={canEdit(actor, r)} canDeleteThis={canDelete(actor, r, isAdmin)}
            canMarkThis={canMarkBest(actor, thread)}
          />
        )
      })}

      {canReply(actor) && (
        <>
          <div className="disc-compose">
            <input
              value={draft} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit() }}
              placeholder="Ajouter une réponse…" maxLength={2000}
            />
            <button className="da-btn da-btn-flat" onClick={submit} aria-label="Envoyer">↑</button>
          </div>
          {currentActor && (
            <p className="disc-ctx">tu réponds en tant que <b style={{ color: 'var(--copper)' }}>{currentActor.label}</b></p>
          )}
        </>
      )}
    </div>
  )
}

function ReplyRow(props: {
  reply: ThreadReplyWithActor; isBest: boolean; eventOwnerActorId: string
  editing: boolean; editBody: string; setEditBody: (v: string) => void
  onStartEdit: () => void; onSaveEdit: () => void; onCancelEdit: () => void
  onDelete: () => void; onElect: () => void
  canEditThis: boolean; canDeleteThis: boolean; canMarkThis: boolean
}) {
  const { reply: r, isBest } = props
  const { currentActor } = useAuth()
  const edited = r.updated_at !== r.created_at
  return (
    <div className={isBest ? 'disc-best' : 'disc-reply'} style={{ padding: isBest ? undefined : '11px 0', display: 'flex', gap: 10 }}>
      <div className="r-body" style={{ flex: 1 }}>
        <div className="r-name" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          {r.actor_label ?? 'Quelqu\'un'}
          {isBest && <span style={{ fontSize: 10, color: 'var(--forest)', border: '1px solid color-mix(in srgb,var(--forest) 45%,transparent)', borderRadius: 999, padding: '1px 7px' }}>✓ meilleure réponse</span>}
          <span style={{ color: 'var(--font-color-lowtitle)', fontWeight: 500, fontSize: 11 }}>{timeAgo(r.created_at)}{edited ? ' · modifié' : ''}</span>
          {!isBest && props.canMarkThis && <span className="disc-mark" onClick={props.onElect}>✓ marquer la bonne</span>}
        </div>
        {props.editing ? (
          <div style={{ marginTop: 6 }}>
            <textarea value={props.editBody} onChange={e => props.setEditBody(e.target.value)} maxLength={2000}
              style={{ width: '100%', background: 'var(--surface)', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'var(--font-color-text)', padding: 8, fontFamily: 'var(--font-body)', fontSize: 13 }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button className="da-btn da-btn-flat" onClick={props.onSaveEdit}>Enregistrer</button>
              <button className="da-btn" onClick={props.onCancelEdit}>Annuler</button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13.5, lineHeight: 1.5, marginTop: 2 }}>{r.body}</div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 11 }}>
          {props.canEditThis && !props.editing && <button className="disc-mark" onClick={props.onStartEdit}>Éditer</button>}
          {props.canDeleteThis && <button className="disc-mark" onClick={props.onDelete}>Supprimer</button>}
          <ReportButton targetType={'event_thread_reply' as any} targetId={r.id} targetLabel="cette réponse"
            targetOwnerId={r.actor_id} title="Signaler cette réponse" />
        </div>
      </div>
    </div>
  )
}
```

> Note : `ReportButton` reçoit `targetType={'event_thread_reply' as any}` en attendant l'élargissement du type en Task 12 (après quoi le cast `as any` est retiré).

- [ ] **Step 2: Typecheck**

Run: `pnpm build`
Expected: build OK.

- [ ] **Step 3: Commit**

```bash
git add src/components/events/ThreadReplies.tsx
git commit -m "feat(discussion): fil de réponses + meilleure réponse + composer"
```

---

### Task 10: Composant `DiscussionFestival` (conteneur) + branchement `EventPage`

**Files:**
- Create: `src/components/events/DiscussionFestival.tsx`
- Modify: `src/pages/EventPage.tsx` (remplacer `<DiscussionTeaser />` par `<DiscussionFestival event={event} />`, retirer l'import du teaser)
- Delete (optionnel): `src/components/events/DiscussionTeaser.tsx` (une fois inutilisé)

**Interfaces:**
- Consumes : `useEventThreads`, `createThread`, `updateThread`, `deleteThread`, `visibleChannels`, `deriveAudience`, `canAsk`, `filterByChannels`, `channelLabel`, `isSolved`, `useAuth`, `ThreadReplies`, `ReportButton`.
- Produces : `<DiscussionFestival event={{ id: string; name?: string; participant_count?: number }} />`.

- [ ] **Step 1: Écrire le conteneur**

```tsx
import { useMemo, useState } from 'react'
import { MessageSquare, HelpCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { ReportButton } from '@/components/reports/ReportButton'
import { ThreadReplies } from '@/components/events/ThreadReplies'
import {
  useEventThreads, createThread, updateThread, deleteThread, type ThreadWithActor,
} from '@/hooks/use-event-threads'
import {
  visibleChannels, deriveAudience, canAsk, canEdit, canDelete,
  filterByChannels, channelLabel, isSolved, type ThreadAudience,
} from '@/lib/event-threads'

export function DiscussionFestival({ event }: { event: { id: string; name?: string; participant_count?: number } }) {
  const { currentActor, person, entities, isAdmin } = useAuth()
  const { threads, loading, refetch } = useEventThreads(event.id)

  const channels = useMemo(
    () => visibleChannels({ hasPerson: !!person, entityTypes: entities.map(e => e.type) }),
    [person, entities],
  )
  const [active, setActive] = useState<ThreadAudience[]>(channels)
  const shown = channels.length > 1 ? active : channels // toggles seulement si >1 canal

  const [askOpen, setAskOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const actor = currentActor ? { id: currentActor.id, kind: currentActor.kind, entityType: currentActor.entityType } : null
  const postAudience = deriveAudience(actor)
  const visibleThreads = filterByChannels(threads, shown)

  function toggle(ch: ThreadAudience) {
    setActive(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch])
  }

  async function ask() {
    const t = title.trim()
    if (!t || !currentActor || !postAudience) return
    await createThread({
      event_id: event.id, actor_id: currentActor.id,
      acted_by_user_id: currentActor.kind === 'entity' ? null : currentActor.id,
      audience: postAudience, title: t, body: body.trim() || null,
    })
    setTitle(''); setBody(''); setAskOpen(false); await refetch()
  }

  return (
    <div className="glass-card disc" style={{ padding: 18 }}>
      <div className="event-section-title"><MessageSquare strokeWidth={1.8} /> Discussion du festival</div>

      {channels.length > 1 && (
        <div className="disc-toggles">
          {channels.map(ch => (
            <button key={ch} className={`disc-tg${shown.includes(ch) ? ' on' : ''}`} onClick={() => toggle(ch)}>
              <span className="sw" style={{ background: ch === 'festivalier' ? '#8bb5e0' : ch === 'exposant' ? 'var(--copper)' : 'var(--forest)' }} />
              {channelLabel(ch)}
            </button>
          ))}
        </div>
      )}

      {canAsk(actor) && (
        askOpen ? (
          <div className="glass-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={140}
              placeholder="Ta question (ex. Le montage se fait la veille ?)"
              style={{ background: 'var(--surface)', border: '1px solid hsl(var(--border))', borderRadius: 10, color: 'var(--font-color-text)', padding: '10px 12px', fontFamily: 'var(--font-heading)', fontWeight: 600 }} />
            <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={2000}
              placeholder="Détaille si besoin (optionnel)"
              style={{ background: 'var(--surface)', border: '1px solid hsl(var(--border))', borderRadius: 10, color: 'var(--font-color-text)', padding: '10px 12px', minHeight: 60, fontFamily: 'var(--font-body)' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="da-btn da-btn-flat" onClick={ask}>Poser dans « {postAudience ? channelLabel(postAudience) : ''} »</button>
              <button className="da-btn" onClick={() => setAskOpen(false)}>Annuler</button>
            </div>
          </div>
        ) : (
          <div className="glass-card disc-ask" onClick={() => setAskOpen(true)}>
            <span className="ph">Pose ta question sur le festival…</span>
            <span className="da-btn da-btn-flat">Poser</span>
          </div>
        )
      )}

      {loading ? (
        <p className="disc-ctx">Chargement…</p>
      ) : visibleThreads.length === 0 ? (
        <p className="disc-q-body">Aucune question pour l'instant — lance la première 👀</p>
      ) : (
        visibleThreads.map(t => (
          <ThreadCard
            key={t.id} thread={t} open={openId === t.id}
            onToggle={() => setOpenId(openId === t.id ? null : t.id)}
            onChanged={refetch}
            canEditThis={canEdit(actor, t)} canDeleteThis={canDelete(actor, t, isAdmin)}
          />
        ))
      )}
    </div>
  )
}

function ThreadCard({ thread, open, onToggle, onChanged, canEditThis, canDeleteThis }: {
  thread: ThreadWithActor; open: boolean; onToggle: () => void; onChanged: () => void
  canEditThis: boolean; canDeleteThis: boolean
}) {
  const solved = isSolved(thread)
  return (
    <div className="glass-card disc-thread">
      <div className="disc-t-main" onClick={onToggle} style={{ cursor: 'pointer' }}>
        <div className="disc-t-top">
          <span className={`disc-chan ${thread.audience}`}><span className="sw" />{channelLabel(thread.audience)}</span>
          {solved && <span className="disc-solved">✓ Résolu</span>}
        </div>
        <div className="disc-q-title">{thread.title}</div>
        {open && thread.body && <div className="disc-q-body">{thread.body}</div>}
        <div className="disc-q-foot">
          {thread.reply_count > 0
            ? <span><b style={{ color: 'var(--accent-app)' }}>{thread.reply_count}</b> réponse{thread.reply_count > 1 ? 's' : ''}</span>
            : <span>Sans réponse · sois le premier à aider</span>}
          <span>· {thread.actor_label ?? 'Quelqu\'un'}</span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {canEditThis && <ReportButton targetType={'event_thread' as any} targetId={thread.id} targetLabel="cette question" targetOwnerId={thread.actor_id} title="Signaler" />}
          </span>
        </div>
      </div>
      {open && <ThreadReplies thread={thread} onChanged={onChanged} />}
    </div>
  )
}
```

> Note : le bloc édition/suppression du *thread* lui-même (titre/corps) est volontairement minimal en v1 (le composer d'édition suit le même pattern que `ThreadReplies` si on veut l'ajouter — non requis pour livrer). `deleteThread`/`updateThread` sont importés et prêts ; câbler un menu « … » sur le titre si le temps le permet, sinon laisser pour une itération (noté hors périmètre bloquant).

- [ ] **Step 2: Brancher dans `EventPage.tsx`**

Remplacer l'import et l'usage :

```tsx
// remplacer la ligne d'import de DiscussionTeaser par :
import { DiscussionFestival } from '@/components/events/DiscussionFestival'
```
```tsx
// remplacer le bloc placeholder :
{/* Discussion du festival */}
<DiscussionFestival event={event} />
```

- [ ] **Step 3: Build + smoke**

Run: `pnpm build`
Expected: build OK, aucun import cassé.
Smoke manuel (dev) : ouvrir une page événement, poser une question, répondre, marquer une meilleure réponse → passe en « Résolu », toggles de canaux visibles si compte multi-type.

- [ ] **Step 4: Commit**

```bash
git add src/components/events/DiscussionFestival.tsx src/pages/EventPage.tsx
git commit -m "feat(discussion): conteneur Questions branché dans EventPage"
```

---

### Task 11: Notifications front — `thread_reply` + `best_reply`

**Files:**
- Modify: `src/hooks/use-notifications.ts` (ajouter les 2 types au Set)
- Modify: `src/components/notifications/NotificationItem.tsx` (2 entrées `TYPE_CONFIG`)

**Interfaces:**
- Consumes : structure `TypeConfigEntry` existante.
- Produces : rendu des notifs `thread_reply` / `best_reply`.

- [ ] **Step 1: Ajouter au Set des types**

Dans `src/hooks/use-notifications.ts`, ajouter dans `NOTIFICATION_TYPES` :

```ts
  'thread_reply',
  'best_reply',
```

- [ ] **Step 2: Ajouter les entrées `TYPE_CONFIG`**

Dans `src/components/notifications/NotificationItem.tsx`, importer `CheckCircle` depuis lucide-react (ajouter à l'import existant) et ajouter dans `TYPE_CONFIG` :

```ts
  thread_reply: {
    icon: MessageSquare,
    color: 'text-primary',
    actorName: (d) => d.actor_name ?? 'Quelqu\'un',
    suffix: (d) => ` a répondu à ta question sur ${d.event_name ?? 'un festival'}`,
    link: (d) => d.event_id ? `/evenement/${d.event_id}` : '/explorer',
  },
  best_reply: {
    icon: CheckCircle,
    color: 'text-forest',
    actorName: (d) => d.actor_name ?? 'L\'auteur',
    suffix: (d) => ` a choisi ta réponse comme la meilleure sur ${d.event_name ?? 'un festival'}`,
    link: (d) => d.event_id ? `/evenement/${d.event_id}` : '/explorer',
  },
```

> Si la classe `text-forest` n'existe pas, réutiliser `text-primary` (vérifier les couleurs dispo dans le fichier ; `color` est une classe Tailwind de texte).

- [ ] **Step 3: Build**

Run: `pnpm build`
Expected: OK (import `CheckCircle` résolu).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-notifications.ts src/components/notifications/NotificationItem.tsx
git commit -m "feat(notifs): thread_reply + best_reply dans le feed"
```

---

### Task 12: Signalement front — élargir `ReportTargetType`

**Files:**
- Modify: `src/lib/content-reports.ts` (élargir le type union)

**Interfaces:**
- Produces : `ReportTargetType` inclut `'event_thread' | 'event_thread_reply'` → permet de retirer les `as any` sur `ReportButton` (Tasks 9 & 10).

- [ ] **Step 1: Élargir le type**

Dans `src/lib/content-reports.ts` :

```ts
export type ReportTargetType = 'event' | 'profile' | 'event_thread' | 'event_thread_reply'
```

- [ ] **Step 2: Retirer les casts `as any`**

Dans `ThreadReplies.tsx` et `DiscussionFestival.tsx`, remplacer :
```tsx
targetType={'event_thread_reply' as any}   ->  targetType="event_thread_reply"
targetType={'event_thread' as any}         ->  targetType="event_thread"
```

- [ ] **Step 3: Build**

Run: `pnpm build`
Expected: OK, plus aucun `as any` sur `targetType`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/content-reports.ts src/components/events/ThreadReplies.tsx src/components/events/DiscussionFestival.tsx
git commit -m "feat(reports): cibles event_thread + event_thread_reply signalables"
```

---

### Task 13: Compteur de présence + finition, build/test global, bump, push

**Files:**
- Modify: `src/components/events/DiscussionFestival.tsx` (afficher `participant_count` si fourni par EventPage)
- Modify: `src/pages/EventPage.tsx` (passer le nombre de participants `inscrit` si déjà disponible)
- Modify: `package.json` (bump version)

**Interfaces:**
- Consumes : le comptage de participants `inscrit` déjà calculé dans EventPage (chercher la variable existante — Cockpit/FestivalFacts l'utilisent) ; sinon omettre proprement (le compteur ne s'affiche que si la donnée existe).

- [ ] **Step 1: Afficher le compteur si disponible**

Dans `DiscussionFestival.tsx`, sous le titre de section :

```tsx
{typeof event.participant_count === 'number' && event.participant_count > 0 && (
  <p className="disc-ctx" style={{ textAlign: 'left', marginTop: -6 }}>
    <span style={{ color: 'var(--forest)', fontWeight: 700 }}>●</span> {event.participant_count} exposant{event.participant_count > 1 ? 's' : ''} inscrit{event.participant_count > 1 ? 's' : ''} cette année
  </p>
)}
```

Dans `EventPage.tsx`, passer la prop si un compteur d'inscrits existe déjà (repérer la variable ; grep `inscrit` / `participant` dans EventPage). Si aucune donnée prête, **ne pas ajouter de requête** — laisser `participant_count` non fourni (le compteur reste masqué). Noter ce choix.

- [ ] **Step 2: Vérification globale**

Run: `pnpm build`
Expected: TypeScript check + build OK.

Run: `pnpm lint`
Expected: pas d'erreur (warnings tolérés selon la baseline projet).

Run: `pnpm vitest run`
Expected: toute la suite verte, dont `event-threads.test.ts`.

- [ ] **Step 3: Revue sécu RLS (manuel SQL, `set role`)**

Vérifier en SQL editor (ou CLI) sur des acteurs de test :
- INSERT thread avec `audience='exposant'` mais `actor_id` = une personne → **rejeté** (contrainte audience).
- UPDATE/DELETE d'un thread/réponse d'un **autre** acteur → **rejeté**.
- INSERT réponse cross-canal (personne répondant dans thread exposant) → **autorisé**.
- `set role` admin : DELETE d'un thread d'autrui → **autorisé** (`is_admin()`).
- Élire une réponse d'un **autre** thread comme `best_reply_id` → **rejeté** (trigger `enforce_best_reply_thread`).

Documenter les résultats dans le message de session (`xo-status.md`).

- [ ] **Step 4: Bump version**

Dans `package.json`, passer `"version"` de `0.7.378` à `0.7.379` (ou patch suivant selon l'état courant).

- [ ] **Step 5: Commit + push**

```bash
git add package.json src/components/events/DiscussionFestival.tsx src/pages/EventPage.tsx
git commit -m "feat(discussion): compteur de présence + bump 0.7.379"
git push origin main
```

- [ ] **Step 6: Mettre à jour `xo-status.md`**

Consigner : feature Discussion (onglet Questions) livrée, résultats de la revue sécu RLS, et rappel des points hors périmètre (onglet Rencontres, cross-édition, canal organisateur câblé, édition/suppression du thread si non faite).

---

## Self-Review (effectué)

**Couverture spec :**
- Multi-publics + audience enum extensible → Task 1 (enum `thread_audience` avec `organisateur`), Task 6 (`deriveAudience`/`visibleChannels`).
- Threads Q&R titre+corps → Task 1 (schéma), Task 10 (composer).
- Fil plat de réponses → Task 9.
- Meilleure réponse + état résolu → Task 1 (`best_reply_id` + trigger intégrité), Task 6 (`isSolved`/`sortReplies`), Task 9 (`markBestReply`/UI), Task 3 (`notify_best_reply`).
- Toggles de canaux (visibilité par types possédés, participation cross-canal) → Task 6 (`visibleChannels`/`filterByChannels`/`canReply`), Task 10 (toggles UI).
- Identité = acteur actif → Task 9/10 (`currentActor`), micro-rappel UI.
- Notifications `thread_reply` + `best_reply` (gardes anti-auto + is_private) → Tasks 2, 3, 11.
- Signalement inclus v1 → Task 4 (DB) + Task 12 (front) + boutons en Tasks 9/10.
- Édition/suppression + admin → Task 1 (RLS), Task 9 (UI réponses), Task 10 (thread : minimal, noté).
- Gratuit tous comptes → aucune vérif de plan introduite (RLS ouverte à `authenticated`).
- DA + pas de scroll interne → Task 8 (CSS), composants en `.glass-card`.
- Compteur de présence → Task 13.
- Déploiement prod-first + prévenir Uriel → contraintes globales + steps de push par migration.

**Placeholder scan :** aucun « TBD/TODO » ; le seul point laissé optionnel (menu édition/suppression du *thread*) est explicitement hors périmètre bloquant avec la fonction (`updateThread`/`deleteThread`) déjà fournie.

**Cohérence de types :** `ThreadAudience`, `ThreadActor`, `ThreadWithActor`, `ThreadReplyWithActor`, `markBestReply(threadId, replyId)`, `createThread`/`createThreadReply` — signatures identiques entre Tasks 6/7/9/10.
