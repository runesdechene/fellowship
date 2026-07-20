# Réponses aux avis de festival — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à tout exposant de répondre (fil plat) à un avis de festival, avec notification de l'auteur de l'avis.

**Architecture:** Nouvelle table `review_replies` (FK `reviews`, modèle acteur, RLS `can_act_as`), trigger `notify_review_reply` réutilisant l'infra notifications acteur, hook `use-review-replies` + composants `ReviewReplies`/`ReviewReplyItem` branchés dans `ReviewList`. Ouverture de la lecture des avis à tous les exposants (retrait du lock Pro client).

**Tech Stack:** React 19 + TS, Supabase (Postgres RLS, triggers), vitest (tests de fonctions pures uniquement — contrainte infra RTL du projet).

## Global Constraints

- Spec de référence : `docs/superpowers/specs/2026-07-20-reponses-avis-festival-design.md`.
- Le Supabase du MCP = **PROD live**. Migrations **additives/rétro-compatibles** ; appliquer via le **CLI lié** (`node_modules/.bin/supabase db push`, historique synchro). Appliquer les migrations DB **avant** de pousser le front qui en dépend.
- Modèle acteur : contrôle d'acteur via `can_act_as(actor_id)`. Destinataire notif = `actor_id`. Nom/avatar résolus via `actor_public`.
- Tests : uniquement fonctions pures (cf. `reference_react_test_infra`). Pas de `render()` RTL.
- DA : réutiliser `.glass-card`, tokens `--app-bg`/`--surface`/`da-btn*` (`reference_da_css_tokens`, `reference_theming_knobs`). Pas de scroll interne imbriqué (`feedback_no_inner_scroll`). Jour/nuit : pas de `#fff` en dur, `svg fill:none` OK (`reference_da_daynight_gotchas`).
- Auto-commit + bump `package.json` version (patch) + push après chaque tâche livrable.

## File Structure

- Create `supabase/migrations/20260721100000_review_replies.sql` — table + RLS + index.
- Create `supabase/migrations/20260721100100_review_reply_notif.sql` — enum value + trigger.
- Create `src/lib/review-replies.ts` — types + helpers purs (`sortReplies`, `canReply`, `canEditReply`, `canDeleteReply`).
- Create `src/lib/review-replies.test.ts` — tests des helpers.
- Create `src/hooks/use-review-replies.ts` — fetch + `createReply`/`updateReply`/`deleteReply`.
- Create `src/components/reviews/ReviewReplies.tsx` — fil + composer d'un avis.
- Create `src/components/reviews/ReviewReplyItem.tsx` — une réponse + actions.
- Create `src/components/reviews/ReviewReplies.css` — styles fil/composer.
- Modify `src/components/reviews/ReviewList.tsx` — monter `<ReviewReplies>` sous chaque avis.
- Modify `src/hooks/use-reviews.ts` — `canSeeDetails` = tout exposant (entité), plus seulement Pro.
- Modify `src/hooks/use-notifications.ts` — ajouter `review_reply` à `NOTIFICATION_TYPES`.
- Modify `src/components/notifications/NotificationItem.tsx` — entrée `TYPE_CONFIG.review_reply`.
- Modify `src/types/database.ts` — champ `review_id` sur `NotificationData` ; export type `ReviewReply`.
- Modify `src/types/supabase.ts` — régénéré depuis la prod après migration.
- Create `docs/decisions/0005-avis-bien-commun-exposants.md` — décision freemium.

---

### Task 1 : Migration table `review_replies`

**Files:**
- Create: `supabase/migrations/20260721100000_review_replies.sql`

**Interfaces:**
- Produces: table `review_replies(id, review_id, actor_id, acted_by_user_id, body, created_at, updated_at)` + policies.

- [ ] **Step 1: Écrire la migration**

