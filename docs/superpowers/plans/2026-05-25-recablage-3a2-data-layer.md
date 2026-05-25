# 3A.2 — Recâblage data layer (actor_id) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire en sorte que toutes les lectures/écritures de l'app passent par l'`actor_id` de l'acteur courant (`*_actor` pour les follows), avec audit `acted_by_user_id`, et basculer les vues/RPC sociales sur les acteurs.

**Architecture:** Migration SQL qui réécrit les vues/RPC sociales sur `*_actor` et ajoute une vue `actor_public` (users+entities unifiés pour les affichages « qui »). Côté app, les hooks lisent `currentActor.id` (au lieu de `user.id`) et écrivent `actor_id`/`*_actor` + `acted_by_user_id = user.id`. Colonnes legacy conservées (drop = Plan 4 contract).

**Tech Stack:** Supabase (Postgres views/functions + RLS), `@supabase/supabase-js` v2, React 19 hooks, Vitest. Branche `feat/accounts-foundation`. **NE PAS git push.**

**Spec :** [`../specs/2026-05-25-recablage-coeur-3a-design.md`](../specs/2026-05-25-recablage-coeur-3a-design.md) (Partie 2).

> **Environnement :** Supabase local lancé (Docker `supabase_db_fellowship`, API `127.0.0.1:54321`, Mailpit `:54324`). Binaire CLI : `"C:/Users/uriel/Desktop/DEVs/fellowship/node_modules/supabase/bin/supabase.exe"` (pas sur PATH). Régen types : ajouter `2>/dev/null` pour ne pas polluer le fichier. Le hook post-commit imprime des lignes `[graphify] ...` — normal. **Ne jamais `git push`.**

---

## File Structure

**Migrations (créer) :**
- `supabase/migrations/20260525120006_social_views_actor.sql` — réécrit `friends`, `are_friends`, `get_friends_with_dates` sur `*_actor` ; ajoute la vue `actor_public`.

**Code (modifier) :**
- `src/hooks/use-follows.ts`, `src/hooks/use-following-ids.ts`, `src/hooks/use-participations.ts`, `src/hooks/use-reviews.ts`, `src/hooks/use-reports.ts`, `src/hooks/use-notes.ts`, `src/hooks/use-notifications.ts`
- Call sites (écritures) : `src/components/events/EventForm.tsx`, `src/components/notes/NoteForm.tsx`, `src/components/notes/NotesFeed.tsx`, `src/components/profile/FollowersModal.tsx`, `src/components/notifications/NotificationItem.tsx`, `src/pages/EventPage.tsx`, `src/pages/PublicProfile.tsx`, `src/pages/Embed.tsx`, `src/components/events/ParticipantsModal.tsx`
- `src/types/supabase.ts` (régénéré)

**Hors périmètre :** sélecteur/nav/gating (3A.1) ; `event_scores` (inchangé : pas de `user_id`) ; `profiles` legacy conservé.

---

## Task 1 : Migration SQL — vues sociales sur `*_actor` + `actor_public`

**Files :** Create `supabase/migrations/20260525120006_social_views_actor.sql` ; Modify `src/types/supabase.ts`

- [ ] **Step 1 : Écrire la migration**

