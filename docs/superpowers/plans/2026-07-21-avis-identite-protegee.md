# Avis à identité protégée — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protéger l'identité des auteurs d'avis (nom visible aux amis pro uniquement, jamais aux organisateurs, opt-in anonymat total), adossée à une vérification de participation — via une RPC de lecture qui masque l'`actor_id`, puis verrouillage de la lecture directe.

**Architecture:** Le contenu des avis reste public ; l'identité est révélée par une RPC `SECURITY DEFINER` (`get_event_reviews`) seulement si (ami mutuel ET pas un acteur de type festival ET avis non-anonyme). Le front lit via la RPC au lieu de `reviews` en direct. L'écriture d'un avis exige une participation `inscrit`. En toute fin, on révoque la lecture directe qui laissait fuir l'`actor_id`.

**Tech Stack:** Supabase/Postgres (migrations CLI, prod live), React 19 + TS, Vitest (fonctions pures).

## Global Constraints

- **Prod live, feature revenue-critique** (`reference_supabase_mcp_is_prod`). Les avis sont utilisés par des clientes payantes. **Ordre non négociable** : (1) DB additive + RPC, (2) front qui lit via la RPC — **déployé et vérifié**, (3) SEULEMENT ENSUITE le verrou (revoke lecture directe). Le revoke est la **dernière** tâche et **NE DOIT PAS être poussé sans validation d'Uriel** (risque de casser les avis en prod).
- **OAuth MCP cassé** → migrations via le **CLI lié** : binaire `node_modules/supabase/bin/supabase.exe` ou `npx --no-install supabase`, tokens exportés depuis `.env` (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`), `echo "y" | ... db push --linked`. **Prévenir Uriel avant chaque push.**
- **Modèle acteur** : autorisation via `can_act_as(actor_id)`, amitié via `are_friends(a, b)` (`SECURITY DEFINER`, déjà en place, = follow mutuel), admin via `is_admin()`. Ne pas retomber sur du legacy `user_id`.
- **Carve-out organisateur = par type d'acteur** : un lecteur dont l'acteur actif est une entité `type = 'festival'` ne voit jamais l'identité (sur aucun avis).
- **Présence acquise = `participations.status = 'inscrit'`** (même critère que `src/lib/cockpit.ts`).
- **Colonnes de score `reviews`** : `affluence`, `organisation`, `rentabilite` (SMALLINT 1-5), `comment` (text), + `actor_id`, `event_id`, `created_at`. Unicité `(actor_id, event_id)`.
- **Tests** : fonctions pures uniquement (contrainte RTL, `reference_react_test_infra`). Composants vérifiés par `pnpm build`.
- **Types Supabase** : nouvelles RPC → `(supabase.rpc as any)` (précédent projet, `reference_supabase_rpc_types`) + `// eslint-disable-next-line @typescript-eslint/no-explicit-any`.
- **DA** : tokens app, verre, pas de scroll interne. Réutiliser `ReviewAvatar`.
- **Auto-commit + bump** `package.json` après changement de code.
- **Spec** : `docs/superpowers/specs/2026-07-21-avis-identite-protegee-design.md`.

---

### Task 1: Migration — colonne `anonymous` + écriture gatée sur la participation

**Files:**
- Create: `supabase/migrations/20260721160000_reviews_anonymous_and_participation_gate.sql`

**Interfaces:**
- Produces (DB) : `reviews.anonymous boolean NOT NULL DEFAULT false` ; policies d'écriture `reviews` INSERT/UPDATE gatées `can_act_as` + participation `inscrit` ; DELETE `can_act_as`.

- [ ] **Step 1: Écrire la migration**

```sql
-- Avis à identité protégée — partie 1 (additive, non cassante).
-- 1) opt-in "anonyme total" par avis. 2) écriture gatée sur une participation inscrit.

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS anonymous boolean NOT NULL DEFAULT false;

-- Remplacer la policy d'écriture "ALL" par des policies explicites avec gate participation.
-- (SELECT reste porté par reviews_select_scores USING(true) — verrouillé plus tard.)
DROP POLICY IF EXISTS reviews_write_actor ON public.reviews;

-- INSERT : acteur contrôlé ET présence acquise (inscrit) sur cet event.
CREATE POLICY reviews_insert_verified ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    can_act_as(actor_id)
    AND EXISTS (
      SELECT 1 FROM public.participations p
      WHERE p.actor_id = reviews.actor_id
        AND p.event_id = reviews.event_id
        AND p.status = 'inscrit'
    )
  );

-- UPDATE : idem (éditer son avis suppose toujours la participation).
CREATE POLICY reviews_update_verified ON public.reviews
  FOR UPDATE TO authenticated
  USING (can_act_as(actor_id))
  WITH CHECK (
    can_act_as(actor_id)
    AND EXISTS (
      SELECT 1 FROM public.participations p
      WHERE p.actor_id = reviews.actor_id
        AND p.event_id = reviews.event_id
        AND p.status = 'inscrit'
    )
  );

-- DELETE : son propre avis OU admin (modération).
CREATE POLICY reviews_delete_own ON public.reviews
  FOR DELETE TO authenticated
  USING (can_act_as(actor_id) OR public.is_admin());
```

- [ ] **Step 2: Vérifier l'état de synchro, prévenir Uriel, pousser**

```bash
export SUPABASE_ACCESS_TOKEN="$(grep '^SUPABASE_ACCESS_TOKEN=' .env | sed 's/^SUPABASE_ACCESS_TOKEN=//; s/\r$//; s/^"//; s/"$//')"
export SUPABASE_DB_PASSWORD="$(grep '^SUPABASE_DB_PASSWORD=' .env | sed 's/^SUPABASE_DB_PASSWORD=//; s/\r$//; s/^"//; s/"$//')"
npx --no-install supabase migration list --linked   # les nouvelles = remote vide
echo "y" | npx --no-install supabase db push --linked
```
Expected: migration appliquée.

- [ ] **Step 3: Vérifier**

`npx --no-install supabase db execute --sql "SELECT column_name FROM information_schema.columns WHERE table_name='reviews' AND column_name='anonymous';"` → 1 ligne. (Ou via SQL editor si `db execute` indispo.)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260721160000_reviews_anonymous_and_participation_gate.sql
git commit -m "feat(db): reviews.anonymous + écriture gatée sur participation inscrit"
```

---

### Task 2: Migration — RPC de lecture à identité gatée (`get_event_reviews`, `get_review_replies`)

**Files:**
- Create: `supabase/migrations/20260721160100_reviews_identity_rpc.sql`

**Interfaces:**
- Consumes (DB) : `can_act_as`, `are_friends`, `actor_public`, `entities`.
- Produces (DB) : `get_event_reviews(p_event_id uuid, p_viewer_actor uuid)` et `get_review_replies(p_review_id uuid, p_viewer_actor uuid)`, `GRANT EXECUTE ... TO authenticated`.

- [ ] **Step 1: Écrire la migration**

```sql
-- Avis à identité protégée — partie 2 : RPC de lecture qui décide de révéler l'identité.
-- Règle : identité visible SSI (soi-même) OU (avis non-anonyme ET lecteur non-festival ET ami mutuel).
-- p_viewer_actor = acteur actif du lecteur, validé par can_act_as (anti-usurpation).

CREATE OR REPLACE FUNCTION public.get_event_reviews(p_event_id uuid, p_viewer_actor uuid)
RETURNS TABLE (
  review_id uuid, event_id uuid,
  affluence smallint, organisation smallint, rentabilite smallint,
  comment text, created_at timestamptz, anonymous boolean,
  is_self boolean, identity_visible boolean,
  author_actor_id uuid, author_label text, author_avatar_url text, author_slug text
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_viewer uuid;
  v_is_festival boolean;
BEGIN
  IF p_viewer_actor IS NOT NULL AND can_act_as(p_viewer_actor) THEN
    v_viewer := p_viewer_actor;
  ELSE
    v_viewer := NULL;                 -- acteur non contrôlé -> traité en lecteur anonyme
  END IF;
  v_is_festival := v_viewer IS NOT NULL AND EXISTS (
    SELECT 1 FROM entities e WHERE e.actor_id = v_viewer AND e.type = 'festival'
  );

  RETURN QUERY
  SELECT
    r.id, r.event_id, r.affluence, r.organisation, r.rentabilite,
    r.comment, r.created_at, r.anonymous,
    vis.self AS is_self,
    vis.visible AS identity_visible,
    CASE WHEN vis.visible THEN r.actor_id END,
    CASE WHEN vis.visible THEN ap.label END,
    CASE WHEN vis.visible THEN ap.avatar_url END,
    CASE WHEN vis.visible THEN ap.public_slug END
  FROM reviews r
  LEFT JOIN actor_public ap ON ap.actor_id = r.actor_id
  CROSS JOIN LATERAL (
    SELECT
      (v_viewer IS NOT NULL AND can_act_as(r.actor_id)) AS self,
      (
        (v_viewer IS NOT NULL AND can_act_as(r.actor_id))
        OR ( r.anonymous = false AND NOT v_is_festival
             AND v_viewer IS NOT NULL AND are_friends(v_viewer, r.actor_id) )
      ) AS visible
  ) vis
  WHERE r.event_id = p_event_id
  ORDER BY r.created_at DESC;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_event_reviews(uuid, uuid) TO authenticated;

-- Réponses aux avis : même logique d'identité (pas de badge "présent" côté front, géré à l'affichage).
CREATE OR REPLACE FUNCTION public.get_review_replies(p_review_id uuid, p_viewer_actor uuid)
RETURNS TABLE (
  reply_id uuid, review_id uuid, body text, created_at timestamptz, updated_at timestamptz,
  is_self boolean, identity_visible boolean,
  author_actor_id uuid, author_label text, author_avatar_url text, author_slug text
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_viewer uuid;
  v_is_festival boolean;
BEGIN
  IF p_viewer_actor IS NOT NULL AND can_act_as(p_viewer_actor) THEN
    v_viewer := p_viewer_actor;
  ELSE
    v_viewer := NULL;
  END IF;
  v_is_festival := v_viewer IS NOT NULL AND EXISTS (
    SELECT 1 FROM entities e WHERE e.actor_id = v_viewer AND e.type = 'festival'
  );

  RETURN QUERY
  SELECT
    rr.id, rr.review_id, rr.body, rr.created_at, rr.updated_at,
    vis.self, vis.visible,
    CASE WHEN vis.visible THEN rr.actor_id END,
    CASE WHEN vis.visible THEN ap.label END,
    CASE WHEN vis.visible THEN ap.avatar_url END,
    CASE WHEN vis.visible THEN ap.public_slug END
  FROM review_replies rr
  LEFT JOIN actor_public ap ON ap.actor_id = rr.actor_id
  CROSS JOIN LATERAL (
    SELECT
      (v_viewer IS NOT NULL AND can_act_as(rr.actor_id)) AS self,
      (
        (v_viewer IS NOT NULL AND can_act_as(rr.actor_id))
        OR ( NOT v_is_festival AND v_viewer IS NOT NULL AND are_friends(v_viewer, rr.actor_id) )
      ) AS visible
  ) vis
  WHERE rr.review_id = p_review_id
  ORDER BY rr.created_at ASC;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_review_replies(uuid, uuid) TO authenticated;
```

- [ ] **Step 2: Pousser** (même recette CLI qu'en Task 1).

- [ ] **Step 3: Vérifier**

`npx --no-install supabase db execute --sql "SELECT proname FROM pg_proc WHERE proname IN ('get_event_reviews','get_review_replies');"` → 2 lignes.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260721160100_reviews_identity_rpc.sql
git commit -m "feat(db): RPC get_event_reviews / get_review_replies à identité gatée"
```

---

### Task 3: Fonctions pures `lib/review-visibility.ts` (TDD)

**Files:**
- Create: `src/lib/review-visibility.ts`
- Test: `src/lib/review-visibility.test.ts`

**Interfaces:**
- Produces :
  - `type ReviewIdentityRow = { is_self: boolean; identity_visible: boolean; author_label: string | null; author_avatar_url: string | null; author_slug: string | null }`
  - `reviewerDisplay(row: ReviewIdentityRow, opts?: { anonLabel?: string }): { mode: 'self' | 'named' | 'anonymous'; label: string; avatarUrl: string | null; slug: string | null }`
  - `canReview(participationStatus: string | null | undefined): boolean`

- [ ] **Step 1: Écrire les tests (échec attendu)**

```ts
import { describe, it, expect } from 'vitest'
import { reviewerDisplay, canReview } from './review-visibility'

const base = { author_label: 'Rune de Chêne', author_avatar_url: 'a.jpg', author_slug: 'rune' }

describe('reviewerDisplay', () => {
  it('self → mode self avec le nom', () => {
    expect(reviewerDisplay({ ...base, is_self: true, identity_visible: true }).mode).toBe('self')
  })
  it('ami (identity_visible) → named', () => {
    const d = reviewerDisplay({ ...base, is_self: false, identity_visible: true })
    expect(d.mode).toBe('named'); expect(d.label).toBe('Rune de Chêne'); expect(d.slug).toBe('rune')
  })
  it('non-ami (identity masquée) → anonymous, pas de slug/avatar', () => {
    const d = reviewerDisplay({ author_label: null, author_avatar_url: null, author_slug: null, is_self: false, identity_visible: false })
    expect(d.mode).toBe('anonymous'); expect(d.label).toBe('Un exposant vérifié')
    expect(d.slug).toBeNull(); expect(d.avatarUrl).toBeNull()
  })
  it('anonLabel personnalisable (réponses)', () => {
    const d = reviewerDisplay({ author_label: null, author_avatar_url: null, author_slug: null, is_self: false, identity_visible: false }, { anonLabel: 'Un exposant' })
    expect(d.label).toBe('Un exposant')
  })
})

describe('canReview', () => {
  it('vrai seulement si inscrit', () => {
    expect(canReview('inscrit')).toBe(true)
    expect(canReview('interesse')).toBe(false)
    expect(canReview(null)).toBe(false)
    expect(canReview(undefined)).toBe(false)
  })
})
```

- [ ] **Step 2: Lancer → échec**

Run: `pnpm vitest run src/lib/review-visibility.test.ts` → FAIL (module absent).

- [ ] **Step 3: Implémenter**

```ts
export type ReviewIdentityRow = {
  is_self: boolean
  identity_visible: boolean
  author_label: string | null
  author_avatar_url: string | null
  author_slug: string | null
}

/** Centralise l'affichage de l'auteur d'un avis / d'une réponse selon ce que la RPC a révélé. */
export function reviewerDisplay(
  row: ReviewIdentityRow,
  opts?: { anonLabel?: string },
): { mode: 'self' | 'named' | 'anonymous'; label: string; avatarUrl: string | null; slug: string | null } {
  if (row.is_self) {
    return { mode: 'self', label: row.author_label ?? 'Toi', avatarUrl: row.author_avatar_url, slug: row.author_slug }
  }
  if (row.identity_visible) {
    return { mode: 'named', label: row.author_label ?? 'Un exposant', avatarUrl: row.author_avatar_url, slug: row.author_slug }
  }
  return { mode: 'anonymous', label: opts?.anonLabel ?? 'Un exposant vérifié', avatarUrl: null, slug: null }
}

/** Peut laisser un avis seulement si présence acquise (inscrit) sur cette édition. */
export function canReview(participationStatus: string | null | undefined): boolean {
  return participationStatus === 'inscrit'
}
```

- [ ] **Step 4: Lancer → succès**

Run: `pnpm vitest run src/lib/review-visibility.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/review-visibility.ts src/lib/review-visibility.test.ts
git commit -m "feat(reviews): fonctions pures d'affichage identité + gate participation"
```

---

### Task 4: `use-reviews` — lecture via RPC + champ `anonymous`

**Files:**
- Modify: `src/hooks/use-reviews.ts`

**Interfaces:**
- Consumes : `get_event_reviews` (Task 2), `reviewerDisplay` (Task 3), `useAuth().currentActor`.
- Produces : `useEventReviews` renvoie des lignes avec `is_self`, `identity_visible`, `author_*` (au lieu du join `actor_public` client). Type `ReviewWithActor` adapté. `submitReview` accepte `anonymous`.

- [ ] **Step 1: Réécrire `useEventReviews` pour lire via la RPC**

Remplacer le corps de `fetchReviews` : appeler `get_event_reviews(p_event_id, p_viewer_actor = currentActor?.id)` au lieu de `from('reviews').select('*')` + join `actor_public`. Mapper les colonnes RPC (`review_id`→`id`, scores, `comment`, `created_at`, `anonymous`, `is_self`, `identity_visible`, `author_label/avatar/slug`).

```ts
// dans fetchReviews (remplace le bloc from('reviews') + join actor_public) :
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { data: rows } = await (supabase.rpc as any)('get_event_reviews', {
  p_event_id: eventId, p_viewer_actor: currentActor?.id ?? null,
})
const list = ((rows as Array<Record<string, unknown>> | null) ?? []).map(r => ({
  id: r.review_id as string,
  event_id: r.event_id as string,
  affluence: r.affluence as number,
  organisation: r.organisation as number,
  rentabilite: r.rentabilite as number,
  comment: (r.comment as string | null) ?? null,
  created_at: r.created_at as string,
  anonymous: r.anonymous as boolean,
  is_self: r.is_self as boolean,
  identity_visible: r.identity_visible as boolean,
  author_label: (r.author_label as string | null) ?? null,
  author_avatar_url: (r.author_avatar_url as string | null) ?? null,
  author_slug: (r.author_slug as string | null) ?? null,
}))
setReviews(list)
```

Adapter le type exporté (remplacer `ReviewWithActor` par un type reflétant ces champs ; garder le nom `ReviewWithActor` si des composants l'importent, mais avec les nouveaux champs `is_self`/`identity_visible`/`author_*`). Ajouter `currentActor?.id` aux deps du `useCallback`/`useEffect`.

- [ ] **Step 2: `submitReview` accepte `anonymous`**

Étendre le type d'entrée d'upsert pour inclure `anonymous?: boolean` (défaut false). L'upsert `onConflict: 'actor_id,event_id'` reste inchangé. `useMyReview` doit renvoyer aussi `anonymous` (pour précocher la case) — ajouter `anonymous` au `select('*')` (déjà `*`, donc OK) et au type.

- [ ] **Step 3: Build**

Run: `pnpm build` → doit compiler. Les composants consommateurs seront ajustés en Task 5 ; si le build casse sur eux, faire les ajustements minimaux de type nécessaires (ne pas changer le rendu ici).

> Note : garder l'ancien `from('reviews')` pour `useMyReview`/`deleteReview` (lecture de SON propre avis, autorisée) — le verrouillage final (Task 8) ne révoquera que ce qui fait fuiter l'`actor_id` d'AUTRUI ; lire son propre avis via `.eq('actor_id', currentActor.id)` reste possible (à confirmer selon l'option de revoke retenue en Task 8).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-reviews.ts
git commit -m "feat(reviews): lecture via RPC get_event_reviews (identité gatée) + champ anonymous"
```

---

### Task 5: `use-review-replies` — lecture via RPC

**Files:**
- Modify: `src/hooks/use-review-replies.ts`

**Interfaces:**
- Consumes : `get_review_replies` (Task 2).
- Produces : `useReviewReplies` lit via la RPC (identité gatée) ; type `ReplyWithActor` gagne `is_self`, `identity_visible`, `author_*`.

- [ ] **Step 1: Réécrire le fetch**

Remplacer `from('review_replies').select('*')` + `attachActors` par `(supabase.rpc as any)('get_review_replies', { p_review_id: reviewId, p_viewer_actor: currentActor?.id ?? null })` (importer `useAuth` pour `currentActor`). Mapper `reply_id`→`id`, `body`, dates, `is_self`, `identity_visible`, `author_*`. Conserver `createReply`/`updateReply`/`deleteReply` inchangés (écriture directe, RLS `can_act_as`).

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { data } = await (supabase.rpc as any)('get_review_replies', {
  p_review_id: reviewId, p_viewer_actor: currentActor?.id ?? null,
})
const rows = ((data as Array<Record<string, unknown>> | null) ?? []).map(r => ({
  id: r.reply_id as string,
  review_id: r.review_id as string,
  body: r.body as string,
  created_at: r.created_at as string,
  updated_at: r.updated_at as string,
  is_self: r.is_self as boolean,
  identity_visible: r.identity_visible as boolean,
  actor_label: (r.author_label as string | null) ?? null,
  actor_avatar_url: (r.author_avatar_url as string | null) ?? null,
  actor_slug: (r.author_slug as string | null) ?? null,
}))
setReplies(rows) // déjà triés ASC par la RPC
```

- [ ] **Step 2: Build** → `pnpm build` (ajuster les types des consommateurs a minima si besoin, rendu inchangé ici).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-review-replies.ts
git commit -m "feat(reviews): réponses lues via RPC get_review_replies (identité gatée)"
```

---

### Task 6: UI — rendu anonyme, case anonymat, indicateur, gate formulaire

**Files:**
- Modify: `src/components/reviews/ReviewList.tsx` (rendu auteur via `reviewerDisplay`)
- Modify: `src/components/reviews/ReviewReplyItem.tsx` (idem, `anonLabel: 'Un exposant'`)
- Modify: `src/components/reviews/ReviewForm.tsx` (case « anonyme total » + gate non-inscrit)
- Modify si besoin: `src/components/reviews/ReviewAvatar.tsx` (mode anonyme = pastille neutre)
- Lire d'abord ces fichiers pour respecter la structure existante.

**Interfaces:**
- Consumes : `reviewerDisplay`, `canReview`, champs `is_self`/`identity_visible`/`author_*`/`anonymous` des hooks.

- [ ] **Step 1: Rendu auteur d'avis via `reviewerDisplay`**

Dans `ReviewList.tsx`, pour chaque avis, remplacer l'usage direct de `actor_label/actor_slug/actor_avatar_url` par :
```tsx
const who = reviewerDisplay(
  { is_self: r.is_self, identity_visible: r.identity_visible, author_label: r.author_label, author_avatar_url: r.author_avatar_url, author_slug: r.author_slug }
)
```
- `who.mode === 'anonymous'` → afficher `ReviewAvatar` en mode neutre (label « Un exposant vérifié », `slug={null}` donc non cliquable) + micro-badge « ✓ présent à cette édition ».
- sinon → nom + avatar + lien vitrine comme aujourd'hui (`who.label`, `who.slug`, `who.avatarUrl`).
- `who.mode === 'self'` → afficher son nom + un discret indicateur de visibilité (voir Step 3).

- [ ] **Step 2: Réponses via `reviewerDisplay` (anonLabel)**

Dans `ReviewReplyItem.tsx`, même logique avec `reviewerDisplay(row, { anonLabel: 'Un exposant' })` (pas de badge « présent »). `ReviewAvatar` neutre quand anonyme.

- [ ] **Step 3: Case « anonyme total » + indicateur + gate dans `ReviewForm.tsx`**

- Ajouter une case à cocher `anonymous` (state local, défaut `false`, préremplie depuis `useMyReview().review?.anonymous`), passée à `submitReview({ ..., anonymous })`. Libellé : « Publier en anonyme total (caché même de mes amis pro) ». Texte d'aide court : « Par défaut, seuls tes amis pro voient ton nom ; jamais les organisateurs. »
- **Gate participation** : n'afficher le formulaire que si l'exposant est `inscrit` sur l'event. Récupérer le statut de participation de l'acteur courant pour cet event (réutiliser le hook/really existant qui charge la participation — chercher `useMyParticipation`/`participation` dans EventPage ou un hook dédié ; sinon requête `participations` filtrée `actor_id,event_id`). Si `!canReview(status)` → remplacer le formulaire par un message : « Tu pourras laisser un avis une fois ta participation à ce festival confirmée. »
- Indicateur « qui voit quoi » sur la vue de son propre avis (dans ReviewList mode self ou près du form) : `anonymous ? 'Anonyme pour tous' : 'Visible sous ton nom par tes amis pro · anonyme pour les autres'`.

- [ ] **Step 4: `ReviewAvatar` mode anonyme (si nécessaire)**

Si `ReviewAvatar` ne gère pas proprement `label` générique + `avatarUrl=null` + `slug=null`, ajouter un rendu « pastille neutre » (fond neutre, icône ou initiale « ? » discrète). Sinon le réutiliser tel quel avec `slug={null}`.

- [ ] **Step 5: Build**

Run: `pnpm build` → OK, aucun unused. Run: `pnpm lint` → pas de nouvelle erreur. Run: `pnpm vitest run` → suite verte.

- [ ] **Step 6: Commit**

```bash
git add src/components/reviews/
git commit -m "feat(reviews): rendu anonyme + case anonymat total + gate participation (UI)"
```

---

### Task 7: Déploiement front + décision 0005 + mémoire + bump

**Files:**
- Modify: `docs/decisions/0005*` (identité protégée)
- Create: mémoire projet (fichier + pointeur MEMORY.md) — hors repo, dossier mémoire.
- Modify: `package.json` (bump)

- [ ] **Step 1: Vérification globale**

`pnpm build` ✅, `pnpm lint` (0 nouvelle erreur) ✅, `pnpm vitest run` (tout vert) ✅.

- [ ] **Step 2: Bump + commit + push (déploie le front qui lit via RPC)**

Bump `package.json` (0.7.380 → 0.7.381). 
```bash
git add package.json && git commit -m "chore: bump 0.7.381 — avis identité protégée"
git push origin main
```
> À ce stade la protection est **active** (le front lit via la RPC) ; la lecture directe reste ouverte en filet de sécurité (verrou = Task 8, différé).

- [ ] **Step 3: Décision 0005 + mémoire**

Mettre à jour `docs/decisions/0005…` : avis = contenu public / identité protégée (amis pro only, jamais orga, opt-in anonymat total) + vérification participation. Ajouter une mémoire projet `project_reviews_identity_protected.md` + pointeur `MEMORY.md`. Commit + push.

- [ ] **Step 4: STOP — remettre la main à Uriel pour vérification**

Ne pas exécuter la Task 8 tant qu'Uriel n'a pas confirmé, sur le site déployé, que **les avis s'affichent correctement** (anonymes pour les non-amis, nommés pour les amis, formulaire gaté, case anonymat OK).

---

### Task 8: (DIFFÉRÉ — NE PAS POUSSER SANS VALIDATION) Verrou de la lecture directe

**Files:**
- Create: `supabase/migrations/20260721160200_reviews_lock_direct_read.sql`

**Interfaces:**
- Produces (DB) : la lecture directe de `reviews` ne laisse plus fuiter l'`actor_id` d'autrui côté client.

- [ ] **Step 1: Écrire la migration (mais NE PAS pousser)**

Choisir l'option la plus propre (à valider) — révoquer la lecture directe et forcer le passage par la RPC :
```sql
-- Verrou : couper la lecture directe qui laisse fuiter reviews.actor_id d'autrui.
-- La lecture publique passe désormais par get_event_reviews (identité gatée).
DROP POLICY IF EXISTS reviews_select_scores ON public.reviews;

-- Lecture directe restreinte à SON PROPRE avis (pour useMyReview / préremplissage form).
CREATE POLICY reviews_select_own ON public.reviews
  FOR SELECT TO authenticated
  USING (can_act_as(actor_id));
```
> ⚠️ Vérifier d'abord qu'aucune autre lecture prod (agrégats `event_scores`, badges) ne dépend d'un `SELECT` large sur `reviews`. Si `event_scores` lit `reviews`, s'assurer qu'il s'agit d'une vue/fonction `SECURITY DEFINER` (non impactée par la policy) ou adapter. **Cette vérification conditionne le choix final** (revoke SELECT complet vs revoke de la seule colonne `actor_id`).

- [ ] **Step 2: (Sur validation d'Uriel) pousser + re-vérifier les avis en prod**

Après `db push` : recharger une page festival → les avis s'affichent toujours (via RPC), un `SELECT actor_id FROM reviews` direct en tant que `authenticated` d'autrui échoue/renvoie nul.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260721160200_reviews_lock_direct_read.sql
git commit -m "feat(db): verrou lecture directe reviews (identité via RPC only)"
git push origin main
```

- [ ] **Step 4: Revue sécu RLS/RPC finale** (`set role`, cf. spec §Tests) : non-ami n'obtient jamais `author_*` ; ami oui ; acteur festival non ; viewer non contrôlé neutralisé ; lecture directe d'`actor_id` d'autrui bloquée ; INSERT sans participation rejeté.

---

## Self-Review (effectué)

**Couverture spec :**
- Contenu public / nom aux amis → Task 2 (RPC `are_friends`) + Task 3 (`reviewerDisplay`) + Task 6 (UI).
- Carve-out organisateur par type d'acteur → Task 2 (`v_is_festival`).
- Opt-in anonymat total → Task 1 (colonne) + Task 4 (submit) + Task 6 (case).
- Vérification participation → Task 1 (RLS INSERT/UPDATE) + Task 3 (`canReview`) + Task 6 (gate form).
- Enforcement RPC + verrou → Tasks 2, 4, 5 (RPC) + Task 8 (revoke, différé).
- Réponses aux avis cohérentes → Task 2 (`get_review_replies`) + Task 5 + Task 6.
- Ordre prod (additif → front → verrou) → Tasks 1-2 puis 7 puis 8 (différé, non poussé sans validation).
- Décision 0005 + mémoire → Task 7.

**Placeholder scan :** le seul point ouvert (revoke SELECT complet vs colonne `actor_id`) est explicitement conditionné à une vérification `event_scores` en Task 8 Step 1 — décision de plan documentée, pas un TODO caché.

**Cohérence types :** `is_self`/`identity_visible`/`author_label`/`author_avatar_url`/`author_slug` identiques entre RPC (Task 2), hooks (Tasks 4-5), `reviewerDisplay` (Task 3) et UI (Task 6). `p_viewer_actor = currentActor?.id` partout.