```sql
-- Fil de réponses (plat) sous un avis de festival. Modèle acteur : l'auteur d'une
-- réponse est un exposant (entité). RLS calquée sur reviews_write_actor (can_act_as).
CREATE TABLE public.review_replies (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id        uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  actor_id         uuid NOT NULL REFERENCES public.actors(id)  ON DELETE CASCADE,
  acted_by_user_id uuid REFERENCES public.users(actor_id)      ON DELETE SET NULL,
  body             text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_review_replies_review ON public.review_replies(review_id, created_at);

ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;

-- SELECT : tout authentifié (cohérent avec reviews_select_scores USING (true)).
CREATE POLICY review_replies_select ON public.review_replies
  FOR SELECT TO authenticated USING (true);

-- INSERT : l'acteur est contrôlé par l'utilisateur ET c'est une ENTITÉ (exposant).
CREATE POLICY review_replies_insert ON public.review_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    can_act_as(actor_id)
    AND EXISTS (SELECT 1 FROM public.entities e WHERE e.actor_id = review_replies.actor_id)
  );

-- UPDATE : édition de sa propre réponse.
CREATE POLICY review_replies_update ON public.review_replies
  FOR UPDATE TO authenticated
  USING (can_act_as(actor_id)) WITH CHECK (can_act_as(actor_id));

-- DELETE : sa propre réponse OU admin (modération).
CREATE POLICY review_replies_delete ON public.review_replies
  FOR DELETE TO authenticated
  USING (can_act_as(actor_id) OR public.is_admin());
```

- [ ] **Step 2: Vérifier que `is_admin()` existe** (sinon fallback profiles/users role).

Run: `grep -rn "FUNCTION is_admin\|FUNCTION public.is_admin" supabase/migrations/`
Expected: une définition existe (cf. `reference_storage_rls_security_definer`). Si absente, remplacer `public.is_admin()` par le `coalesce(...role='admin'...)` de `content_reports_delete_admin`.

- [ ] **Step 3: Commit** (migration seule, appliquée en Task 3).

```bash
git add supabase/migrations/20260721100000_review_replies.sql
git commit -m "feat(db): table review_replies + RLS (réponses aux avis)"
```

---

### Task 2 : Migration notif `review_reply`

**Files:**
- Create: `supabase/migrations/20260721100100_review_reply_notif.sql`

**Interfaces:**
- Consumes: table `review_replies` (Task 1), `notifications`, `reviews`, `events`, `actor_public`.
- Produces: enum value `review_reply`, trigger `on_review_reply` → `notify_review_reply()`.

- [ ] **Step 1: Écrire la migration**

```sql
-- Nouveau type de notif : réponse à un avis. ADD VALUE doit être hors usage dans la
-- même transaction que son emploi ; ici la valeur n'est employée qu'au RUNTIME du
-- trigger (littéral inséré dans notifications.type), donc same-file OK.
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'review_reply';

-- Notifie l'auteur de l'AVIS quand quelqu'un y répond.
--  - garde anti-auto-notif : auteur de l'avis == répondeur -> rien.
--  - garde is_private : avis sur event privé -> rien (cohérence notify_friend_*).
CREATE OR REPLACE FUNCTION notify_review_reply()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  review_author uuid;
  ev_id uuid;
  ev_name text;
  ev_private boolean;
  replier_name text;
  replier_avatar text;
BEGIN
  SELECT r.actor_id, r.event_id INTO review_author, ev_id
    FROM reviews r WHERE r.id = NEW.review_id;
  IF review_author IS NULL OR review_author = NEW.actor_id THEN
    RETURN NEW;                          -- pas d'auteur, ou on répond à soi-même
  END IF;

  SELECT e.name, e.is_private INTO ev_name, ev_private FROM events e WHERE e.id = ev_id;
  IF ev_private THEN RETURN NEW; END IF; -- avis sur event privé : aucune notif

  SELECT COALESCE(label, 'Un exposant'), avatar_url INTO replier_name, replier_avatar
    FROM actor_public WHERE actor_id = NEW.actor_id;

  INSERT INTO notifications (actor_id, type, data)
  VALUES (
    review_author, 'review_reply',
    jsonb_build_object(
      'actor_id', NEW.actor_id, 'actor_name', replier_name,
      'actor_avatar_url', replier_avatar,
      'event_id', ev_id, 'event_name', ev_name, 'review_id', NEW.review_id
    )
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_review_reply ON review_replies;
CREATE TRIGGER on_review_reply
  AFTER INSERT ON review_replies
  FOR EACH ROW EXECUTE FUNCTION notify_review_reply();
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260721100100_review_reply_notif.sql
git commit -m "feat(db): notif review_reply (trigger sur review_replies)"
```