```sql
-- 20260525120006_social_views_actor.sql
-- Bascule des vues/RPC sociales sur les ACTEURS (*_actor). Les colonnes de sortie de la vue
-- `friends` gardent leurs noms (user_id/friend_id) — elles portent désormais des actor_id —,
-- donc get_friend_ids() et are_friends_of_friends() (qui s'appuient sur `friends`) restent valides.
-- event_scores ne référence aucun user_id → inchangé (non touché ici).

-- friends : compagnons = follow mutuel entre acteurs.
CREATE OR REPLACE VIEW friends AS
  SELECT f1.follower_actor AS user_id, f1.following_actor AS friend_id
  FROM follows f1
  INNER JOIN follows f2
    ON f1.follower_actor = f2.following_actor
   AND f1.following_actor = f2.follower_actor;

-- are_friends : sur *_actor.
CREATE OR REPLACE FUNCTION are_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM follows f1
    INNER JOIN follows f2 ON f1.follower_actor = f2.following_actor AND f1.following_actor = f2.follower_actor
    WHERE f1.follower_actor = user_a AND f1.following_actor = user_b
  );
$$;

-- get_friends_with_dates : sur *_actor (param = actor courant).
CREATE OR REPLACE FUNCTION get_friends_with_dates(p_user_id UUID)
RETURNS TABLE(friend_id UUID, friended_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f1.following_actor AS friend_id,
         GREATEST(f1.created_at, f2.created_at) AS friended_at
  FROM follows f1
  INNER JOIN follows f2
    ON f1.follower_actor = f2.following_actor
   AND f1.following_actor = f2.follower_actor
  WHERE f1.follower_actor = p_user_id;
$$;

-- actor_public : lecture unifiée users+entities pour les affichages « qui » (kind-agnostique).
CREATE OR REPLACE VIEW actor_public AS
  SELECT actor_id, 'person'::actor_kind AS kind, display_name AS label, avatar_url,
         NULL::entity_type AS entity_type, NULL::text AS public_slug
  FROM users
  UNION ALL
  SELECT actor_id, 'entity'::actor_kind AS kind, brand_name AS label, avatar_url,
         type AS entity_type, public_slug
  FROM entities;
```

- [ ] **Step 2 : Appliquer** — `"C:/Users/uriel/Desktop/DEVs/fellowship/node_modules/supabase/bin/supabase.exe" db reset`
Expected: toutes les migrations s'appliquent, aucune erreur SQL (ligne finale `storage ... context deadline exceeded` bénigne, ignorer).

- [ ] **Step 3 : Vérifier** (psql)

Run: `docker exec supabase_db_fellowship psql -U postgres -d postgres -c "SELECT * FROM actor_public LIMIT 1;" -c "\d+ friends"`
Expected: `actor_public` interrogeable (colonnes actor_id, kind, label, avatar_url, entity_type, public_slug) ; vue `friends` présente avec colonnes user_id, friend_id.

- [ ] **Step 4 : Régénérer les types**

Run: `"C:/Users/uriel/Desktop/DEVs/fellowship/node_modules/supabase/bin/supabase.exe" gen types typescript --local > src/types/supabase.ts 2>/dev/null`
Then: `head -1 src/types/supabase.ts` → doit afficher `export type Json =` (sinon retirer les lignes de pollution).

- [ ] **Step 5 : Commit**

```bash
git add supabase/migrations/20260525120006_social_views_actor.sql src/types/supabase.ts
git commit -m "feat(recablage): social views/RPC on *_actor + actor_public view"
```

---

## Task 2 : Recâble `use-following-ids.ts`

**Files :** Modify `src/hooks/use-following-ids.ts`

> Le set des acteurs suivis par l'acteur courant (utilisé pour l'état « Suivi » dans les listes). `following_id` → `following_actor`, `follower_id = currentActor.id`.

- [ ] **Step 1 : Remplacer le contenu**

```tsx
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

export function useFollowingIds() {
  const { currentActor } = useAuth()
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!currentActor) return

    async function fetch() {
      const { data } = await supabase
        .from('follows')
        .select('following_actor')
        .eq('follower_actor', currentActor!.id)

      setFollowingIds(new Set((data ?? []).map(r => r.following_actor as string)))
    }

    fetch()
  }, [currentActor])

  return followingIds
}
```

- [ ] **Step 2 : Vérifier le build** — `pnpm build` → 0 erreur.
- [ ] **Step 3 : Commit**

```bash
git add src/hooks/use-following-ids.ts
git commit -m "feat(recablage): following ids by current actor (*_actor)"
```

---

## Task 3 : Recâble `use-follows.ts`

**Files :** Modify `src/hooks/use-follows.ts`

