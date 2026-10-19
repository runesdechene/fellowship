# Les Nouveautés — plan de construction

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** l'admin publie des mises à jour de Fellowship ; les exposants les lisent sur `/nouveautes`, y mettent un cœur et en parlent ; push pour toutes, e-mail pour les grosses.

**Architecture:** trois tables neuves (`app_updates`, `app_update_hearts`, `app_update_comments`) sous RLS ; la publication passe par une RPC admin qui écrit la note **et** les notifications d'un coup (le push suit par le déclencheur existant) ; l'e-mail d'une grosse part d'une fonction Edge qui « réclame » la note avant d'envoyer (jamais deux fois). Le front lit les tables en supabase-js direct, comme les autres features.

**Tech Stack:** Postgres/Supabase (RLS, pg_net déjà branché), Edge Functions Deno + Resend, React 19 + React Router, vitest.

**Spec:** `docs/superpowers/specs/2026-10-19-v2-nouveautes-design.md` · maquettes Figma `9CmmBD3t5rAk4tD583cdN3` : `2371:65`, `2371:403`, `2371:443`, `2371:671`, `2371:707`, `2373:65`.

## Global Constraints

- Règles du dépôt : `.claude/rules/v2.md` (en-tête QUOI/POURQUOI, README par dossier, 400 lignes max, aucun style dans les `.tsx`, aucune valeur en dur dans `3-components/`, transitions par jetons), `.claude/rules/supabase.md`.
- Lint jugé sur son code de sortie : `pnpm --filter web-v2 lint` ; après `pnpm --filter web-v2 format`, relancer `node scripts/sync-push-phrases.mjs` depuis `apps/web-v2/`.
- Migrations : `supabase/migrations/<horodatage>_<nom>.sql`, en tête le POURQUOI, appliquées par `node_modules/supabase/bin/supabase.exe db push --linked` (jamais `apply_migration`). La base est la **production** : tout est additif.
- **Aucune publication de note pour tester** : publier notifie tous les exposants. La première vraie note, c'est Uriel qui la publie.
- Copie fixée par la spec : « Nouveautés », « Ce qui change dans Fellowship, version après version. Dis-nous ce que tu en penses. », « Grosse mise à jour » / « Petite mise à jour », « Version X · 19 oct. », « Écrire un commentaire… », « Répondre », « Voir les N autres commentaires », « Un e-mail partira à N exposants. Corriger la note ensuite ne le renvoie pas. », « E-mail envoyé à N », « Mises à jour », signature « Prénom (Enseigne) ».
- Couleurs : pastille et cœur mis = `--nav-alert-surface` (brique-600) ; fond du cœur mis = nouveau jeton sémantique tiré d'une primitive brique pâle (à ajouter en couche 1 si absente).

## Review Focus

1. **Double e-mail** — deux clics « Publier », ou l'appel Edge relancé : un seul envoi (la réclamation `email_sent_at IS NULL` en une écriture). Test : `claimRefusal` dans `update-mail.test.ts`.
2. **Personne à deux enseignes exposant** — une seule notification, un seul e-mail (dédoublonnage par personne puis par adresse). Vérif SQL tâche 2.
3. **Réponse à une réponse** — elle s'affiche dans le fil de la racine, et notifie l'auteur de la réponse visée, jamais soi-même. Test : `threadOf` (tâche 3) ; déclencheur (tâche 2).
4. **Pastille** — s'éteint à l'ouverture de `/nouveautes`, ne s'allume pas pour un compte neuf. Test : `isUnread` (tâche 3).
5. **Cœur cliqué vite deux fois** — l'état reste juste (la clé primaire refuse le doublon ; le bouton est désactivé pendant l'envoi).

---

### Task 1 : les trois types de notification

**Files:**
- Create: `supabase/migrations/20261020090000_notification_type_nouveautes.sql`

