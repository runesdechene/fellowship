---
paths:
  - "supabase/**"
  - "**/*.sql"
---

# Base de données — Supabase, RLS, Storage, migrations

> ⚠️ Le Supabase branché au MCP est la PRODUCTION. Toute migration appliquée touche le site déployé.
> Regroupé le 25/09/2026 depuis la mémoire locale, pour que ce savoir voyage avec le dépôt.

## reference_supabase_mcp_is_prod

**Le projet Supabase `trbxpsknbtisqwefqoub` accessible via le MCP EST la base de PRODUCTION** qui sert le site déployé (Netlify) ET les iframes/embeds sur les sites externes des clients. « On bosse en local » s'applique au CODE (dev server), PAS à la base : un `apply_migration` / `execute_sql` DDL touche la prod immédiatement.

**Conséquence (incident vécu 2026-06-26) :** un changement DB **non rétro-compatible** casse le frontend DÉJÀ déployé. Concret : `revoke select on entities from anon` + grant colonnes → le code déployé qui faisait `select('*')` sur entities a reçu `42501` → embeds + vitrines publiques en « Profil introuvable » pour tous les visiteurs anon. Hotfix = `grant select on public.entities to anon` (restaure, ré-ouvre temporairement la fuite).

**Règles :**
- Avant tout `apply_migration`/DDL sur la prod, se demander : « le code DÉPLOYÉ (pas mon local) survit-il à ce changement ? ». Si non → **déployer le frontend rétro-compatible D'ABORD**, la restriction DB ENSUITE.
- Les changements purement additifs (nouvelle table, nouvelles policies sur une table non encore lue par le déployé) sont sûrs. Les `revoke`/`drop`/`rename`/changements de type/contrainte sur des objets lus par le déployé ne le sont PAS.
- Prévenir Uriel avant d'appliquer une migration qui exige un déploiement coordonné ; ne pas traiter le MCP DB comme un bac à sable local.

Résolu (2026-06-26) : frontend liste blanche déployé (commits → main, CI vert), PUIS revoke ré-appliqué, PUIS vérifié sur la prod (embed + vitrine chargent, anon bloqué sur stripe). Fuite fermée. Cf. [[reference_pg_column_grant_revoke]].

**Piège détection de déploiement Netlify** : le hash du bundle principal `assets/index-*.js` ne change PAS quand seules des routes lazy/code-splittées changent (Landing/Embed/vitrine/admin sont des chunks séparés). Poller ce hash = aveugle. Détecter via un **chunk lazy nouveau/modifié** : `curl -o /dev/null -w "%{http_code}" https://flw.sh/assets/<NomChunk-HASH>.js` (200 = déployé). Un fichier NEUF de la session (ex. `AdminTestimonials-*.js`) est le signal le plus fiable. Netlify ne poste pas de statut GitHub ici (`gh ... /status` = vide) ; le CI `ci.yml` (Lint/Build/Test) ne déploie pas, Netlify build de son côté.

## supabase-cli-setup

Supabase CLI est installé en devDependency (`supabase` dans package.json).

