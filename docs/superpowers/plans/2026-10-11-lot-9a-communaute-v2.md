# Lot 9a — La page Communauté — plan d'exécution

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** l'écran `/communaute` — le fil de la tribu (comptes suivis, arrivées, festivals ajoutés,
avis à identité protégée), « Ça se rassemble », « Où vous vous croiserez », « À suivre » — et
« Activité du réseau » qui lit la même source.

**Architecture:** trois fonctions SQL gardées rendent des lignes prêtes à afficher, l'identité
protégée appliquée côté serveur ; une logique pure (`lib/community.ts`) les lit et les dit ;
l'écran et la barre latérale ne font qu'afficher.

**Tech Stack:** Postgres (Supabase), React 19, React Router 7, supabase-js, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-11-lot-9a-communaute-v2-design.md`

## Global Constraints

- Base = **production** : `node_modules/supabase/bin/supabase.exe db push --linked` (dry-run d'abord), jamais `apply_migration`, aucune écriture de test.
- Fonctions `SECURITY DEFINER` + `SET search_path = public` ; garde `IF NOT coalesce(can_act_as(p_actor), false) THEN RAISE … USING ERRCODE = '42501'` ; `REVOKE … FROM PUBLIC, anon` ; `GRANT … TO authenticated`.
- Jamais : festival privé, participation `prive`, geste de soi ou de ses enseignes (`can_act_as(who)`), nom d'un auteur d'avis non ami ou anonyme, nom d'auteur pour un lecteur compte festival.
- Statuts « programmé » = `inscrit`, `confirme`, `en_cours` ; visibilité montrable = `amis`, `public`.
- 30 jours, 80 lignes, « Ça se rassemble » ≥ 2 compagnons, « À suivre » = 3 enseignes exposantes, arrivées proches = 60 jours.
- Lint V2 strict (400 lignes max, en-têtes, README, CSS en trois couches, pas de style dans les `.tsx`), dates par `lib/dates.ts`, apostrophe `’`.
- Copie de la maquette `2212:2` : « Communauté » ; « Ce que vit ta tribu, et les nouveaux festivals sur Fellowship. » ; Tout · Où ils vont · Avis · Réseau ; « Ça se rassemble » ; « {n} compagnons y vont » ; Repérer ; Aujourd’hui · Cette semaine · Plus tôt ; « vient de rejoindre Fellowship » ; « va à » ; « a ajouté un festival sur Fellowship » ; « Un exposant a noté » ; « Identité protégée — seuls ses amis exposants voient son nom » ; « suit maintenant » ; Suivre ; « Où vous vous croiserez » ; « {n} compagnons » ; « À suivre ».
- Déploiement de la V2 : avec le GO d'Uriel.

## Review Focus

- **Un avis d'un non-ami, ou anonyme** : aucun nom, aucun id, aucune image d'auteur dans la réponse (Task 1, vérification).
- **Une participation `prive` d'un compte suivi** : ni ligne « va à », ni compagnon, ni compte dans « Où vous vous croiserez » (Task 1, vérification).
- **Un compte qu'on suit déjà, ou soi-même** : jamais dans « À suivre », jamais de bouton Suivre sur lui (Task 1 vérification, Task 3 test de `canFollow`).
- **Une ligne mal formée** (kind inconnu, festival manquant) : ignorée, le fil tient (Task 2, test).
- **Une lecture ratée** : message d'erreur, jamais un fil vide (Task 3).

---

### Task 1: La base — fil, croisements, comptes à suivre

**Files:**
- Create: `supabase/migrations/20261011090000_community.sql`
- Modify: `apps/web-v2/src/types/supabase.ts` (régénéré)

**Interfaces:**
- Produces:
  - `community_feed(p_actor uuid) → TABLE(id text, kind text, occurred_at timestamptz, who_id uuid, who_name text, who_avatar text, who_slug text, target_id uuid, target_name text, target_slug text, event_id uuid, event_name text, event_city text, event_department text, event_start date, event_end date, event_image text, stars integer, comment text, detail text, companions jsonb)` — `kind` ∈ `arrival | going | added | review | follow | gathering`.
  - `crossing_dates(p_actor uuid) → TABLE(event_id uuid, event_name text, event_start date, event_end date, event_image text, companions integer)`
  - `accounts_to_follow(p_actor uuid) → TABLE(id uuid, name text, avatar text, slug text, city text, reason jsonb)` — `reason` ∈ `{kind:'followed_by', name, others}` · `{kind:'shared_dates', count}` · `{kind:'nearby'}`.

- [ ] **Step 1: La migration**

```sql
-- POURQUOI : lot 9a (11/10/2026). La page Communauté : le fil de la tribu, « Ça se rassemble »,
-- « Où vous vous croiserez », « À suivre ». Trois lectures gardées qui rendent des lignes prêtes
-- à afficher. L'identité protégée se joue ICI : le nom d'un auteur d'avis non ami ne quitte
-- jamais la base (règle de get_event_reviews). Tout est gratuit.