> Follows entre acteurs : `follower_actor = currentActor.id`, `following_actor = targetId` (l'actor_id cible). `useMyFriends`/`useMyFollowers` renvoient des lignes `actor_public` (kind-agnostique) au lieu de `profiles`. La jointure FK `profiles!follows_follower_id_fkey` n'existe pas sur une vue → on fait deux requêtes (ids puis `actor_public`).

- [ ] **Step 1 : Remplacer le contenu**

```tsx
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

export type PublicActor = {
  actor_id: string
  kind: 'person' | 'entity'
  label: string | null
  avatar_url: string | null
  entity_type: string | null
  public_slug: string | null
}

export function useFollowStatus(targetId: string | undefined) {
  const { currentActor } = useAuth()
  const me = currentActor?.id
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFriend, setIsFriend] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!me || !targetId || me === targetId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      return
    }

    async function check() {
      const { data: myFollow } = await supabase
        .from('follows').select('id')
        .eq('follower_actor', me!).eq('following_actor', targetId!).maybeSingle()
      const { data: theirFollow } = await supabase
        .from('follows').select('id')
        .eq('follower_actor', targetId!).eq('following_actor', me!).maybeSingle()
      setIsFollowing(!!myFollow)
      setIsFriend(!!myFollow && !!theirFollow)
      setLoading(false)
    }
    check()
  }, [me, targetId])

  const toggleFollow = async () => {
    if (!me || !targetId) return
    if (isFollowing) {
      await supabase.from('follows').delete()
        .eq('follower_actor', me).eq('following_actor', targetId)
      setIsFollowing(false)
      setIsFriend(false)
    } else {
      await supabase.from('follows').insert({ follower_actor: me, following_actor: targetId })
      setIsFollowing(true)
      const { data: theirFollow } = await supabase
        .from('follows').select('id')
        .eq('follower_actor', targetId).eq('following_actor', me).maybeSingle()
      setIsFriend(!!theirFollow)
    }
  }

  return { isFollowing, isFriend, loading, toggleFollow }
}

export function useMyFriends() {
  const { currentActor } = useAuth()
  const [friends, setFriends] = useState<PublicActor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentActor) { setLoading(false); return } // eslint-disable-line react-hooks/set-state-in-effect
    async function fetchFriends() {
      try {
        const { data: friendRows } = await supabase.rpc('get_friend_ids', { p_user_id: currentActor!.id })
        const friendIds = friendRows as string[] | null
        if (!friendIds || friendIds.length === 0) { setFriends([]); setLoading(false); return }
        const { data } = await supabase.from('actor_public').select('*').in('actor_id', friendIds)
        setFriends((data as PublicActor[] | null) ?? [])
      } catch { setFriends([]) }
      setLoading(false)
    }
    fetchFriends()
  }, [currentActor])

  return { friends, loading }
}

export function useMyFollowers() {
  const { currentActor } = useAuth()
  const [followers, setFollowers] = useState<PublicActor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentActor) { setLoading(false); return } // eslint-disable-line react-hooks/set-state-in-effect
    async function fetchFollowers() {
      try {
        const { data: rows } = await supabase.from('follows')
          .select('follower_actor').eq('following_actor', currentActor!.id)
        const ids = (rows ?? []).map(r => r.follower_actor as string)
        if (ids.length === 0) { setFollowers([]); setLoading(false); return }
        const { data } = await supabase.from('actor_public').select('*').in('actor_id', ids)
        setFollowers((data as PublicActor[] | null) ?? [])
      } catch { setFollowers([]) }
      setLoading(false)
    }
    fetchFollowers()
  }, [currentActor])

  return { followers, loading }
}
```

- [ ] **Step 2 : Build** — `pnpm build`. Si des conscommateurs de `useMyFriends`/`useMyFollowers` cassent (ils lisaient `Profile.id`/`display_name`), noter les erreurs : elles se corrigent en lisant `actor_id`/`label` sur `PublicActor`. Corriger les accès de champ dans ces consommateurs (ex. `FollowersModal`, `FriendsModal`, `ProfileNetworkStats`) : `f.id`→`f.actor_id`, `f.display_name`/`f.brand_name`→`f.label`, slug→`f.public_slug`.
- [ ] **Step 3 : Lint** — `pnpm lint` → 0 erreur.
- [ ] **Step 4 : Commit**

```bash
git add src/hooks/use-follows.ts src/components/profile src/pages
git commit -m "feat(recablage): follows + friends/followers by current actor (*_actor, actor_public)"
```

---

## Task 4 : Recâble `use-participations.ts` + écritures

**Files :** Modify `src/hooks/use-participations.ts` ; call sites `src/pages/EventPage.tsx`, `src/components/events/ParticipantsModal.tsx`

> Participations au nom de l'acteur courant : lecture `user_id`→`actor_id`, jointures `profiles(...)`→`actor_public`, `get_friend_ids(currentActor.id)`. Écriture : `addParticipation` reçoit déjà un objet ; les **callers** doivent y mettre `actor_id: currentActor.id` + `acted_by_user_id: user.id` (au lieu de `user_id`).

- [ ] **Step 1 : Remplacer le contenu de `use-participations.ts`**

```tsx
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Participation, ParticipationInsert, ParticipationWithEvent } from '@/types/database'

export function useMyParticipations(year?: number) {
  const { currentActor } = useAuth()
  const [participations, setParticipations] = useState<ParticipationWithEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchParticipations = useCallback(async () => {
    if (!currentActor) { setLoading(false); return }
    setLoading(true)
    try {
      const { data } = await supabase
        .from('participations')
        .select('*, events(*)')
        .eq('actor_id', currentActor.id)
        .order('created_at', { ascending: false })
      setParticipations((data as ParticipationWithEvent[] | null) ?? [])
    } catch { setParticipations([]) }
    setLoading(false)
  }, [currentActor])

  useEffect(() => {
    if (!currentActor) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchParticipations()
  }, [currentActor, year, fetchParticipations])

  return { participations, loading, refetch: fetchParticipations }
}

export type FriendParticipation = { id: string; event_id: string; actor_id: string; status: string; events?: { name: string; [key: string]: unknown }; actor_public?: { label: string | null; avatar_url: string | null; public_slug: string | null; entity_type: string | null; kind: string } }

export function useFriendsParticipations() {
  const { currentActor } = useAuth()
  const [participations, setParticipations] = useState<FriendParticipation[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFriendsParticipations = useCallback(async () => {
    if (!currentActor) return
    setLoading(true)
    const { data: friendRows } = await supabase.rpc('get_friend_ids', { p_user_id: currentActor.id })
    const friendIds = friendRows as string[] | null
    if (!friendIds || friendIds.length === 0) { setParticipations([]); setLoading(false); return }
    const { data } = await supabase
      .from('participations')
      .select('*, events(*), actor_public(label, avatar_url, public_slug, entity_type, kind)')
      .in('actor_id', friendIds)
      .in('visibility', ['amis', 'public'])
      .order('created_at', { ascending: false })
      .limit(50)
    setParticipations((data as FriendParticipation[] | null) ?? [])
    setLoading(false)
  }, [currentActor])

  useEffect(() => {
    if (!currentActor) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFriendsParticipations()
  }, [currentActor, fetchFriendsParticipations])

  return { participations, loading, refetch: fetchFriendsParticipations }
}

export async function addParticipation(participation: ParticipationInsert) {
  const { data, error } = await supabase.from('participations').insert(participation).select().single()
  return { data, error }
}

export async function updateParticipation(id: string, updates: Partial<Participation>) {
  const { data, error } = await supabase.from('participations').update(updates).eq('id', id).select().single()
  return { data, error }
}

export async function removeParticipation(id: string) {
  const { error } = await supabase.from('participations').delete().eq('id', id)
  return { error }
}

export function useFriendsOnEvent(eventId: string | undefined) {
  const { currentActor } = useAuth()
  const [friends, setFriends] = useState<{ actor_id: string; label: string | null; avatar_url: string | null; public_slug: string | null; status: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- early-exit synchronous reset
    if (!currentActor || !eventId) { setLoading(false); return }
    const resolvedEventId = eventId
    async function fetch() {
      const { data: friendIds } = await supabase.rpc('get_friend_ids', { p_user_id: currentActor!.id })
      if (!friendIds || (friendIds as string[]).length === 0) { setFriends([]); setLoading(false); return }
      const { data } = await supabase
        .from('participations')
        .select('status, actor_public(actor_id, label, avatar_url, public_slug)')
        .eq('event_id', resolvedEventId)
        .in('actor_id', friendIds as string[])
      const result = (data ?? []).map((p: { status: string; actor_public: { actor_id: string; label: string | null; avatar_url: string | null; public_slug: string | null } }) => ({
        ...p.actor_public, status: p.status,
      }))
      setFriends(result)
      setLoading(false)
    }
    fetch()
  }, [currentActor, eventId])

  return { friends, loading }
}
```

> Note PostgREST : la jointure `actor_public(...)` sur `participations` nécessite une relation détectable. Comme `actor_public` est une vue sans FK, PostgREST ne l'infère pas automatiquement. **Si la jointure imbriquée échoue** (erreur "could not find a relationship"), fallback : récupérer les participations puis charger `actor_public` par `in('actor_id', ids)` en 2e requête (même motif que `useMyFollowers`). Vérifier au smoke (Task 9) et adapter si besoin.

- [ ] **Step 2 : Adapter les call sites d'écriture.** Dans `src/pages/EventPage.tsx`, l'objet passé à `addParticipation(...)` qui contenait `user_id: <id>` devient `actor_id: currentActor.id, acted_by_user_id: user.id` (ajouter `const { currentActor, user } = useAuth()` si absent). Idem pour toute création de participation. Dans `ParticipantsModal.tsx`, l'appel `get_friend_ids({ p_user_id: user.id })` devient `{ p_user_id: currentActor.id }`, et la jointure `profiles(...)` → `actor_public(...)` (ou 2 requêtes en fallback) ; lectures de champ `profiles.display_name`→`actor_public.label`.

- [ ] **Step 3 : Build + lint** — `pnpm build && pnpm lint` → 0 erreur (corriger les accès de champ résiduels : `participation.profiles`→`participation.actor_public`, `.display_name`→`.label`).
- [ ] **Step 4 : Commit**

```bash
git add src/hooks/use-participations.ts src/pages/EventPage.tsx src/components/events/ParticipantsModal.tsx
git commit -m "feat(recablage): participations by current actor (actor_id + acted_by + actor_public joins)"
```

---

## Task 5 : Recâble `use-reviews.ts` + `use-reports.ts` + écritures

**Files :** Modify `src/hooks/use-reviews.ts`, `src/hooks/use-reports.ts` ; call sites des formulaires (review/report)

> Avis & bilans au nom de l'acteur courant. Lecture `user_id`→`actor_id`, conflit upsert `(user_id,event_id)`→`(actor_id,event_id)`, jointures `profiles`→`actor_public`. **Important :** `canSeeDetails` (gating Pro) lisait `profile.type/plan` — on bascule sur `person.plan` (le gating détaillé vit en 3A.1, mais ce drapeau de hook reste utile) : `canSeeDetails = currentActor?.kind==='entity' && person?.plan === 'pro'`.

- [ ] **Step 1 : Remplacer `use-reviews.ts`**

```tsx
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Review, ReviewInsert } from '@/types/database'

export function useEventReviews(eventId: string | undefined) {
  const { currentActor, person } = useAuth()
  type ReviewWithActor = Review & { actor_public: { label: string | null; entity_type: string | null } }
  const [reviews, setReviews] = useState<ReviewWithActor[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReviews = useCallback(async () => {
    if (!eventId) return
    const { data } = await supabase
      .from('reviews')
      .select('*, actor_public(label, entity_type)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
    setReviews((data as ReviewWithActor[] | null) ?? [])
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    if (!eventId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReviews()
  }, [eventId, fetchReviews])

  const canSeeDetails = currentActor?.kind === 'entity' && person?.plan === 'pro'

  return { reviews, loading, canSeeDetails, refetch: fetchReviews }
}

export function useMyReview(eventId: string | undefined) {
  const { currentActor } = useAuth()
  const [review, setReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!eventId || !currentActor) return
    supabase.from('reviews').select('*')
      .eq('event_id', eventId).eq('actor_id', currentActor.id).maybeSingle()
      .then(({ data }) => { setReview(data); setLoading(false) })
  }, [eventId, currentActor])

  return { review, loading }
}

export async function submitReview(review: ReviewInsert) {
  const { data, error } = await supabase
    .from('reviews')
    .upsert(review, { onConflict: 'actor_id,event_id' })
    .select().single()
  return { data, error }
}
```

> Note jointure `actor_public` : même remarque que Task 4 (fallback 2 requêtes si PostgREST n'infère pas la relation).

- [ ] **Step 2 : Remplacer `use-reports.ts`**

```tsx
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { EventReport, EventReportInsert } from '@/types/database'

export function useEventReport(eventId: string | undefined) {
  const { currentActor } = useAuth()
  const [report, setReport] = useState<EventReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!eventId || !currentActor) return
    supabase.from('event_reports').select('*')
      .eq('event_id', eventId).eq('actor_id', currentActor.id).maybeSingle()
      .then(({ data }) => { setReport(data); setLoading(false) })
  }, [eventId, currentActor])

  return { report, loading }
}

export async function saveEventReport(report: EventReportInsert) {
  const { data, error } = await supabase
    .from('event_reports')
    .upsert(report, { onConflict: 'actor_id,event_id' })
    .select().single()
  return { data, error }
}
```

- [ ] **Step 3 : Adapter les call sites.** Le formulaire d'avis (qui appelle `submitReview`) doit construire l'objet avec `actor_id: currentActor.id, acted_by_user_id: user.id` (au lieu de `user_id`). Le formulaire de bilan (`src/components/reports/EventReportForm.tsx`, appelle `saveEventReport`) idem : `actor_id: currentActor.id, acted_by_user_id: user.id`. Lectures de champ `review.profiles`→`review.actor_public`, `.display_name`/`.brand_name`→`.label`.
- [ ] **Step 4 : Build + lint** — `pnpm build && pnpm lint` → 0 erreur.
- [ ] **Step 5 : Commit**

```bash
git add src/hooks/use-reviews.ts src/hooks/use-reports.ts src/components/reports src/components/reviews src/pages/EventPage.tsx
git commit -m "feat(recablage): reviews + reports by current actor (actor_id + acted_by)"
```

---

## Task 6 : Recâble `use-notes.ts` + écriture/ownership

**Files :** Modify `src/hooks/use-notes.ts`, `src/components/notes/NoteForm.tsx`, `src/components/notes/NotesFeed.tsx`

> Notes au nom de l'acteur courant. Jointure auteur `profiles`→`actor_public`. Écriture : `actor_id: currentActor.id, acted_by_user_id: user.id`. Ownership (bouton supprimer) : comparer `note.actor_id === currentActor.id`.

- [ ] **Step 1 : Remplacer `use-notes.ts`**

```tsx
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { NoteWithAuthor, NoteInsert } from '@/types/database'

export function useEventNotes(eventId: string | undefined) {
  const [notes, setNotes] = useState<NoteWithAuthor[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotes = useCallback(async () => {
    if (!eventId) return
    const { data } = await supabase
      .from('notes')
      .select('*, actor_public(actor_id, label, avatar_url, entity_type, kind)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
    setNotes((data as NoteWithAuthor[] | null) ?? [])
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    if (!eventId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotes()
  }, [eventId, fetchNotes])

  return { notes, loading, refetch: fetchNotes }
}

export async function createNote(note: NoteInsert) {
  const { data, error } = await supabase
    .from('notes')
    .insert(note)
    .select('*, actor_public(actor_id, label, avatar_url, entity_type, kind)')
    .single()
  return { data, error }
}

export async function deleteNote(id: string) {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  return { error }
}
```

- [ ] **Step 2 : `NoteForm.tsx`** — l'objet passé à `createNote` devient `{ actor_id: currentActor.id, acted_by_user_id: user.id, event_id, content, visibility }` (ajouter `const { currentActor, user } = useAuth()`).
- [ ] **Step 3 : `NotesFeed.tsx`** — la comparaison d'ownership `note.user_id === user?.id` devient `note.actor_id === currentActor?.id` (ajouter `currentActor` depuis `useAuth`). Les lectures `note.profiles`→`note.actor_public`, `.display_name`→`.label`. Mettre à jour le type `NoteWithAuthor` dans `src/types/database.ts` : remplacer `profiles: Profile` par `actor_public: { actor_id: string; label: string | null; avatar_url: string | null; entity_type: string | null; kind: string }`.
- [ ] **Step 4 : Build + lint** — `pnpm build && pnpm lint` → 0 erreur.
- [ ] **Step 5 : Commit**

```bash
git add src/hooks/use-notes.ts src/components/notes src/types/database.ts
git commit -m "feat(recablage): notes by current actor (actor_id + acted_by, actor_public author)"
```

---

## Task 7 : Recâble `use-notifications.ts`

**Files :** Modify `src/hooks/use-notifications.ts`

> Les notifications sont adressées à un acteur (destinataire). `user_id`→`actor_id` = `currentActor.id`.

- [ ] **Step 1 : Modifier les 3 références.** Remplacer `const { user } = useAuth()` par `const { currentActor } = useAuth()`. Dans `fetchNotifications` : `if (!currentActor) return` et `.eq('actor_id', currentActor.id)`. Dans `markAllAsRead` : `if (!currentActor) return` et `.eq('actor_id', currentActor.id).eq('read', false)`. Mettre `currentActor` dans la dep de `useCallback(fetchNotifications, [currentActor])` et de l'effet.

```tsx
// en tête de useNotifications:
  const { currentActor } = useAuth()
  // fetchNotifications:
  const fetchNotifications = useCallback(async () => {
    if (!currentActor) return
    const { data } = await supabase
      .from('notifications').select('*')
      .eq('actor_id', currentActor.id)
      .order('created_at', { ascending: false }).limit(50)
    const notifs = data ?? []
    setNotifications(notifs)
    setUnreadCount(notifs.filter(n => !n.read).length)
    setLoading(false)
  }, [currentActor])
  // effet: dépend de [currentActor, fetchNotifications]
  // markAllAsRead:
  async function markAllAsRead() {
    if (!currentActor) return
    await supabase.from('notifications').update({ read: true }).eq('actor_id', currentActor.id).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }
```

- [ ] **Step 2 : Build + lint** — `pnpm build && pnpm lint` → 0 erreur.
- [ ] **Step 3 : Commit**

```bash
git add src/hooks/use-notifications.ts
git commit -m "feat(recablage): notifications addressed to current actor (actor_id)"
```

---

## Task 8 : Création d'event + suivi/notifs + résolution slug vitrine

**Files :** Modify `src/components/events/EventForm.tsx`, `src/components/profile/FollowersModal.tsx`, `src/components/notifications/NotificationItem.tsx`, `src/pages/PublicProfile.tsx`, `src/pages/Embed.tsx`

- [ ] **Step 1 : `EventForm.tsx`** — à la création d'event, `created_by: profile.id` devient `created_by_actor: currentActor.id, acted_by_user_id: user.id` (ajouter `const { currentActor, user } = useAuth()`).
- [ ] **Step 2 : Suivre depuis modale/notif.** Dans `FollowersModal.tsx` et `NotificationItem.tsx`, les `insert({ follower_id: user.id, following_id: X })` deviennent `insert({ follower_actor: currentActor.id, following_actor: X })` (`X` = l'actor_id cible, déjà un id d'acteur). Ajouter `currentActor` depuis `useAuth`.
- [ ] **Step 3 : Résolution slug vitrine.** Dans `PublicProfile.tsx` : la requête `from('profiles').select('*').eq('public_slug', slug)` devient `from('entities').select('*').eq('public_slug', slug)` (la vitrine = une entité) ; les lectures suivantes utilisent l'`actor_id` de l'entité (participations `.eq('actor_id', entity.actor_id)`, followers `.eq('following_actor', entity.actor_id)`, `get_friends_with_dates({ p_user_id: entity.actor_id })`). Idem `Embed.tsx` : `from('entities')...eq('public_slug', slug)` et participations par `actor_id`.
- [ ] **Step 4 : Build + lint** — `pnpm build && pnpm lint` → 0 erreur (corriger les accès de champ `profile.*` → `entity.*` ; `brand_name`/`display_name` selon le contexte).
- [ ] **Step 5 : Commit**

```bash
git add src/components/events/EventForm.tsx src/components/profile/FollowersModal.tsx src/components/notifications/NotificationItem.tsx src/pages/PublicProfile.tsx src/pages/Embed.tsx
git commit -m "feat(recablage): event creation, follow actions, vitrine slug resolution on actor model"
```

---

## Task 9 : Smoke API — écritures au nom de l'acteur courant

**Files :** aucun fichier commité (script jetable).

- [ ] **Step 1 : Créer `smoke3a2.mjs`** à la racine

```javascript
import { createClient } from '@supabase/supabase-js'
const URL='http://127.0.0.1:54321', KEY='sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH', MAILPIT='http://127.0.0.1:54324'
const sb=createClient(URL,KEY)
const fail=(m)=>{console.error('❌',m);process.exit(1)}
async function login(){
  const email=`r2_${Date.now()}_${Math.random().toString(36).slice(2,6)}@flwsh.dev`
  await sb.auth.signInWithOtp({email,options:{shouldCreateUser:true}})
  await new Promise(r=>setTimeout(r,800))
  const list=await fetch(`${MAILPIT}/api/v1/messages`).then(r=>r.json())
  const msg=list.messages.find(m=>m.To.some(t=>t.Address===email))
  const body=await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`).then(r=>r.json())
  const token=(body.Text||body.HTML).match(/\b(\d{6})\b/)[1]
  const {data:vs}=await sb.auth.verifyOtp({email,token,type:'email'})
  return vs.user.id
}
const uid=await login()
// crée une entité (acteur courant = entité)
const {data:entId}=await sb.rpc('create_owned_entity',{p_type:'exposant',p_brand_name:'RC',p_public_slug:'rc-'+Date.now()})
// un event pour participer
const {data:ev}=await sb.from('events').insert({name:'Test',city:'Lyon',department:'69',start_date:'2026-07-01',end_date:'2026-07-02',primary_tag:'marche',created_by_actor:entId,acted_by_user_id:uid}).select().single()
// participation AU NOM DE L'ENTITÉ
const {error:pe}=await sb.from('participations').insert({actor_id:entId,event_id:ev.id,status:'inscrit',acted_by_user_id:uid})
if(pe)fail('participation: '+pe.message)
const {data:p}=await sb.from('participations').select('actor_id,acted_by_user_id').eq('event_id',ev.id).eq('actor_id',entId).single()
if(p.actor_id!==entId||p.acted_by_user_id!==uid)fail('participation mal écrite: '+JSON.stringify(p))
// actor_public lit l'entité
const {data:ap}=await sb.from('actor_public').select('*').eq('actor_id',entId).single()
if(ap.kind!=='entity'||ap.label!=='RC')fail('actor_public KO: '+JSON.stringify(ap))
console.log('✅ SMOKE 3A.2 PASS — participation au nom de l\'entité (actor_id) + audit acted_by + actor_public:',{actor:p.actor_id===entId,acted_by:p.acted_by_user_id===uid,label:ap.label})
process.exit(0)
```

- [ ] **Step 2 : Lancer** — `node smoke3a2.mjs` → attendu `✅ SMOKE 3A.2 PASS`. Si échec, NE PAS supprimer, reporter BLOCKED avec l'erreur.
- [ ] **Step 3 : Nettoyer** — `rm -f smoke3a2.mjs`.

---

## Auto-vérification (après écriture)
- **Couverture spec (Partie 2)** : participations/follows/reviews/notes/reports/notifications/events → `actor_id`/`*_actor` (Tasks 2-8) ✓ ; `acted_by_user_id` à chaque écriture (Tasks 4-8) ✓ ; hooks re-fetch sur `currentActor` (deps) ✓ ; vues/RPC sociales sur `*_actor` + `actor_public` (Task 1) ✓ ; slug vitrine → `entities` (Task 8) ✓ ; affichages « qui » via `actor_public` (Tasks 3-6) ✓.
- **Hors périmètre** : sélecteur/nav/gating (3A.1), contract/NOT NULL/drop (Plan 4). `event_scores` inchangé (pas de user_id).

## Risques & rollback
| Risque | Mitigation |
|---|---|
| PostgREST n'infère pas la jointure `actor_public` (vue sans FK) | Fallback 2 requêtes (in `actor_id`) — noté dans Tasks 4/5/6 ; smoke valide. |
| Accès de champ résiduels (`profiles.display_name`) après bascule | `pnpm build` (tsc) les fait échouer → corriger en `actor_public.label`. |
| Régression compagnons (vues legacy→actor) | Réécriture en place + smoke ; colonnes legacy conservées (rollback = Plan 4 non fait). |
| Membre non-owner & gating Pro | `canSeeDetails` lit `person.plan` (cas owner) ; raffiné en 3C. |