**Problème :** `pnpm exec supabase` ne fonctionne pas sur Windows (le binaire n'est pas dans le PATH de pnpm).

**Solution :** utiliser le chemin direct vers le binaire :
```
"C:/Users/uriel/desktop/DEVS/fellowship/node_modules/supabase/bin/supabase.exe"
```

**Si le binaire manque** (après un `pnpm install` frais), relancer le postinstall :
```
cd node_modules/supabase && node scripts/postinstall.js
```

**Commande courante :**
```bash
"C:/Users/uriel/desktop/DEVS/fellowship/node_modules/supabase/bin/supabase.exe" db push
```

Le projet est déjà lié (via `supabase/config.toml` ou `.supabase`), pas besoin de `supabase link` à chaque session.

**`npx --no-install supabase ...` marche aussi** (vérifié 2026-06-02, v2.88.1) — alternative au chemin binaire direct.

**Push non-interactif d'une migration en prod** (vérifié 2026-06-02) : le `.env` du repo contient `SUPABASE_ACCESS_TOKEN` + `SUPABASE_DB_PASSWORD`. Les exporter évite le prompt mot de passe ; `echo y |` répond au Y/n :
```bash
export SUPABASE_ACCESS_TOKEN="$(grep '^SUPABASE_ACCESS_TOKEN=' .env | sed 's/^SUPABASE_ACCESS_TOKEN=//; s/\r$//; s/^"//; s/"$//')"
export SUPABASE_DB_PASSWORD="$(grep '^SUPABASE_DB_PASSWORD=' .env | sed 's/^SUPABASE_DB_PASSWORD=//; s/\r$//; s/^"//; s/"$//')"
npx --no-install supabase migration list --linked   # contrôle : colonne remote vide = en attente
echo "y" | npx --no-install supabase db push --linked
```
Cf. [[reference_supabase_migration_repair]] si une migration est sautée.

**Stack LOCALE (vérifié 2026-05-25) :** `supabase start` (besoin de **Docker Desktop lancé**) monte tout le stack (db `127.0.0.1:54322`, API `:54321`, Studio `:54323`, Mailpit `:54324`). `supabase db reset` réapplique TOUTES les migrations à froid — **fonctionne maintenant** (la migration `20260404110000_cleanup_old_schema.sql` a été corrigée pour être rejouable sur base vide). CLI v2.88.1 → clés `sb_publishable_*` (= clé anon pour supabase-js v2). `.env` du repo pointe le **distant** — pour tester l'app contre le local, poser un `.env.local` (Vite le prioritise) avec l'URL+clé locales. psql direct : `docker exec -i supabase_db_fellowship psql -U postgres -d postgres`.

## Re-applying an edited Supabase migration

**Scenario:** You ran `supabase db push` and applied migration `20260509120000_foo.sql`. Then you edit the file (e.g. add `SET search_path = public` to a function). Re-running `db push` will SKIP it because the timestamp is already in `supabase_migrations` (history checks the recorded hash, not the current file).

**Fix:** Mark the migration as reverted in history, then push again. The function definition gets re-applied (CREATE OR REPLACE FUNCTION is idempotent so this is safe for SQL functions; for actual schema changes, write a new migration instead).

```
"C:/Users/uriel/desktop/DEVS/fellowship/node_modules/supabase/bin/supabase.exe" migration repair --status reverted 20260509120000
"C:/Users/uriel/desktop/DEVS/fellowship/node_modules/supabase/bin/supabase.exe" db push
```

**When this is OK:** SQL function or view edits via CREATE OR REPLACE. The migration file is replayable from scratch.

**When this is NOT OK:** edits that include irreversible DDL (CREATE TABLE, ALTER TABLE ADD COLUMN, etc.). For those, write a new migration with the next timestamp instead.

## reference-supabase-db-diverge-recovery

Quand `supabase db push --linked` répond *"Remote migration versions not found in local migrations directory"* ou *"Found local migration files to be inserted before the last migration on remote database"*, c'est que la table `supabase_migrations.schema_migrations` a un état qui ne matche pas les fichiers locaux. Cas typique : tu as appliqué des migrations manuellement en prod (via Studio ou SQL direct) qui ne sont pas dans le repo, ou inversement.

**Procédure de réconciliation (testée 2026-05-28) :**

1. **Lister la divergence** :
   ```
   "C:/Users/uriel/desktop/DEVS/fellowship/node_modules/supabase/bin/supabase.exe" migration list --linked
   ```
   Te montre `Local | Remote | Time` pour chaque timestamp. Les colonnes vides identifient ce qui manque où.

2. **Dumper le schema réel de la prod pour comparer** (ne touche à rien) :
   ```
   "C:/Users/uriel/desktop/DEVS/fellowship/node_modules/supabase/bin/supabase.exe" db dump --linked --schema public -f prod_schema_snapshot.sql
   ```
   Grep dans le dump pour les objets que tes migrations veulent créer (`CREATE TABLE foo`, `ADD VALUE 'bar'`, etc.). Si l'objet est déjà là, la migration est **déjà appliquée en pratique** sous un autre timestamp.

3. **Marquer comme `applied`** les migrations locales dont les effets sont déjà en prod :
   ```
   migration repair --status applied <timestamp1> <timestamp2> ...
   ```
   Ça ne touche PAS au schéma, juste à la table de tracking. Réversible.

4. **Marquer comme `reverted`** les migrations remote-only (appliquées manuellement, pas dans le repo) si tu veux pouvoir `db push` malgré tout :
   ```
   migration repair --status reverted <timestamp1> <timestamp2> ...
   ```
   Idem : ne défait rien, juste dit "ignore ces lignes du tracking". Réversible.

5. **Dry-run le push** pour voir ce qui va vraiment partir :
   ```
   db push --linked --include-all --dry-run
   ```

6. **Push réel** seulement après validation du dry-run :
   ```
   db push --linked --include-all
   ```

**Piège classique** : `CREATE POLICY` n'est PAS idempotent en PostgreSQL <17 (pas de `IF NOT EXISTS`). Si une migration locale veut recréer une policy déjà en prod, elle crashe. Soit la marquer `applied`, soit ajouter `DROP POLICY IF EXISTS ... ;` avant le CREATE.

**Anti-piège `gh pr merge --delete-branch`** : si ton main local est resté longtemps en arrière (parce que tu bossais sur des branches), le `--delete-branch` checkout vers main local d'abord, donc te ramène l'ancien code sur le disque. Après le merge, **toujours** :
```
git fetch origin && git reset --hard origin/main
```

[[feedback-main-branch-workflow]]

## Calling new Supabase RPCs (Fellowship)

When adding a new Postgres RPC via migration, `src/types/supabase.ts` doesn't know about it yet. TypeScript will error: `Argument of type '"my_new_rpc"' is not assignable to parameter of type '"are_friends" | ...'`.

**Project precedent** (`src/hooks/use-events.ts:133`):
```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { data } = await (supabase.rpc as any)('search_similar_events', { ... })
```

This pattern is used for `get_friends_with_dates` (added 2026-05-09) and `search_similar_events`. It's not ideal but it's the convention until someone runs `supabase gen types typescript --linked > src/types/supabase.ts` to refresh the generated types.

**Alternative if you want full type safety:** regenerate the types via Supabase CLI. Direct binary on Windows (cf. `reference_supabase_cli.md`):
```
"C:/Users/uriel/desktop/DEVS/fellowship/node_modules/supabase/bin/supabase.exe" gen types typescript --linked > src/types/supabase.ts
```

## reference_pg_column_grant_revoke

**Pour cacher certaines colonnes d'une table à un rôle (ex. `anon`), `REVOKE SELECT (col) ... FROM role` ne suffit PAS** : si le rôle a un grant SELECT au **niveau table**, ce grant domine et le revoke par colonne est un **no-op silencieux** (la lecture renvoie la valeur, aucune erreur). Vérifié sur `entities` le 2026-06-26 : après `revoke select (stripe_customer_id) from anon`, `set role anon; select stripe_customer_id` renvoyait toujours la donnée.

**La bonne séquence :**
```sql
revoke select on public.<table> from <role>;
grant  select (col_a, col_b, …safe…) on public.<table> to <role>;
```
La liste grantée doit couvrir EXACTEMENT ce que l'app lit côté `<role>` (sinon les requêtes existantes cassent en `42501 permission denied for table`). Et tout `select('*')` du rôle restreint échoue désormais → narrower les requêtes vers une liste blanche AVANT le revoke.

Cas Fellowship : `entities` exposait stripe_customer_id / subscription_status / siren / legal_name… à `anon` (la vitrine faisait `select('*')`). Fix : `revoke select on entities from anon` + `grant select (<PUBLIC_ENTITY_COLUMNS>) to anon` (migration `20260626100145`), et `use-vitrine.ts` / `Embed.tsx` passés sur la const `PUBLIC_ENTITY_COLUMNS` (src/lib/vitrine.ts). `authenticated` garde le grant table (le proprio lit ses infos billing). **Résidu connu** : un user authentifié peut encore lire le billing d'une autre entité via un select brut (IDOR authentifié) ; vrai fix = sortir les colonnes billing dans une table séparée RLS own-row-only. Vérifier toute restriction colonne par `set role <role>; select <col>` (erreur = OK). Lié : [[reference_storage_rls_security_definer]].

## reference_storage_rls_security_definer

**Pour un bucket Storage, créer le JEU COMPLET de policies, SELECT inclus.** Cause racine vécue (bucket `testimonials`, 2026-06-25) : j'avais INSERT/UPDATE/DELETE mais **pas de SELECT** → `supabase.storage.upload(path,file,{upsert:true})` doit LIRE l'objet (vérif existence + readback de la ligne) → sans SELECT, upload échoue en `400 "new row violates row-level security policy"` (message trompeur : c'est le readback, pas l'INSERT, qui manque). Tous les buckets sains ont un `*_select_public`.

**Jeu correct + SÉCURISÉ (admin-only en écriture), bucket public :**
```sql
create function public.is_admin() returns boolean language sql stable security definer
  set search_path to 'public'
  as $$ select exists(select 1 from users where actor_id=auth.uid() and role='admin') $$;
create policy "<b>_select" on storage.objects for select to public using (bucket_id='<b>');
create policy "<b>_insert" on storage.objects for insert to authenticated with check (bucket_id='<b>' and public.is_admin());
create policy "<b>_update" on storage.objects for update to authenticated using (bucket_id='<b>' and public.is_admin());
create policy "<b>_delete" on storage.objects for delete to authenticated using (bucket_id='<b>' and public.is_admin());
```
Client : upload à la racine `${Date.now()}.${ext}` suffit.

**`public.is_admin()` (SECURITY DEFINER, qualifié) MARCHE dans le WITH CHECK storage** — vérifié : admin → INSERT passe, non-admin → refusé. ⚠️ NE PAS conclure l'inverse : si is_admin() « semble » échouer, c'est probablement la policy SELECT qui manque (le `returning`/readback casse avant). Une **sous-requête brute** `from users` (non qualifiée), elle, échoue vraiment en storage (search_path sans public) → toujours passer par is_admin()/can_act_as.

**Probe SQL fiable** (une fois la policy SELECT en place) : `begin; select set_config('request.jwt.claims', json, true); set local role authenticated; insert into storage.objects(bucket_id,name) values('<b>','x.jpg') returning id; rollback;`. Le `returning` exerce le SELECT → reproduit fidèlement l'upload (admin passe / non-admin 42501).

**Méthode anti-perte-de-temps :** face à un 400 RLS storage, diff le **set complet** de policies vs un bucket sain (surtout SELECT) AVANT de tripoter les expressions. J'ai brûlé 5 migrations à régler l'INSERT alors que le trou était le SELECT. Lié : [[reference_da_css_tokens]].

## follows-rls-third-party

La RLS `follows_select` = `USING (can_act_as(follower_actor) OR can_act_as(following_actor))`.
Donc une lecture directe `supabase.from('follows')` ne renvoie QUE les lignes où le viewer
est partie prenante (lui-même ou membre de l'entité). Pour afficher le réseau d'un acteur
**tiers** (ex : abonnés d'une vitrine qu'on visite), il FAUT une RPC SECURITY DEFINER bornée.

Rails corrects déjà en place : `get_friends_with_dates`, `get_network_follow_activity`,
`get_follow_suggestions`, `get_followers_with_dates` (v0.7.226, migr. 20260605120000) et
`get_following_with_dates` (v0.7.227, migr. 20260605130000, = abonnements/onglet Instagram)
— toutes SECURITY DEFINER, GRANT anon+authenticated = preuve sociale publique.

**Bug type corrigé v0.7.226 :** `use-vitrine.ts fetchNetwork` lisait `follows` en direct
pour la liste « Abonnés » → compteur faux (quasi 0/1) pour tout visiteur non-membre, alors
que le feed Communauté (RPC) captait bien le follow. Symptôme = un follow visible dans
l'activité mais absent des abonnés de la vitrine cible.

**Règle :** si tu lis du social (follows/amis) pour un actor_id ≠ currentActor, passe par
une RPC SECURITY DEFINER. Cf. [[reference_supabase_rpc_types]] (cast `supabase.rpc as any`).

## reference_private_events_leak_surfaces

Feature « événements privés » (`events.is_private`, v0.7.277, modèle unlisted). Pour qu'un event privé ne fuite NULLE PART, il faut filtrer **toutes** les lectures d'`events`, pas seulement les hooks de listing évidents. Liste exhaustive (vérifiée en revue adversariale) :

**Filtrer `is_private=false` :**
- `use-events.ts` (`useEvents`, `useRecentEvents`) — Explorer.
- `use-map-events.ts` — Carte.
- `use-admin.ts` (liste + compteur) — back-office.
- `use-vitrine.ts` — dates de la vitrine publique (nested select `events(...)` → filtrer client-side).
- `use-community.ts` — requête « nouveaux events » + **la requête `eventMap` centrale** (chokepoint : tous les items du fil sont sautés si l'event n'y est pas).
- `Embed.tsx` — widget Shopify public (jumeau de la vitrine ; nested select + filtre client).
- `use-participations.ts` → `useFriendsParticipations` — « où vont mes amis » sur le Calendrier (`.eq('events.is_private', false)`).
- `SearchBar.tsx` — recherche globale (⚠️ elle cherche BIEN dans `events`, pas seulement les entités).
- `use-community-badge.ts` — compteur « nouveaux festivals ».
- `TagInput.tsx` — autocomplétion de tags (lit `events.tags`).
- RPC SQL `search_similar_events` (dédup création) et `get_coevent_suggestions` — recréées avec `is_private=false`.
- **Triggers DB de notif** `notify_friend_going` + `notify_friend_note` (`AFTER INSERT` participations/notes) : garde `IF event_is_private THEN RETURN NEW`. 🔴 **Le piège #1** : l'auto-participation du créateur à un event privé déclenchait `notify_friend_going` → nom + lien de l'event privé poussés à TOUS ses abonnés.

**NE PAS filtrer (accès légitime) :**
- `useEvent(key, by)` (lookup unitaire par id/slug) = l'accès par lien.
- `useMyParticipations` (events(*)) = Calendrier/Cockpit du créateur (ses propres dates, privés inclus, avec cadenas).
- Les RPC `get_*_with_dates` / `get_friend_ids` = graphe de follow uniquement, ne renvoient PAS d'events.

**Leçon générale** : pour toute feature « privé/caché/brouillon », énumérer d'abord TOUTES les lectures de la table (`from('events')` + RPC SECURITY DEFINER + nested selects + **triggers DB**), puis lancer une **revue adversariale dédiée** avant de ship. Le `notify_event_created` (broadcast à tous) était déjà droppé (`20260611120000`), sinon ça aurait été pire. Cf. [[project_progress]].

## reference_profiles_vs_users_writes

Le profil perso (display_name, city, postal_code, sex, avatar_url) doit être lu/écrit sur la table **`users`** (modèle acteur, keyée par `actor_id = auth.uid()`), PAS sur la table **`profiles`** legacy.

Tout l'affichage (header, switcher d'acteur, avatar) lit `users.display_name` via `person` dans `auth.tsx` (fetchIdentity). `profiles` est du legacy mort pour ce flux mais existe encore et certaines pages le lisent toujours (chantier "recâblage → Plan 3", cf. commentaire `auth.tsx`).

**Bug réel (2026-06-01, v0.7.197)** : `Settings.tsx` écrivait dans `profiles` → le prénom corrigé ne s'affichait jamais, l'app gardait le nom d'onboarding (Onboarding écrit `users`). Fix = Settings lit+écrit `users` par actor_id. RLS `users_update_self` (`actor_id = auth.uid()`) autorise le self-update via le client anon.

Gotcha annexe : `users.sex` stocké `"indefini"` (sans accent) mais le `<select>` propose `"indéfini"` → normaliser à la lecture.

Lié : [[project_communaute_v1]] (autres pages pas encore recâblées).

## reference_edge_function_deploy_gotcha

Le code d'une edge function (`supabase/functions/*/index.ts`) vit dans le repo, mais
**git commit/push ne redéploie rien** : la function tournant en prod reste la dernière
version `supabase functions deploy`. Un fix committé peut donc être totalement absent du serveur.

**Symptôme vécu (2026-06-22, SIREN)** : la modale envoyait bien `legalName/siren` dans le body,
mais `stripe-checkout-session` déployée était une version d'avant-SIREN (ancienne `interface Body`
sans ces champs) → la donnée était **ignorée silencieusement** côté serveur. J'ai en plus perdu du
temps en **supposant** que le numéro de version élevé (v7) contenait déjà le code — faux.