---

### Task 3 : Appliquer les migrations en prod + régénérer les types

**Files:**
- Modify: `src/types/supabase.ts` (régénéré)

- [ ] **Step 1: Dry-run**

Run: `node_modules/.bin/supabase db push --dry-run`
Expected: liste `20260721100000_review_replies.sql` et `20260721100100_review_reply_notif.sql`, rien d'autre d'inattendu.

- [ ] **Step 2: Push prod**

Run: `node_modules/.bin/supabase db push`
Expected: `Finished supabase db push.` sans erreur.

- [ ] **Step 3: Régénérer les types depuis la prod**

Run: `node_modules/.bin/supabase gen types typescript --project-id trbxpsknbtisqwefqoub > src/types/supabase.ts`
Expected: `review_replies` apparaît dans le fichier ; enum `notification_type` inclut `review_reply`.

Note : si `gen types` échoue (auth), ajouter manuellement le type `review_replies` (Row/Insert/Update) dans `src/types/supabase.ts` en copiant le pattern d'une table existante, et ajouter `"review_reply"` aux deux listes de l'enum `notification_type`.

- [ ] **Step 4: Typecheck + commit**

Run: `node_modules/.bin/tsc -b --noEmit`
Expected: exit 0.

```bash
git add src/types/supabase.ts
git commit -m "chore(types): régénère les types Supabase (review_replies)"
```

---

### Task 4 : Helpers purs `review-replies.ts` (TDD)

**Files:**
- Create: `src/lib/review-replies.ts`
- Test: `src/lib/review-replies.test.ts`

**Interfaces:**
- Produces:
  - `type ReplyActor = { id: string; kind: string } | null`
  - `sortReplies<T extends { created_at: string }>(rows: T[]): T[]` — tri ascendant par date.
  - `canReply(actor: ReplyActor): boolean` — true ssi actor est une entité.
  - `canEditReply(actor: ReplyActor, reply: { actor_id: string }): boolean`
  - `canDeleteReply(actor: ReplyActor, reply: { actor_id: string }, isAdmin: boolean): boolean`

- [ ] **Step 1: Écrire les tests (échouent)**

```ts
import { describe, it, expect } from 'vitest'
import { sortReplies, canReply, canEditReply, canDeleteReply } from './review-replies'

describe('sortReplies', () => {
  it('trie du plus ancien au plus récent', () => {
    const rows = [
      { id: 'b', created_at: '2026-07-02T10:00:00Z' },
      { id: 'a', created_at: '2026-07-01T10:00:00Z' },
    ]
    expect(sortReplies(rows).map(r => r.id)).toEqual(['a', 'b'])
  })
})

describe('canReply', () => {
  it('true pour une entité', () => expect(canReply({ id: 'e1', kind: 'entity' })).toBe(true))
  it('false pour une personne', () => expect(canReply({ id: 'p1', kind: 'person' })).toBe(false))
  it('false si non connecté', () => expect(canReply(null)).toBe(false))
})

describe('canEditReply', () => {
  it('true si auteur', () => expect(canEditReply({ id: 'e1', kind: 'entity' }, { actor_id: 'e1' })).toBe(true))
  it('false si autre acteur', () => expect(canEditReply({ id: 'e2', kind: 'entity' }, { actor_id: 'e1' })).toBe(false))
  it('false si non connecté', () => expect(canEditReply(null, { actor_id: 'e1' })).toBe(false))
})

describe('canDeleteReply', () => {
  it('true si auteur', () => expect(canDeleteReply({ id: 'e1', kind: 'entity' }, { actor_id: 'e1' }, false)).toBe(true))
  it('true si admin même non-auteur', () => expect(canDeleteReply({ id: 'e2', kind: 'entity' }, { actor_id: 'e1' }, true)).toBe(true))
  it('false si ni auteur ni admin', () => expect(canDeleteReply({ id: 'e2', kind: 'entity' }, { actor_id: 'e1' }, false)).toBe(false))
})
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `node_modules/.bin/vitest run src/lib/review-replies.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