CREATE OR REPLACE FUNCTION public.community_feed(p_actor uuid)
RETURNS TABLE (
  id text, kind text, occurred_at timestamptz,
  who_id uuid, who_name text, who_avatar text, who_slug text,
  target_id uuid, target_name text, target_slug text,
  event_id uuid, event_name text, event_city text, event_department text,
  event_start date, event_end date, event_image text,
  stars integer, comment text, detail text, companions jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  since timestamptz := now() - interval '30 days';
  today date := (now() AT TIME ZONE 'Europe/Paris')::date;
  reader_is_festival boolean;
BEGIN
  IF NOT coalesce(can_act_as(p_actor), false) THEN
    RAISE EXCEPTION 'community_feed: acteur non autorisé' USING ERRCODE = '42501';
  END IF;
  reader_is_festival := EXISTS (
    SELECT 1 FROM entities en WHERE en.actor_id = p_actor AND en.type = 'festival'
  );

  RETURN QUERY
  WITH followed AS (
    SELECT f.following_actor AS actor_id FROM follows f
    WHERE f.follower_actor = p_actor AND f.following_actor IS NOT NULL
  ),
  lines AS (
    SELECT 'arrival:' || a.id AS line_id, 'arrival' AS line_kind, a.created_at AS at,
      a.id AS who, NULL::uuid AS target, NULL::uuid AS event,
      NULL::integer AS line_stars, NULL::text AS line_comment,
      nullif(concat_ws(', ', nullif(btrim(en.craft_type), ''), nullif(btrim(en.city), '')), '') AS line_detail,
      true AS named
    FROM actors a JOIN entities en ON en.actor_id = a.id
    WHERE en.type = 'exposant' AND a.created_at >= since
      AND NOT coalesce(can_act_as(a.id), false)
    UNION ALL
    SELECT 'going:' || p.id, 'going', p.created_at, p.actor_id, NULL, p.event_id, NULL, NULL, NULL, true
    FROM participations p JOIN events e ON e.id = p.event_id
    WHERE p.actor_id IN (SELECT actor_id FROM followed)
      AND p.status IN ('inscrit', 'confirme', 'en_cours')
      AND p.visibility IN ('amis', 'public')
      AND NOT e.is_private AND p.created_at >= since
    UNION ALL
    SELECT 'added:' || e.id, 'added', e.created_at, e.created_by_actor, NULL, e.id, NULL, NULL, NULL, true
    FROM events e
    WHERE NOT e.is_private AND e.created_at >= since
      AND (e.created_by_actor IS NULL OR NOT coalesce(can_act_as(e.created_by_actor), false))
    UNION ALL
    SELECT 'review:' || r.id, 'review', r.created_at, r.actor_id, NULL, r.event_id,
      round((r.affluence + r.organisation + r.rentabilite) / 3.0)::integer, r.comment, NULL,
      (NOT r.anonymous AND NOT reader_is_festival AND coalesce(are_friends(p_actor, r.actor_id), false))
    FROM reviews r JOIN events e ON e.id = r.event_id
    WHERE NOT e.is_private AND r.created_at >= since
      AND NOT coalesce(can_act_as(r.actor_id), false)
    UNION ALL
    SELECT 'follow:' || f.id, 'follow', f.created_at, f.follower_actor, f.following_actor, NULL, NULL, NULL, NULL, true
    FROM follows f
    WHERE f.follower_actor IN (SELECT actor_id FROM followed)
      AND f.following_actor IS NOT NULL
      AND NOT coalesce(can_act_as(f.following_actor), false)
      AND f.created_at >= since
  ),
  feed AS (
    SELECT * FROM lines ORDER BY at DESC, line_id LIMIT 80
  ),
  best AS (
    SELECT p.event_id AS event, count(DISTINCT p.actor_id)::integer AS n, min(e.start_date) AS starts
    FROM participations p JOIN events e ON e.id = p.event_id
    WHERE p.actor_id IN (SELECT actor_id FROM followed)
      AND p.status IN ('inscrit', 'confirme', 'en_cours')
      AND p.visibility IN ('amis', 'public')
      AND NOT e.is_private AND e.start_date >= today
      AND NOT EXISTS (SELECT 1 FROM participations mine WHERE mine.actor_id = p_actor AND mine.event_id = p.event_id)
    GROUP BY p.event_id
    HAVING count(DISTINCT p.actor_id) >= 2
    ORDER BY n DESC, starts, p.event_id
    LIMIT 1
  )
  SELECT f.line_id, f.line_kind, f.at,
    CASE WHEN f.named THEN f.who END,
    CASE WHEN f.named THEN btrim(ap.label) END,
    CASE WHEN f.named THEN ap.avatar_url END,
    CASE WHEN f.named THEN ap.public_slug END,
    f.target, btrim(tp.label), tp.public_slug,
    e.id, e.name, e.city, e.department, e.start_date, e.end_date, e.image_url,
    f.line_stars, f.line_comment, f.line_detail, NULL::jsonb
  FROM feed f
  LEFT JOIN actor_public ap ON ap.actor_id = f.who
  LEFT JOIN actor_public tp ON tp.actor_id = f.target
  LEFT JOIN events e ON e.id = f.event
  UNION ALL
  SELECT 'gathering:' || b.event, 'gathering', now(),
    NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    e.id, e.name, e.city, e.department, e.start_date, e.end_date, e.image_url,
    NULL, NULL, b.n::text,
    (SELECT jsonb_agg(c ORDER BY c->>'name') FROM (
       SELECT DISTINCT jsonb_build_object('id', ap.actor_id, 'name', btrim(ap.label), 'avatar', ap.avatar_url) AS c
       FROM participations p JOIN actor_public ap ON ap.actor_id = p.actor_id
       WHERE p.event_id = b.event AND p.actor_id IN (SELECT actor_id FROM followed)
         AND p.status IN ('inscrit', 'confirme', 'en_cours') AND p.visibility IN ('amis', 'public')
         AND btrim(ap.label) <> ''
       LIMIT 4
     ) four)
  FROM best b JOIN events e ON e.id = b.event;
END; $$;
REVOKE EXECUTE ON FUNCTION public.community_feed(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_feed(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.crossing_dates(p_actor uuid)
RETURNS TABLE (event_id uuid, event_name text, event_start date, event_end date, event_image text, companions integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  IF NOT coalesce(can_act_as(p_actor), false) THEN
    RAISE EXCEPTION 'crossing_dates: acteur non autorisé' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT e.id, e.name, e.start_date, e.end_date, e.image_url, count(DISTINCT p.actor_id)::integer
  FROM participations mine
  JOIN events e ON e.id = mine.event_id
  JOIN participations p ON p.event_id = e.id
  WHERE mine.actor_id = p_actor
    AND mine.status IN ('inscrit', 'confirme', 'en_cours')
    AND e.start_date >= (now() AT TIME ZONE 'Europe/Paris')::date
    AND p.actor_id IN (SELECT f.following_actor FROM follows f WHERE f.follower_actor = p_actor)
    AND p.status IN ('inscrit', 'confirme', 'en_cours')
    AND p.visibility IN ('amis', 'public')
  GROUP BY e.id
  ORDER BY e.start_date, e.id
  LIMIT 3;
END; $$;
REVOKE EXECUTE ON FUNCTION public.crossing_dates(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crossing_dates(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.accounts_to_follow(p_actor uuid)
RETURNS TABLE (id uuid, name text, avatar text, slug text, city text, reason jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  IF NOT coalesce(can_act_as(p_actor), false) THEN
    RAISE EXCEPTION 'accounts_to_follow: acteur non autorisé' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH followed AS (
    SELECT f.following_actor AS actor_id FROM follows f
    WHERE f.follower_actor = p_actor AND f.following_actor IS NOT NULL
  ),
  home AS (
    SELECT department_code(coalesce(en.department, u.department)) AS code
    FROM actors a
    LEFT JOIN entities en ON en.actor_id = a.id
    LEFT JOIN users u ON u.actor_id = a.id
    WHERE a.id = p_actor
  ),
  by_follow AS (
    SELECT f.following_actor AS candidate, count(*)::integer AS n,
      (array_agg(btrim(ap.label) ORDER BY btrim(ap.label)))[1] AS first_name
    FROM follows f JOIN actor_public ap ON ap.actor_id = f.follower_actor
    WHERE f.follower_actor IN (SELECT actor_id FROM followed)
      AND f.following_actor IS NOT NULL AND btrim(ap.label) <> ''
    GROUP BY f.following_actor
  ),
  pool AS (
    SELECT candidate, 1 AS rank, n AS weight,
      jsonb_build_object('kind', 'followed_by', 'name', first_name, 'others', n - 1) AS why
    FROM by_follow
    UNION ALL
    SELECT s.suggested_actor, 2, s.shared_events::integer,
      jsonb_build_object('kind', 'shared_dates', 'count', s.shared_events)
    FROM get_coevent_suggestions(p_actor) s
    UNION ALL
    SELECT a.id, 3, 0, jsonb_build_object('kind', 'nearby')
    FROM actors a JOIN entities en ON en.actor_id = a.id CROSS JOIN home h
    WHERE en.type = 'exposant' AND a.created_at >= now() - interval '60 days'
      AND h.code IS NOT NULL AND department_code(en.department) = h.code
  ),
  best AS (
    SELECT DISTINCT ON (pool.candidate) pool.*
    FROM pool
    JOIN entities en ON en.actor_id = pool.candidate AND en.type = 'exposant'
    WHERE pool.candidate <> p_actor
      AND NOT coalesce(can_act_as(pool.candidate), false)
      AND pool.candidate NOT IN (SELECT actor_id FROM followed)
    ORDER BY pool.candidate, pool.rank, pool.weight DESC
  )
  SELECT b.candidate, btrim(ap.label), ap.avatar_url, ap.public_slug, en.city, b.why
  FROM best b
  JOIN actor_public ap ON ap.actor_id = b.candidate
  JOIN entities en ON en.actor_id = b.candidate
  WHERE btrim(ap.label) <> ''
  ORDER BY b.rank, b.weight DESC, btrim(ap.label)
  LIMIT 3;
END; $$;
REVOKE EXECUTE ON FUNCTION public.accounts_to_follow(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accounts_to_follow(uuid) TO authenticated;
```

- [ ] **Step 2: Dry-run puis application**

Run: `node_modules/supabase/bin/supabase.exe db push --linked --dry-run` → la migration seule ; puis `echo Y | … db push --linked` → `Finished supabase db push.`

- [ ] **Step 3: Vérifier en lecture seule** (`db query --linked` tourne sans session : `can_act_as` y vaut NULL, donc les trois fonctions doivent **refuser**)
- `select community_feed('<id Runes de Chêne>')` → erreur `acteur non autorisé` (même chose pour les deux autres).
- Les requêtes internes jouées à blanc, en remplaçant `can_act_as(...)` par la vraie liste d'acteurs de la personne d'Uriel (`select entity_actor_id from memberships where user_actor_id = '<personne>'` + la personne) : nombre de lignes par `kind` ; **aucune ligne `review` avec un nom quand l'auteur n'est pas ami** (`select count(*) … where kind='review' and who_name is not null and not are_friends(…)` → 0) ; **aucune ligne `going`/`companions` sur une participation `prive`** → 0 ; `accounts_to_follow` → aucun compte déjà suivi ni à soi.

- [ ] **Step 4: Types et commit**

Régénérer `types/supabase.ts` (scratchpad puis copie, prettier), puis :

```bash
git add supabase/migrations/20261011090000_community.sql apps/web-v2/src/types/supabase.ts
git commit -m "feat(db): la communauté — fil, croisements, comptes à suivre"
```

### Task 2: `lib/community.ts` — lire et dire

**Files:**
- Create: `apps/web-v2/src/lib/community.ts`, `apps/web-v2/src/lib/community.test.ts`
- Modify: `apps/web-v2/src/lib/notifications.ts` (`groupByDay` générique), `apps/web-v2/src/lib/README.md`

**Interfaces:**
- Produces:
  - `type FeedKind = 'arrival' | 'going' | 'added' | 'review' | 'follow' | 'gathering'`
  - `interface FeedPerson { id: string; name: string; avatarUrl: string | null; slug: string | null }`
  - `interface FeedEvent { id: string; name: string; city: string | null; department: string | null; startDate: string; endDate: string; imageUrl: string | null }`
  - `interface FeedLine { id: string; kind: FeedKind; at: Date; who: FeedPerson | null; target: FeedPerson | null; event: FeedEvent | null; stars: number | null; comment: string | null; detail: string | null; companions: FeedPerson[] }`
  - `readFeed(rows: unknown): FeedLine[]`
  - `type CommunityTab = 'tout' | 'ou' | 'avis' | 'reseau'` ; `readTab(value: string | null): CommunityTab` ; `feedFor(lines: FeedLine[], tab: CommunityTab): FeedLine[]` (sans `gathering`) ; `gatheringOf(lines: FeedLine[]): FeedLine | null`
  - `feedPhrase(line: FeedLine): TextPart[]` (`TextPart` de `notifications.ts`)
  - `activityText(line: FeedLine): string | null` (barre latérale : « vient de rejoindre Fellowship », « va à X », « a ajouté X », « suit X » ; `null` pour un avis, un « Ça se rassemble » ou un auteur inconnu)
  - `type FollowReason = { kind: 'followed_by'; name: string; others: number } | { kind: 'shared_dates'; count: number } | { kind: 'nearby' }` ; `readFollowReason(raw: unknown): FollowReason | null` ; `followReason(reason: FollowReason): string`
  - `canFollow(id: string, followed: ReadonlySet<string>, own: ReadonlySet<string>): boolean`
  - `groupByDay<T extends { at: Date }>(items: T[], now: Date): { label; items: T[] }[]` (dans `notifications.ts`, signature élargie)

- [ ] **Step 1: Les tests** — dans `community.test.ts`, au minimum :
  - `readFeed` : une ligne de chaque `kind` lue avec ses champs ; `who_*` NULL → `who: null` ; `kind` inconnu → ignorée ; `going` sans `event_id` → ignorée ; `companions` lu en `FeedPerson[]`.
  - `feedFor` : `tout` = tout sauf `gathering` ; `ou` = `going` + `added` ; `avis` = `review` ; `reseau` = `arrival` + `follow`. `readTab('avis')` → `avis`, `readTab('x')` / `null` → `tout`. `gatheringOf` rend la ligne `gathering` ou `null`.
  - `feedPhrase` :
    - `arrival` avec détail → `[{strong:'Atelier Sauvage'}, ' vient de rejoindre Fellowship — maroquinerie, Nantes.']`, sans détail → `' vient de rejoindre Fellowship.'` ;
    - `going` → `[{strong:'Gautier'}, ' va à ', {strong:'Les Aventuriales'}, '.']` ;
    - `added` → `[{strong:'Lina'}, ' a ajouté un festival sur Fellowship.']`, créateur inconnu → `{strong:'Quelqu’un'}` ;
    - `review` sans auteur → `[{strong:'Un exposant'}, ' a noté ', {strong:'Sylak'}, '.']`, avec auteur ami → son nom ;
    - `follow` → `[{strong:'Tom'}, ' suit maintenant ', {strong:'Forge Lugdunum'}, '.']`.
  - `activityText` : `va à Arbor Pagan Fest`, `a ajouté Salon des Créateurs`, `suit Forge Lugdunum`, `vient de rejoindre Fellowship` ; `review` → `null` ; `added` sans auteur → `null`.
  - `followReason` : `suivi par Tom` (others 0), `suivi par Tom et 2 autres`, `suivi par Tom et 1 autre`, `8 dates en commun`, `1 date en commun`, `nouveau sur Fellowship`.
  - `canFollow` : faux pour un compte suivi, faux pour un de ses comptes, vrai sinon.
  - `notifications.test.ts` (existant) reste vert après l'élargissement de `groupByDay`.

- [ ] **Step 2:** `pnpm --filter web-v2 exec vitest run src/lib/community.test.ts` → FAIL (module absent).
- [ ] **Step 3:** écrire `community.ts` (lecteurs défensifs comme `lib/suggestions.ts` : `record`, `word` avec `trim`, filtre des lignes nulles) ; élargir `groupByDay` à `<T extends { at: Date }>`.
- [ ] **Step 4:** `pnpm --filter web-v2 exec vitest run` → tout PASS.
- [ ] **Step 5:** commit `feat(v2): lire et dire le fil de la communauté`.

### Task 3: L'écran `/communaute`

**Files:**
- Create: `apps/web-v2/src/features/community/README.md`, `CommunityPage.tsx`, `useCommunity.ts`, `Gathering.tsx`, `FeedItem.tsx`, `CrossingCard.tsx`, `ToFollowCard.tsx`
- Create: `apps/web-v2/src/styles/3-components/community.css` ; Modify: `2-semantic.css` (jetons `--community-*`), `index.css`
- Modify: `apps/web-v2/src/App.tsx` (route `/communaute`, protégée, dans `AppShell`, au-dessus de `/:slug`), `components/layout/Sidebar.tsx` et `TabBar.tsx` (`to: '/communaute'`), `features/README.md`

**Interfaces:**
- Consumes: Task 1 (RPC), Task 2 (`readFeed`, `feedFor`, `gatheringOf`, `feedPhrase`, `readTab`, `readFollowReason`, `followReason`, `canFollow`, `groupByDay`).
- Produces: `useCommunity(actorId?: string): { lines: FeedLine[]; crossing: Crossing[]; toFollow: ToFollow[]; followed: Set<string>; loading: boolean; error: boolean; follow(id: string): Promise<void>; mark(eventId: string): Promise<void> }`.

- [ ] **Step 1: Le hook** — modèle du dépôt : une fonction `async` hors de l'effet charge **en parallèle** `community_feed`, `crossing_dates`, `accounts_to_follow` et les `follows` de l'acteur (pour `followed`), rend l'état ou lève (`must`) ; l'effet l'applique une fois après un seul `if (cancelled) return`. Une erreur → `error: true` (message à l'écran, jamais un fil vide). `follow(id)` : `insert` dans `follows` (`follower_actor: actorId, following_actor: id`), ajout immédiat à `followed`, puis relecture d'« À suivre » ; échec → retiré de `followed`. `mark(eventId)` : `upsert` `participations` (`status: 'interesse'`, `acted_by_user_id` de la personne, `onConflict: 'actor_id,event_id'`, `ignoreDuplicates: true` — le geste de `useNotifications.markInterested`), puis relecture.
- [ ] **Step 2: L'écran** — `CommunityPage` : en-tête (titre, sous-titre), filtres en `Chip` (ou le composant de filtres de l'Explorer s'il existe — vérifier `components/ui`) écrits dans `?voir=` (`useSearchParams`, `replace`), `Gathering` (filtres Tout et Où ils vont), le fil `groupByDay(feedFor(lines, tab))` avec un `FeedItem` par ligne, la colonne `CrossingCard` + `ToFollowCard`. Vide : « Suis des exposants pour voir ce qu’ils préparent. » ; erreur : « La communauté n’a pas pu être chargée. ».
  - `FeedItem` : avatar (bouclier pour un avis sans auteur), la phrase (`feedPhrase`, les `strong` en `<b>`, un nom avec `slug` en lien vers `/${slug}`), la petite carte du festival (lien `/evenement/:id`) pour `going` et `added`, les étoiles (`Stars`) + commentaire + « Identité protégée — seuls ses amis exposants voient son nom » pour un avis sans auteur, l'âge (`timeAgo`), **Suivre** pour `arrival` (le `who`) et `follow` (la `target`) si `canFollow`.
  - `Gathering` : affiche, surtitre « Ça se rassemble », nom en grand titre, dates · ville (département), pastilles des compagnons, « {n} compagnons y vont », **Repérer**.
  - `CrossingCard` : « Où vous vous croiserez », trois lignes (affiche, nom, dates · « {n} compagnons » / « 1 compagnon »), lien vers la fiche ; rien → `null`.
  - `ToFollowCard` : « À suivre », trois lignes (avatar, nom, « {ville} · {raison} »), bouton **+** (`aria-label` « Suivre {nom} ») ; la ligne suivie s'efface (classe `--leaving`, `inert`) jusqu'à la relecture ; rien → `null`.
- [ ] **Step 3: CSS** — `community.css` d'après `get_design_context` du cadre `2212:2` (valeurs relevées, jetons en couche 2, une couleur absente → couche 1 puis 2). Cartes blanches bordées `--line-card`, aucune ombre ; apparitions en `@starting-style` ; `prefers-reduced-motion`.
- [ ] **Step 4: Branchements** — route, `Sidebar`/`TabBar` (`to: '/communaute'`), README.
- [ ] **Step 5: Vérifier** — `pnpm --filter web-v2 lint && pnpm --filter web-v2 exec vitest run && pnpm --filter web-v2 build` → zéro erreur. Dans le navigateur (serveur local branché sur la base, ou après déploiement) : les quatre onglets et l'adresse, Suivre, Repérer, « À suivre », capture à côté de `2212:2`.
- [ ] **Step 6:** commit `feat(v2): la page Communauté`.

### Task 4: « Activité du réseau » lit le fil

**Files:**
- Modify: `apps/web-v2/src/features/activity/useNetworkActivity.ts` (lit `community_feed`), `NetworkActivity.tsx` (« Tout voir → » vers `/communaute`, en-tête mis à jour), `features/activity/README.md`
- Delete (avec l'accord d'Uriel, donné en validant ce plan) : `apps/web-v2/src/lib/activity.ts`, `apps/web-v2/src/lib/activity.test.ts` s'ils ne servent plus (`grep -rn "lib/activity" apps/web-v2/src` vide)

- [ ] **Step 1:** `useNetworkActivity` appelle `community_feed`, `readFeed`, garde les lignes dont `activityText` n'est pas `null` et qui ont un `who`, coupe à 4, rend `ActivityItem` (`actor: { id, name, avatarUrl }`, `text: activityText(line)`, `occurredAt: line.at`). Même contrat d'erreur qu'avant.
- [ ] **Step 2:** « Tout voir → » (`useTransitionNavigate` vers `/communaute`) sous la liste ; retirer la ligne ATTENTION de l'en-tête.
- [ ] **Step 3:** supprimer `lib/activity.ts` et son test s'ils sont orphelins ; README de `lib/` mis à jour.
- [ ] **Step 4:** `pnpm --filter web-v2 lint && pnpm --filter web-v2 exec vitest run && pnpm --filter web-v2 build` → vert.
- [ ] **Step 5:** commit `refactor(v2): l'activité du réseau lit le fil de la communauté` ; version `2.29.0` dans `package.json`.

### Task 5: Relecture, mise en ligne (GO d'Uriel), docs

- [ ] Relecture fraîche de tout le lot (opus) avec la Review Focus ; correctifs Critical/Important.
- [ ] GO : build et déploiement de la V2 (`.claude/rules/deploiement.md`), curl de `/v2/`, capture sur `flw.sh/v2/communaute`.
- [ ] Docs : plan directeur (lot 9 : 9a ☑), `docs/v2/maquettes-2027.md` (Communauté validé, intégré, `2212:2`), `_État.md` « Où on en est ». Push.