**Règle** : avant de conclure qu'un fix d'edge function est en prod, **lire la source déployée**
via MCP `get_edge_function` (champ `files[].content`) et chercher le code attendu — ne jamais se fier
au numéro de version ni au fait que le code est committé. Puis déployer explicitement :
`supabase functions deploy <slug> --project-ref trbxpsknbtisqwefqoub` (token via [[reference_supabase_cli]]).

Déploiement = action prod → avec le GO d'Uriel (cf. [[fellowship-progress-tracker]]).

## feedback-backup-table-data-before-drop

Avant tout `DROP TABLE`/`DROP COLUMN` destructif sur la prod, **dumper le contenu COMPLET de la cible** (toutes les colonnes), pas un sous-ensemble choisi à la louche.

**Why:** Au Plan 4 / Phase 5b (2026-06-02), j'ai droppé la table `profiles` après avoir backupé seulement les `events`. Or `profiles.avatar_url` (avatars perso) n'avait jamais été backfillé vers `users` (le backfill 120001 mettait l'avatar exposant à NULL volontairement) → tous les avatars perso ont disparu de l'affichage en prod. Récupérables par chance car les **fichiers images survivent dans le bucket Storage `avatars/{actor_id}/{timestamp}.ext`** (le DROP ne touche pas le Storage) — mais j'ai dépendu de la chance, pas d'un backup.

**How to apply:**
- Avant un DROP, `supabase db dump --data-only` de la table OU un export REST de TOUTES ses colonnes, hors-repo.
- Vérifier que CHAQUE colonne legacy a un équivalent vivant ailleurs AVANT de dropper (ne pas supposer qu'un backfill a tout couvert — 120001 excluait volontairement display_name/avatar_url des exposants).
- Récup avatars si re-perdu : lister `avatars/{actor_id}/`, filtrer les vrais avatars (`^[0-9]+\.(jpg|png|webp)$`, exclure `banner-*`), reconstruire l'URL publique, écrire `users.avatar_url`.

Lié à [[project_plan4_legacy_columns]] et [[feedback_save_credentials_to_env]] (même esprit : sécuriser avant d'agir).

## feedback_storage_buckets

Uriel veut des **buckets de storage très bien rangés, sans mélange injustifié**. Si un nouveau bucket est nécessaire (et que je ne peux pas le créer moi-même), **lui demander** — ne pas réutiliser un bucket existant par commodité si le contenu n'a rien à y faire.

**Why:** Il tient à l'organisation propre du storage ; mélanger des types de contenu sans raison (ex. logos d'entité dans un bucket `avatars` pensé pour les photos perso) crée du désordre durable et difficile à défaire.

**How to apply:** Avant de uploader vers un bucket, vérifier que le contenu correspond vraiment à la vocation du bucket. En cas de doute (nouveau type de média, ex. logos d'entité vs avatars perso, bannières, images d'œuvres de la vitrine), proposer un bucket dédié et **demander confirmation** plutôt que d'assumer la réutilisation. Énoncé le 2026-05-25 pendant le brainstorm onboarding (où je m'apprêtais à réutiliser `avatars` pour les logos d'entité). Lié à [[feedback_save_credentials_to_env]], [[fellowship-progress-tracker]].