```ts
export type ReplyActor = { id: string; kind: string } | null

/** Tri ascendant (plus ancien d'abord) — le fil se lit de haut en bas. */
export function sortReplies<T extends { created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

/** Seul un exposant (entité) peut répondre. */
export function canReply(actor: ReplyActor): boolean {
  return !!actor && actor.kind === 'entity'
}

export function canEditReply(actor: ReplyActor, reply: { actor_id: string }): boolean {
  return !!actor && actor.id === reply.actor_id
}

export function canDeleteReply(actor: ReplyActor, reply: { actor_id: string }, isAdmin: boolean): boolean {
  if (!actor) return false
  return actor.id === reply.actor_id || isAdmin
}
```

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `node_modules/.bin/vitest run src/lib/review-replies.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/review-replies.ts src/lib/review-replies.test.ts
git commit -m "feat(avis): helpers purs du fil de réponses (+ tests)"
```

---

### Task 5 : Hook `use-review-replies.ts`

**Files:**
- Create: `src/hooks/use-review-replies.ts`

**Interfaces:**
- Consumes: `sortReplies` (Task 4), `supabase`, `actor_public`.
- Produces:
  - `type ReplyWithActor = { id; review_id; actor_id; body; created_at; updated_at; actor_label; actor_avatar_url; actor_slug }`
  - `useReviewReplies(reviewId: string) => { replies, loading, refetch }`
  - `createReply(input: { review_id; actor_id; acted_by_user_id; body }) => { data, error }`
  - `updateReply(id: string, body: string) => { data, error }`
  - `deleteReply(id: string) => { error }`

- [ ] **Step 1: Implémenter** (fetch + attache acteurs, calqué sur `use-reviews.ts` / `use-notes.ts`)

```ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { sortReplies } from '@/lib/review-replies'

export type ReplyWithActor = {
  id: string
  review_id: string
  actor_id: string
  body: string
  created_at: string
  updated_at: string
  actor_label: string | null
  actor_avatar_url: string | null
  actor_slug: string | null
}

async function attachActors(rows: Array<{ actor_id: string; [k: string]: unknown }>): Promise<ReplyWithActor[]> {
  const ids = [...new Set(rows.map(r => r.actor_id))]
  let byId: Record<string, { label: string | null; avatar_url: string | null; public_slug: string | null }> = {}
  if (ids.length > 0) {
    const { data: actors } = await supabase
      .from('actor_public').select('actor_id, label, avatar_url, public_slug').in('actor_id', ids)
    byId = Object.fromEntries((actors ?? [])
      .filter(a => a.actor_id != null)
      .map(a => [a.actor_id as string, { label: a.label, avatar_url: a.avatar_url, public_slug: a.public_slug }]))
  }
  return rows.map(r => ({
    ...(r as unknown as Omit<ReplyWithActor, 'actor_label' | 'actor_avatar_url' | 'actor_slug'>),
    actor_label: byId[r.actor_id]?.label ?? null,
    actor_avatar_url: byId[r.actor_id]?.avatar_url ?? null,
    actor_slug: byId[r.actor_id]?.public_slug ?? null,
  }))
}

export function useReviewReplies(reviewId: string) {
  const [replies, setReplies] = useState<ReplyWithActor[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReplies = useCallback(async () => {
    const { data } = await supabase
      .from('review_replies').select('*').eq('review_id', reviewId)
    const rows = (data as Array<{ actor_id: string; created_at: string; [k: string]: unknown }> | null) ?? []
    setReplies(sortReplies(await attachActors(rows)))
    setLoading(false)
  }, [reviewId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReplies()
  }, [fetchReplies])

  return { replies, loading, refetch: fetchReplies }
}

export async function createReply(input: {
  review_id: string; actor_id: string; acted_by_user_id: string; body: string
}) {
  const { data, error } = await supabase.from('review_replies').insert(input).select('*').single()
  return { data, error }
}

export async function updateReply(id: string, body: string) {
  const { data, error } = await supabase
    .from('review_replies').update({ body, updated_at: new Date().toISOString() }).eq('id', id).select('*').single()
  return { data, error }
}

export async function deleteReply(id: string) {
  const { error } = await supabase.from('review_replies').delete().eq('id', id)
  return { error }
}
```