- [ ] **Step 1 :** écrire la migration — en tête le POURQUOI (« seules dans leur migration : une valeur d'énumération ne s'utilise pas dans la transaction qui l'ajoute »), puis `ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'app_update'`, idem `'app_update_reply'`, `'app_update_comment'`.
- [ ] **Step 2 :** `db push --linked` (procédure non interactive de `supabase.md`), puis vérifier : `select unnest(enum_range(null::notification_type))` contient les trois.
- [ ] **Step 3 :** commit `feat(db): types de notification des Nouveautés`.

### Task 2 : tables, droits, publication, notifications

**Files:**
- Create: `supabase/migrations/20261020090100_nouveautes.sql`
- Modify: `docs/db/gotchas.md` (une ligne : publier passe par `publish_app_update`, jamais un INSERT)

**Interfaces — Produces:**
- `app_updates(id uuid pk, version text, title text 1..200, body text 1..10000, image_url text null, weight text check in ('small','big'), author_id uuid → actors, published_at timestamptz default now(), email_sent_at timestamptz null, email_count int null)`
- `app_update_hearts(update_id → app_updates on delete cascade, actor_id → actors on delete cascade, created_at, pk(update_id, actor_id))`
- `app_update_comments(id uuid pk, update_id → app_updates cascade, parent_id → app_update_comments cascade null, actor_id → actors (la personne), entity_actor_id → actors null (l'enseigne incarnée), body text 1..2000, created_at)`
- `users.updates_seen_at timestamptz not null default now()`, `users.updates_email_off boolean not null default false`, `users.email_token text not null unique default encode(gen_random_bytes(32),'hex')`
- `publish_app_update(p_version text, p_title text, p_body text, p_image_url text, p_weight text) returns uuid` — SECURITY DEFINER, refuse si `NOT is_admin()`.
- `app_update_audience() returns int` — admin seulement : nombre de personnes qui recevront l'e-mail.
- `app_update_email_recipients() returns table(email text, token text)` — exécutable par `service_role` seulement.

- [ ] **Step 1 : relever le live** avant d'écrire : définition de `can_act_as`, `is_admin`, politique `UPDATE` de `users` (une personne peut-elle écrire sa propre ligne ? `usePushMuted` le fait), la contrainte `users_push_muted_lines`, les politiques du seau `testimonials`, `pgcrypto` disponible. Colonnes par `information_schema`, jamais devinées.
- [ ] **Step 2 : écrire la migration**, dans cet ordre, chaque bloc avec son pourquoi :
  - les trois tables + index `(update_id, created_at)` sur les commentaires ;
  - RLS : `app_updates` select `auth.uid() is not null`, insert/update/delete `is_admin()` ; hearts select connectés, insert/delete `can_act_as(actor_id)` ; comments select connectés, insert `can_act_as(actor_id) and (entity_actor_id is null or can_act_as(entity_actor_id))`, delete `can_act_as(actor_id) or is_admin()` ;
  - les trois colonnes de `users` (les lignes existantes prennent `now()` : pas de pastille pour les notes d'avant) ;
  - la contrainte `users_push_muted_lines` redéclarée avec `'updates'` en plus ;
  - le seau public `app-updates`, écriture/suppression `is_admin()` (modèle `testimonials`) ;
  - `publish_app_update` : insère la note, puis `INSERT INTO notifications (actor_id, type, data) SELECT DISTINCT m.user_actor_id, 'app_update', jsonb_build_object('update_id', id, 'title', p_title, 'version', p_version) FROM memberships m JOIN entities e ON e.actor_id = m.entity_actor_id WHERE e.type = 'exposant'` ; rend l'id ;
  - `app_update_audience` / `app_update_email_recipients` : même public (`DISTINCT` personne), `users.email is not null and not updates_email_off`, dédoublonné par `lower(email)` ;
  - déclencheur `AFTER INSERT ON app_update_comments` (SECURITY DEFINER) : `parent_id` nul → une notification `app_update_comment` pour chaque `users.actor_id` où `role = 'admin'`, sauf l'auteur ; sinon → `app_update_reply` à l'auteur du commentaire `parent_id`, sauf si c'est l'auteur. `data` : `update_id`, `title` (de la note), `actor_name` (`actor_public.label` de la personne qui écrit).
  - `REVOKE EXECUTE` de `app_update_email_recipients` à `PUBLIC, anon, authenticated` ; `GRANT` à `service_role`.
- [ ] **Step 3 :** `db push --linked`, puis vérifier en lecture seule : les tables existent, `select count(*) from users where updates_seen_at is null` = 0, `select public.app_update_audience()` en service role donne un nombre plausible et **le même** qu'un `count(distinct user_actor_id)` fait à la main (Review Focus 2).
- [ ] **Step 4 :** régénérer les types (`supabase.md` → « Régénérer les types de la V2 ») dans `apps/web-v2/src/types/supabase.ts`.
- [ ] **Step 5 :** commit `feat(db): les Nouveautés — notes, cœurs, commentaires, publication`.

### Task 3 : la logique pure

**Files:**
- Create: `apps/web-v2/src/lib/app-updates.ts`, `apps/web-v2/src/lib/app-updates.test.ts`

**Interfaces — Produces:**
- `type UpdateWeight = 'small' | 'big'`
- `interface UpdateComment { id: string; parentId: string | null; actorId: string; entityActorId: string | null; body: string; createdAt: string }`
- `interface CommentThread { root: UpdateComment; replies: UpdateComment[] }`
- `threadOf(comments: UpdateComment[]): CommentThread[]` — racines dans l'ordre chronologique, chaque réponse rangée sous sa racine (en remontant les `parentId`), réponses chronologiques.
- `signature(personName: string, entityName: string | null): string` — `"Uriel (Runes de Chêne)"`, ou le prénom seul.
- `likersLabel(names: string[], total: number): string` — `"Gautier, Lina et 22 autres"`, `"Gautier et Lina"`, `"Gautier"`, `"1 autre"` au singulier.
- `isUnread(latestPublishedAt: string | null, seenAt: string | null): boolean`
- `signingEntity(actor: { id: string; kind: 'person' | 'entity' }, entities: { actor_id: string }[]): string | null` — l'enseigne incarnée, sinon la première.

- [ ] **Step 1 : tests**
  ```ts
  it('range une réponse à une réponse sous la racine', () => {
    const t = threadOf([c('a', null, '10:00'), c('b', 'a', '10:05'), c('d', 'b', '10:07'), c('e', null, '10:06')])
    expect(t.map((x) => x.root.id)).toEqual(['a', 'e'])
    expect(t[0]?.replies.map((r) => r.id)).toEqual(['b', 'd'])
  })
  it('signe « Prénom (Enseigne) »', () => expect(signature('Uriel', 'Runes de Chêne')).toBe('Uriel (Runes de Chêne)'))
  it('compte les autres', () => {
    expect(likersLabel(['Gautier', 'Lina'], 24)).toBe('Gautier, Lina et 22 autres')
    expect(likersLabel(['Gautier', 'Lina'], 3)).toBe('Gautier, Lina et 1 autre')
    expect(likersLabel(['Gautier', 'Lina'], 2)).toBe('Gautier et Lina')
  })
  it('allume la pastille seulement pour une note plus récente', () => {
    expect(isUnread('2026-10-19T10:00:00Z', '2026-10-19T09:00:00Z')).toBe(true)
    expect(isUnread('2026-10-19T10:00:00Z', '2026-10-19T11:00:00Z')).toBe(false)
    expect(isUnread(null, '2026-10-19T11:00:00Z')).toBe(false)
  })
  ```
- [ ] **Step 2 :** `pnpm --filter web-v2 test app-updates` → FAIL (module absent).
- [ ] **Step 3 :** écrire `lib/app-updates.ts`.
- [ ] **Step 4 :** relancer → PASS. Commit `feat(v2): logique des Nouveautés`.

### Task 4 : la cloche et le téléphone savent dire les Nouveautés

**Files:**
- Modify: `apps/web-v2/src/lib/notifications.ts` (`KNOWN_TYPES` + trois `case`), `apps/web-v2/src/lib/push-lines.ts` (ligne `updates` en tête de `PUSH_LINES`, `LINE_OF_TYPE`), leurs tests, la copie `supabase/functions/send-push/phrases/` (par le script).

- [ ] **Step 1 : tests** dans `notifications.test.ts` / `push-lines.test.ts` :
  - `notificationPhrase('app_update', { title: 'La nouvelle Fellowship est là', version: '3.0.0' })` → texte `['Nouveauté : ', { strong: 'La nouvelle Fellowship est là' }]`, `href: '/nouveautes'`, icône existante la plus proche (`update`).
  - `app_update_reply` avec `actor_name: 'Gautier'`, `title` → `[{ strong: 'Gautier' }, ' a répondu à ton commentaire sur « … »']`, `href '/nouveautes'`.
  - `app_update_comment` → `[{ strong: 'Gautier' }, ' a commenté « … »']`.
  - `lineOf('app_update') === 'updates'`, `lineOf('app_update_reply') === 'discussions'`, `lineOf('app_update_comment') === 'discussions'`.
  - `PUSH_LINES[0]` : `{ key: 'updates', title: 'Nouveautés de Fellowship', detail: 'Quand une mise à jour sort', pro: false }`.
- [ ] **Step 2 :** FAIL, puis implémenter, puis `node scripts/sync-push-phrases.mjs` (depuis `apps/web-v2/`) → les tests (dont celui de la copie) PASS.
- [ ] **Step 3 :** commit `feat(v2): la cloche et le téléphone annoncent les Nouveautés`.

### Task 5 : la page `/nouveautes`

**Files:**
- Create: `apps/web-v2/src/features/updates/README.md`, `useUpdates.ts`, `UpdatesPage.tsx`, `UpdateCard.tsx`, `UpdateConversation.tsx`, `apps/web-v2/src/styles/3-components/updates.css` (+ import dans l'index des styles)
- Modify: `apps/web-v2/src/App.tsx` (route `/nouveautes` dans `AppPage`)

**Interfaces:**
- Consumes : tâche 3 ; `fetchActorProfiles` (`lib/friends.ts`) ; `useAuth()` (`person`, `actor`, `entities`, rôle admin via `person.role`) ; `ConfirmDialog`, `Avatar`, `Button`.
- Produces : `interface AppUpdate { id; version; title; body; imageUrl; weight: UpdateWeight; publishedAt; hearts: number; mine: boolean; likers: string[]; comments: UpdateComment[]; emailCount: number | null }` ; `useUpdates(): { updates: AppUpdate[] | null; profiles: Map<string, Friend>; error: string | null; toggleHeart(id): Promise<void>; comment(updateId, body, parentId | null): Promise<void>; remove(commentId): Promise<void> }` ; `UpdateCard({ update, open, preview? })` réutilisée par l'aperçu admin (tâche 7).

- [ ] **Step 1 :** `useUpdates` — patron « un chargement rend son résultat » de `v2.md` : notes triées `published_at desc, id`, cœurs et commentaires des notes en deux lectures `.in('update_id', ids)` triées, profils de tous les acteurs cités. À l'ouverture : `update users set updates_seen_at = now() where actor_id = person.actor_id` (éteint la pastille). Écritures : insert/delete directs, puis rechargement ; le bouton cœur désactivé pendant l'envoi.
- [ ] **Step 2 :** `UpdatesPage` + `UpdateCard` + `UpdateConversation`, fidèles à `2371:65` (fil centré, version d'Uriel) et `2371:707` : la première note ouverte ; les suivantes dans un `<details>` dont le `<summary>` porte le titre, la version et la date ; trois commentaires racine visibles puis « Voir les N autres commentaires » ; « Répondre » ouvre le champ sous le fil ; corbeille au survol pour l'auteur ou un admin, avec `ConfirmDialog`. Texte d'une note : paragraphes sur les lignes vides, liens cliquables (même découpe que `toHtml` de `_shared/prospect-mail.ts`, en éléments React — jamais de HTML injecté). Dates par `lib/dates.ts`.
- [ ] **Step 3 :** relever la maquette (`get_design_context` sur `2371:65`) et poser la page côte à côte avec `get_screenshot` ; reprendre chaque écart (jetons, ombre `--shadow-block`, apparition animée du `<details>`).
- [ ] **Step 4 :** `pnpm --filter web-v2 lint` (code de sortie 0), `pnpm --filter web-v2 test`. Commit `feat(v2): la page Nouveautés`.

### Task 6 : la ligne de version et la pastille

**Files:**
- Create: `apps/web-v2/src/features/updates/useUpdatesUnread.ts`, `apps/web-v2/src/components/layout/VersionLine.tsx`, `apps/web-v2/src/styles/3-components/version-line.css`
- Modify: `components/layout/AppShell.tsx` (lit `useUpdatesUnread(pathname)` comme `friendRequests`), `Sidebar.tsx` (`<VersionLine>` dans `sidebar__foot`, entre `NetworkActivity` et `ThemeSwitch`, prop `unread`), `TabBar.tsx` (ligne « Nouveautés » sous Réglages, pastille `tab-bar__dot` sur « Moi », prop `unread`)

**Interfaces:**
- `useUpdatesUnread(pathname: string): boolean` — relit à chaque changement d'adresse : la date de la dernière note (`order published_at desc limit 1`) et `users.updates_seen_at` de la personne ; `isUnread(...)`. Sur `/nouveautes`, toujours `false`.
- `VersionLine({ unread, collapsed }: { unread: boolean; collapsed: boolean })` — `NavLink` vers `/nouveautes`, cloche lucide `Bell` + `Fellowship ${__APP_VERSION__}`, pastille si `unread`, active sur `/nouveautes`, cloche seule si `collapsed` (maquette `2371:403`).

- [ ] **Step 1 :** écrire, brancher, comparer à `2371:403`, `2371:443`, `2371:671`.
- [ ] **Step 2 :** lint + test. Commit `feat(v2): la ligne de version et sa pastille`.

### Task 7 : l'administration `/admin/mises-a-jour`

**Files:**
- Create: `apps/web-v2/src/features/admin-updates/README.md`, `useAdminUpdates.ts`, `UpdatesAdminPage.tsx`, `UpdateForm.tsx`, `apps/web-v2/src/styles/3-components/admin-updates.css`
- Modify: `App.tsx` (route dans `AdminPage`), `Sidebar.tsx` (`ADMIN_ITEMS` : `{ to: '/admin/mises-a-jour', label: 'Mises à jour', Icon: Megaphone, prefixes: ['/admin/mises-a-jour'] }` après Témoignages)

**Interfaces:**
- `interface UpdateDraft { version: string; title: string; body: string; imageUrl: string | null; weight: UpdateWeight }`
- `publishUpdate(draft): Promise<string>` → `supabase.rpc('publish_app_update', …)` ; si `weight === 'big'`, puis `supabase.functions.invoke('app-update-email', { body: { updateId } })` (tâche 8).
- `saveUpdate(id, draft without weight): Promise<void>` → update direct (RLS admin) : rien ne repart.
- `deleteUpdate(id)`, `uploadUpdateImage(file): Promise<string>` (seau `app-updates`, `resizeImage`, largeur 1360).
- `useAdminUpdates()` → `{ updates, audience: number | null, error, reload }` (`audience` = `rpc('app_update_audience')`).

- [ ] **Step 1 :** écrire, fidèle à `2373:65` : version préremplie avec `__APP_VERSION__` ; poids en deux options (radio natifs stylés), figé en modification ; avertissement e-mail avec `audience` réel pour une grosse ; « Aperçu » montre `UpdateCard` (tâche 5) avec le brouillon, sans réactions ; « Publier » demande confirmation par `ConfirmDialog` pour une grosse et se désactive pendant l'envoi ; liste « Publiées » avec cœurs, commentaires, « E-mail envoyé à N », « Modifier », suppression avec confirmation.
- [ ] **Step 2 :** lint + test. Commit `feat(v2): l'administration des mises à jour`.

### Task 8 : l'e-mail d'une grosse mise à jour

**Files:**
- Create: `supabase/functions/app-update-email/index.ts`, `supabase/functions/_shared/update-mail.ts`, `apps/web-v2/src/lib/update-mail.test.ts`
- Modify: `supabase/config.toml` (`[functions.app-update-email]`, `verify_jwt = true`), `supabase/functions/prospect-unsubscribe/index.ts` (le même jeton de 64 caractères désinscrit aussi `users.email_token` → `updates_email_off = true` ; en-tête mis à jour)

**Interfaces:**
- `composeUpdateEmail(o: { title: string; body: string; imageUrl: string | null; url: string; unsubscribeUrl: string }): { subject: string; text: string; html: string }` — l'objet est le titre ; le texte : les deux premiers paragraphes, le bouton « Voir la nouveauté » vers `${APP_URL}/nouveautes`, le pied « Se désinscrire » ; réutilise `toHtml` de `prospect-mail.ts`.
- `chunks<T>(list: T[], size: number): T[][]` — lots de 100 (limite de l'envoi groupé Resend).

- [ ] **Step 1 : tests** (`update-mail.test.ts`, comme `prospect-mail.test.ts`) : l'objet = le titre sur une ligne ; le HTML contient l'image seulement si `imageUrl` ; le lien de désinscription est présent dans le texte et le HTML ; `chunks` de 250 → `[100, 100, 50]`.
- [ ] **Step 2 :** FAIL, implémenter `_shared/update-mail.ts`, PASS.
- [ ] **Step 3 :** la fonction : `is_admin()` de l'appelant (patron `prospect-send`) ; **réclamer** : `update app_updates set email_sent_at = now() where id = $1 and weight = 'big' and email_sent_at is null returning *` — rien de rendu → `409 already_sent`, aucun envoi ; destinataires par `rpc('app_update_email_recipients')` ; envoi groupé `https://api.resend.com/emails/batch`, expéditeur `"Fellowship" <nouveautes@flw.sh>`, en-têtes `List-Unsubscribe`, `Idempotency-Key` = `${updateId}-${index}` ; écrire `email_count` ; un lot refusé est journalisé et compté à part, jamais renvoyé.
- [ ] **Step 4 :** `supabase.exe functions deploy app-update-email` et `prospect-unsubscribe` ; vérifier qu'un appel sans jeton admin rend 403 (`curl`). **Ne pas l'appeler sur une vraie note.**
- [ ] **Step 5 :** commit `feat(fonctions): l'e-mail des grosses mises à jour`.

### Task 9 : vérification d'ensemble

- [ ] `pnpm --filter web-v2 lint`, `test`, `build` : codes de sortie 0.
- [ ] `pnpm dev:v2` : `/nouveautes` sans note (état vide lisible, pas d'erreur), la ligne de version et le menu du téléphone à 390 px, `/admin/mises-a-jour` avec le nombre d'exposants réel et l'aperçu. Captures côte à côte avec les maquettes.
- [ ] Ligne dans `_État.md` (où on en est) ; push. Le déploiement suit `deploiement.md`, sur feu vert d'Uriel, et la première note, c'est lui qui la publie.