- [ ] **Step 2: Typecheck**

Run: `node_modules/.bin/tsc -b --noEmit`
Expected: exit 0 (si `review_replies` absent des types, revoir Task 3 Step 3).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-review-replies.ts
git commit -m "feat(avis): hook use-review-replies (fetch + CRUD)"
```

---

### Task 6 : Composant `ReviewReplyItem`

**Files:**
- Create: `src/components/reviews/ReviewReplyItem.tsx`

**Interfaces:**
- Consumes: `ReplyWithActor` (Task 5), `ReviewAvatar`, `canEditReply`/`canDeleteReply` (Task 4).
- Produces: `<ReviewReplyItem reply actor isAdmin onEdit onDelete />`.

- [ ] **Step 1: Implémenter**

```tsx
import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type { ReplyWithActor } from '@/hooks/use-review-replies'
import { canEditReply, canDeleteReply, type ReplyActor } from '@/lib/review-replies'
import { ReviewAvatar } from './ReviewAvatar'

function ago(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 7) return `il y a ${days} j`
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem`
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`
  return `il y a ${Math.floor(days / 365)} an${Math.floor(days / 365) > 1 ? 's' : ''}`
}

interface Props {
  reply: ReplyWithActor
  actor: ReplyActor
  isAdmin: boolean
  onEdit: (id: string, body: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function ReviewReplyItem({ reply, actor, isAdmin, onEdit, onDelete }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(reply.body)
  const [busy, setBusy] = useState(false)
  const edited = reply.updated_at !== reply.created_at

  const save = async () => {
    const body = draft.trim()
    if (!body || body === reply.body) { setEditing(false); return }
    setBusy(true); await onEdit(reply.id, body); setBusy(false); setEditing(false)
  }

  return (
    <div className="review-reply">
      <ReviewAvatar label={reply.actor_label} avatarUrl={reply.actor_avatar_url} slug={reply.actor_slug} className="review-reply-avatar" />
      <div className="review-reply-body">
        <div className="review-reply-meta">
          <span className="review-reply-name">{reply.actor_label ?? 'Un exposant'}</span>
          <span className="review-reply-date">{ago(reply.created_at)}{edited ? ' · modifié' : ''}</span>
        </div>
        {editing ? (
          <div className="review-reply-edit">
            <textarea value={draft} maxLength={1000} onChange={e => setDraft(e.target.value)} rows={2} />
            <div className="review-reply-edit-actions">
              <button className="da-btn-ghost" onClick={() => { setDraft(reply.body); setEditing(false) }} disabled={busy}>Annuler</button>
              <button className="da-btn" onClick={save} disabled={busy || !draft.trim()}>{busy ? '…' : 'Enregistrer'}</button>
            </div>
          </div>
        ) : (
          <p className="review-reply-text">{reply.body}</p>
        )}
        {!editing && (canEditReply(actor, reply) || canDeleteReply(actor, reply, isAdmin)) && (
          <div className="review-reply-actions">
            {canEditReply(actor, reply) && (
              <button className="review-reply-action" onClick={() => setEditing(true)}><Pencil strokeWidth={2} /> Éditer</button>
            )}
            {canDeleteReply(actor, reply, isAdmin) && (
              <button className="review-reply-action review-reply-del" onClick={() => onDelete(reply.id)}><Trash2 strokeWidth={2} /> Supprimer</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `node_modules/.bin/tsc -b --noEmit` (exit 0)

```bash
git add src/components/reviews/ReviewReplyItem.tsx
git commit -m "feat(avis): composant ReviewReplyItem"
```

---

### Task 7 : Composant `ReviewReplies` (fil + composer) + CSS

**Files:**
- Create: `src/components/reviews/ReviewReplies.tsx`
- Create: `src/components/reviews/ReviewReplies.css`

**Interfaces:**
- Consumes: `useReviewReplies`/`createReply`/`updateReply`/`deleteReply` (Task 5), `ReviewReplyItem` (Task 6), `canReply` (Task 4), `useAuth`.
- Produces: `<ReviewReplies reviewId />`.

- [ ] **Step 1: Implémenter le composant**

```tsx
import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useReviewReplies, createReply, updateReply, deleteReply } from '@/hooks/use-review-replies'
import { canReply } from '@/lib/review-replies'
import { ReviewReplyItem } from './ReviewReplyItem'
import './ReviewReplies.css'

interface Props { reviewId: string }

export function ReviewReplies({ reviewId }: Props) {
  const { user, currentActor, can } = useAuth()
  const { replies, refetch } = useReviewReplies(reviewId)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const actor = currentActor ? { id: currentActor.id, kind: currentActor.kind } : null
  const isAdmin = can('admin')  // NOTE Task 7 Step 2 : vérifier l'action réelle exposée par can()

  const submit = async () => {
    const body = draft.trim()
    if (!body || !user || !currentActor) return
    setBusy(true)
    await createReply({ review_id: reviewId, actor_id: currentActor.id, acted_by_user_id: user.id, body })
    setBusy(false); setDraft(''); await refetch()
  }

  const onEdit = async (id: string, body: string) => { await updateReply(id, body); await refetch() }
  const onDelete = async (id: string) => { await deleteReply(id); await refetch() }

  return (
    <div className="review-replies">
      <button className="review-replies-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <MessageCircle strokeWidth={2} />
        {replies.length > 0
          ? `${replies.length} réponse${replies.length > 1 ? 's' : ''}`
          : 'Répondre'}
      </button>

      {open && (
        <div className="review-replies-panel">
          {replies.map(r => (
            <ReviewReplyItem key={r.id} reply={r} actor={actor} isAdmin={isAdmin} onEdit={onEdit} onDelete={onDelete} />
          ))}

          {canReply(actor) ? (
            <div className="review-replies-composer">
              <textarea
                value={draft} maxLength={1000} rows={2}
                placeholder="Répondre à cet avis…"
                onChange={e => setDraft(e.target.value)}
              />
              <button className="da-btn" onClick={submit} disabled={busy || !draft.trim()}>
                {busy ? '…' : 'Publier'}
              </button>
            </div>
          ) : (
            <p className="review-replies-hint">Passe en mode exposant pour répondre.</p>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Vérifier l'API `can()` pour l'admin**

Run: `grep -rn "ActorAction\|actorCan\|'admin'" src/lib/navModel.ts src/lib/auth.tsx`
Expected: identifier comment lire le statut admin. Si `can('admin')` n'existe pas, utiliser le flag `isAdmin` exposé par le contexte (chercher `isAdmin` dans `auth.tsx`) — remplacer `const isAdmin = can('admin')` par la vraie source.

- [ ] **Step 3: CSS** (DA verre, jour/nuit, pas de couleur en dur)

```css
.review-replies { margin-top: 10px; }
.review-replies-toggle {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: .82rem; color: var(--muted-foreground);
  background: none; border: none; cursor: pointer; padding: 4px 0;
}
.review-replies-toggle svg { width: 15px; height: 15px; }
.review-replies-panel { margin-top: 8px; display: flex; flex-direction: column; gap: 10px; }
.review-reply { display: flex; gap: 8px; }
.review-reply-avatar { width: 26px; height: 26px; border-radius: 50%; overflow: hidden; flex-shrink: 0; font-size: .7rem; display: flex; align-items: center; justify-content: center; }
.review-reply-avatar img { width: 100%; height: 100%; object-fit: cover; }
.review-reply-body { flex: 1; min-width: 0; }
.review-reply-meta { display: flex; gap: 8px; align-items: baseline; }
.review-reply-name { font-weight: 600; font-size: .82rem; }
.review-reply-date { font-size: .72rem; color: var(--muted-foreground); }
.review-reply-text { margin: 2px 0 0; font-size: .88rem; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }
.review-reply-actions { display: flex; gap: 12px; margin-top: 3px; }
.review-reply-action { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; cursor: pointer; font-size: .74rem; color: var(--muted-foreground); padding: 0; }
.review-reply-action svg { width: 13px; height: 13px; }
.review-reply-del:hover { color: var(--destructive); }
.review-reply-edit textarea,
.review-replies-composer textarea {
  width: 100%; resize: vertical; border-radius: 10px; padding: 8px 10px;
  background: var(--surface); border: 1px solid var(--border); color: inherit;
  font: inherit; font-size: .88rem;
}
.review-reply-edit-actions, .review-replies-composer { display: flex; gap: 8px; margin-top: 6px; align-items: flex-end; }
.review-replies-composer textarea { flex: 1; }
.review-replies-hint { font-size: .78rem; color: var(--muted-foreground); margin: 4px 0 0; }
```

- [ ] **Step 4: Typecheck + commit**

Run: `node_modules/.bin/tsc -b --noEmit` (exit 0)

```bash
git add src/components/reviews/ReviewReplies.tsx src/components/reviews/ReviewReplies.css
git commit -m "feat(avis): fil de réponses ReviewReplies + composer"
```

---

### Task 8 : Brancher dans `ReviewList` + ouvrir la lecture aux exposants

**Files:**
- Modify: `src/components/reviews/ReviewList.tsx`
- Modify: `src/hooks/use-reviews.ts:61`

- [ ] **Step 1: Monter `<ReviewReplies>` sous chaque avis**

Dans `ReviewList.tsx`, importer `import { ReviewReplies } from './ReviewReplies'` et, juste avant la fermeture `</article>` (après le bloc commentaire), ajouter :

```tsx
            <ReviewReplies reviewId={r.id} />
```

- [ ] **Step 2: Ouvrir la lecture des avis à tout exposant**

Dans `src/hooks/use-reviews.ts`, remplacer la ligne 61 :

```ts
  const canSeeDetails = planForActor(currentActor, currentActorRow) === 'pro'
```

par :

```ts
  // Les avis sont un bien commun exposants : tout exposant (entité) lit le détail,
  // plus seulement le Pro (décision 0005). currentActorRow reste importé pour la
  // rétro-compat de signature si d'autres appels l'utilisent.
  const canSeeDetails = currentActor?.kind === 'entity'
```

Si `planForActor`/`currentActorRow` deviennent inutilisés → retirer l'import et la déstructuration pour éviter l'erreur eslint no-unused.

- [ ] **Step 3: Typecheck + lint**

Run: `node_modules/.bin/tsc -b --noEmit` (exit 0)
Run: `pnpm lint` (0 erreur sur les fichiers touchés)

- [ ] **Step 4: Commit**

```bash
git add src/components/reviews/ReviewList.tsx src/hooks/use-reviews.ts
git commit -m "feat(avis): fil de réponses branché + lecture ouverte aux exposants"
```

---

### Task 9 : Notifications front `review_reply`

**Files:**
- Modify: `src/hooks/use-notifications.ts:7-13`
- Modify: `src/components/notifications/NotificationItem.tsx` (TYPE_CONFIG + import icône)
- Modify: `src/types/database.ts:108-117` (champ `review_id`)

- [ ] **Step 1: Ajouter le type au set des notifs personnelles**

Dans `use-notifications.ts`, ajouter `'review_reply',` dans `NOTIFICATION_TYPES`.

- [ ] **Step 2: Ajouter `review_id` à `NotificationData`**

Dans `src/types/database.ts`, dans `interface NotificationData`, ajouter :

```ts
  review_id?: string
```

- [ ] **Step 3: Ajouter l'entrée `TYPE_CONFIG`**

Dans `NotificationItem.tsx`, réimporter `MessageSquare` dans la ligne d'import lucide, et ajouter dans `TYPE_CONFIG` :

```tsx
  review_reply: {
    icon: MessageSquare,
    color: 'text-primary',
    actorName: (d) => d.actor_name ?? 'Un exposant',
    suffix: (d) => ` a répondu à ton avis sur ${d.event_name ?? 'un festival'}`,
    link: (d) => d.event_id ? `/evenement/${d.event_id}` : '/explorer',
  },
```

- [ ] **Step 4: Typecheck + commit**

Run: `node_modules/.bin/tsc -b --noEmit` (exit 0)

```bash
git add src/hooks/use-notifications.ts src/components/notifications/NotificationItem.tsx src/types/database.ts
git commit -m "feat(notifs): type review_reply (auteur d'avis notifié)"
```

---

### Task 10 : Décision freemium + mémoire

**Files:**
- Create: `docs/decisions/0005-avis-bien-commun-exposants.md`

- [ ] **Step 1: Écrire la décision**

Contenu : contexte (réponses aux avis), décision (lecture des avis ouverte à tout exposant, le Pro garde Calendrier/Communauté/Dashboard/badge Certifié), conséquence (matrice freemium mise à jour), date 2026-07-21.

- [ ] **Step 2: Commit**

```bash
git add docs/decisions/0005-avis-bien-commun-exposants.md
git commit -m "docs(decision): avis = bien commun exposants (freemium)"
```

- [ ] **Step 3: Mettre à jour la mémoire projet** `project_freemium_matrix.md` (avis lecture = tout exposant, plus Pro-locked) et pointer la décision 0005.

---

### Task 11 : Vérification finale + bump + déploiement

- [ ] **Step 1: Build complet**

Run: `pnpm build`
Expected: TS check + Vite build OK, exit 0.

- [ ] **Step 2: Suite de tests**

Run: `node_modules/.bin/vitest run`
Expected: tous verts (dont `review-replies.test.ts`).

- [ ] **Step 3: Bump version + commit + push (déclenche le déploiement Netlify)**

```bash
# bump patch dans package.json (ex. 0.7.376 -> 0.7.377)
git add package.json
git commit -m "chore: bump version (réponses aux avis)"
git push
```

- [ ] **Step 4: Revue sécu RLS (post-déploiement)** — vérifier en SQL (`set role authenticated` + `request.jwt.claims`) qu'un acteur ne peut pas éditer/supprimer la réponse d'un autre, et qu'une personne (non-entité) ne peut pas insérer. Consigner le résultat dans `xo-status.md`.

---

## Deferred (v1.1, hors périmètre de cette nuit)

- **Signalement des réponses** : nécessite d'étendre le CHECK `content_reports.target_type` à `'review_reply'`, le type TS `ReportTargetType`, et le câblage `ReportButton` dans `ReviewReplyItem`. Additif, à faire ensuite — noté pour ne pas laisser de fausse impression de complétude (la spec le prévoyait).

## Self-Review (rempli à la rédaction)

- **Couverture spec** : table+RLS (T1), notif+gardes (T2), hook+CRUD (T5), UI fil+composer+édition/suppression (T6-T7), branchement+ouverture lecture (T8), notif front (T9), décision freemium (T10). Signalement = explicitement **déféré** (section ci-dessus) — seul écart assumé vs spec, à valider par Uriel.
- **Placeholders** : aucun step sans code réel ; deux vérifs runtime signalées (`is_admin()` T1S2, source admin `can()` T7S2) car dépendantes du code existant.
- **Cohérence des types** : `ReplyActor`/`ReplyWithActor`/`canReply`/`canEditReply`/`canDeleteReply` nommés identiquement de T4 à T7.
