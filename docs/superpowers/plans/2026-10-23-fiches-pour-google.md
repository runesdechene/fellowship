# Les fiches pour Google — plan d'intégration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** chaque fiche publique a une adresse `/evenements/nom-annee`, et Google reçoit dès la première réponse du serveur son titre, sa description, sa canonique et ses données d'événement ; un sitemap liste toutes les fiches.

**Architecture:** la base fabrique et historise les slugs (trigger + table d'historique + fonction de résolution) ; la V2 route sur `/evenements/:slug` et redirige les anciennes adresses ; une Edge Function Netlify remplit la tête d'`index.html` pour `/evenements/*` et fait les 301 serveur ; une seconde sert `sitemap.xml` ; `robots.txt` est statique.

**Tech Stack:** Postgres (Supabase, prod), React Router 7 (`BrowserRouter`), Netlify Edge Functions (Deno), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-23-fiches-pour-google-design.md` (validée par Uriel le 23/10/2026).

## Global Constraints

- Slug : `nom-annee` en minuscules sans accents, `[a-z0-9-]`, l'année = `extract(year from start_date)` ; une année déjà à la fin du nom n'est pas doublée ; la ville (`-ville`) seulement en cas de collision, puis `-2`, `-3`… en dernier recours.
- Le slug **ne suit pas le nom** ; il **suit l'année de `start_date`** : à chaque changement d'année, recalcul, et l'ancien slug part dans l'historique.
- Toute adresse ancienne (`/evenement/<id>[/…]`, `/e/<ancien-slug>`, `/evenements/<ancien-slug>[/…]`) aboutit à la fiche par une **301** côté serveur, et par une redirection `replace` côté app.
- Sous-pages : `/evenements/<slug>/modifier`, `/historique`, `/historique/<version>`, `/avis`. Création : `/evenements/nouveau`.
- Publique = `NOT is_private`. Une fiche privée : ni tête remplie, ni sitemap, ni résolution d'ancien slug pour anon.
- Titre servi : `«Nom» «Année» · avis d'exposants et candidature · Fellowship` (sans doubler l'année si le nom la porte).
- La tête décrit ce que la page affiche sans compte : pas de cloaking, pas de détection de robot. `aggregateRating` seulement si `apercu_fiche` rend au moins un avis, avec la même note et le même nombre.
- Migrations : POURQUOI en tête, `CREATE OR REPLACE` depuis la définition **live**, horodatage plus haut que le dernier, `db push --linked`, vérifiées en prod. Le front déployé appelle `/evenement/:id` : rien de ce que la base change ne doit le casser (ajouts seulement).

## Review Focus

1. **Deux fiches « Fenrir » la même année** dans deux villes : slugs `fenrir-2027-liffre` et `fenrir-2027-rennes`, jamais un écrasement. (Task 1.)
2. **Un nom qui finit déjà par l'année** (« Fenrir 2027 ») ou par une autre année (« Salon 2026 » daté 2027) : `fenrir-2027`, et `salon-2026-2027`. (Task 1.)
3. **Une ancienne adresse d'une fiche privée** : anon n'obtient pas son slug actuel (pas de fuite du nom). (Task 1.)
4. **Une fiche dont la description contient du HTML ou des guillemets** : la `meta description` et le JSON-LD sont échappés, la page reste valide. (Task 4.)
5. **`/evenements/nouveau` et `/evenements/<slug>/modifier`** ne sont jamais pris pour une fiche par l'Edge Function. (Task 4.)

---

### Task 1: Les slugs en base

**Files:**
- Create: `supabase/migrations/<horodatage>_slugs_nom_annee.sql`
- Modify: `apps/web-v2/src/types/supabase.ts` (régénéré)

**Interfaces:**
- Produces: `events_base_slug(p_name text, p_year int) returns text` ; trigger `trg_events_set_slug` **BEFORE INSERT OR UPDATE OF start_date** ; table `event_slug_history (slug text primary key, event_id uuid references events on delete cascade, replaced_at timestamptz default now())`, RLS activée sans politique (lue seulement par fonction) ; `slug_actuel(p_slug text) returns text` SECURITY DEFINER, `STABLE`, accordée à `anon, authenticated` : le slug actuel d'une fiche **publique** trouvée par son slug actuel, un ancien slug, ou son id en texte ; sinon null.

- [ ] **Step 1: Relever les définitions live** de `events_base_slug` et `events_set_slug` (`pg_get_functiondef`) et l'existence d'un index unique sur `events.slug`.
- [ ] **Step 2: Écrire la migration** : nouvelle `events_base_slug` (nom sans année finale égale à l'année, puis `-année`) ; `events_set_slug` : à l'insertion, ou à la mise à jour quand l'année de `start_date` change, calcule la base, ajoute `-ville` si prise par une autre fiche, puis `-2`… ; l'ancien slug (s'il change) va dans `event_slug_history`. Régénération de toutes les fiches, de la plus ancienne à la plus récente (`ORDER BY created_at, id`), chaque ancien slug historisé. Index unique sur `slug` s'il manque.
- [ ] **Step 3: Rouge** — avant le push : `select slug_actuel('terres-de-rohan')` échoue (fonction absente).
- [ ] **Step 4: Appliquer** — `db push --linked`, Expected : `Finished supabase db push.`
- [ ] **Step 5: Vérifier en prod** (requêtes en lecture, dans une seule instruction) : aucun slug sans année ; aucun doublon ; `slug_actuel('<ancien slug>')` rend le nouveau ; `slug_actuel('<id>')` rend le slug ; pour une fiche privée, `slug_actuel` rend null ; les cas du Review Focus 1-2 vérifiés sur des noms réels ou dans une transaction annulée (`begin … rollback` dans une seule instruction `do`).
- [ ] **Step 6: Régénérer les types**, commit `feat(db): des slugs nom-année, historisés, qui suivent l'année de la date`.

### Task 2: `eventPath` et les routes `/evenements`

**Files:**
- Create: `apps/web-v2/src/lib/event-path.ts`, `event-path.test.ts`, `apps/web-v2/src/features/event/EventRedirect.tsx`, `apps/web-v2/src/features/event/useEventSlug.ts`
- Modify: `apps/web-v2/src/App.tsx` (routes), `EventPage.tsx`, `useEvent.ts`, `EditEvent.tsx`, `HistoryPage.tsx`, `VersionPage.tsx`, `WriteReviewPage.tsx`, `CreateEvent.tsx` (`/evenements/nouveau`)
- Delete: `EventSlugRedirect.tsx` (remplacé par `EventRedirect`)

**Interfaces:**
- Consumes: `slug_actuel` (Task 1).
- Produces: `eventPath(event: { slug: string }, sub?: 'modifier' | 'historique' | 'avis' | `historique/${string}`): string` → `/evenements/<slug>[/<sub>]` ; `useEventSlug(slug): { id: string | null; loading: boolean; error: string | null }` (une requête `events.select('id').eq('slug')`) pour les sous-pages.

- [ ] **Step 1: Test qui échoue** — `eventPath({ slug: 'fenrir-2027' })` → `'/evenements/fenrir-2027'` ; avec `'avis'` → `'/evenements/fenrir-2027/avis'` ; avec `'historique/3'` → `'/evenements/fenrir-2027/historique/3'`.
- [ ] **Step 2-4:** Rouge, implémenter, vert (`npx vitest run src/lib/event-path.test.ts`).
- [ ] **Step 5: Routes** — `/evenements/nouveau`, `/evenements/:slug`, `/evenements/:slug/modifier`, `/historique`, `/historique/:version`, `/avis`. Les sous-pages lisent `:slug` et obtiennent l'id par `useEventSlug`. `useEvent` charge par slug. Anciennes routes `/evenement/nouveau` → `<Navigate replace>` ; `/evenement/:id/*` et `/e/:slug` → `EventRedirect` : `slug_actuel(param)` puis `navigate(eventPath(…, reste), { replace: true })` en gardant `search` et `hash`, « introuvable » sinon. `/evenements/<ancien-slug>` : quand `useEvent` ne trouve pas le slug, il essaie `slug_actuel` et redirige.
- [ ] **Step 6: Navigateur** (`pnpm dev`, connecté et déconnecté) : `/evenements/<slug>`, ses sous-pages, `/evenement/<id>#discussions`, `/e/<ancien-slug>` aboutissent tous ; Retour du navigateur ne revient pas sur l'ancienne adresse.
- [ ] **Step 7:** `tsc -b`, lint, commit `feat(v2): les fiches vivent sous /evenements/<slug>`.

### Task 3: Les liens vers une fiche

**Files:** tous les fichiers de `apps/web-v2/src` qui écrivent `/evenement/` (relevé : `grep -rn "/evenement" src`), et `supabase/functions/send-push/phrases/` via leur source `lib/` + `scripts/sync-push-phrases.mjs`.

- [ ] **Step 1:** Ruling posé d'avance : les surfaces **vues sans compte** passent à `eventPath` avec le slug — `PublicEventCard`, `EscaleCard`, `Stamps`, `EmbedPage`, `DuplicateList` — en ajoutant `slug` à leurs requêtes ou RPC (CREATE OR REPLACE depuis le live si une RPC doit le rendre). Les autres liens (tableau de bord, communauté, notifications, admin, push) gardent `/evenement/<id>` : ils passent par `EventRedirect` (une petite requête de plus, connectés seulement). Lister ces fichiers dans le rapport.
- [ ] **Step 2:** Tests existants qui figent une adresse (`community.test.ts`, `notifications.test.ts`, `push-lines.test.ts`, `welcome.test.ts`) : inchangés si leur code garde `/evenement/<id>` ; sinon mis à jour au slug.
- [ ] **Step 3:** Vérifier au navigateur déconnecté : la recherche publique `/festivals` et une vitrine mènent directement à `/evenements/<slug>` (sans passer par une redirection).
- [ ] **Step 4:** commit `feat(v2): les pages publiques lient les fiches par leur adresse lisible`.

### Task 4: La tête de la fiche servie par Netlify

**Files:**
- Create: `apps/web-v2/netlify/edge-functions/fiche.ts`, `apps/web-v2/netlify/edge-functions/fiche-head.ts` (fonctions pures), `apps/web-v2/src/lib/fiche-head.test.ts` (teste `fiche-head.ts` sous Vitest), `apps/web-v2/netlify/edge-functions/README.md`
- Modify: `apps/web-v2/netlify.toml` (`[[edge_functions]] path = "/evenements/*"` et `"/evenement/*"`, `"/e/*"`)

**Interfaces:**
- Consumes: `slug_actuel`, `apercu_fiche`, lecture anon de `events` ; variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` lues par `Netlify.env.get` (à poser sur le site si absentes — action Netlify, avec le GO d'Uriel).
- Produces: `ficheHead(fiche: { name; slug; startDate; endDate; city; department; description; imageUrl }, apercu: { reviews: number; score: number | null } | null, origin: string): string` (le HTML à insérer dans `<head>`), `escapeHtml`, `plainText(html, max)`.

- [ ] **Step 1: Tests qui échouent** (`fiche-head.test.ts`) : titre `Fenrir 2027 · avis d'exposants et candidature · Fellowship` pour « Fenrir 2027 » comme pour « Fenrir » daté 2027 ; `<link rel="canonical" href="https://flw.sh/evenements/fenrir-2027">` ; description tirée de la description sans balises, coupée à 155 caractères sur un mot, sinon « Dates · Ville (dép.) » ; guillemets et `<` échappés dans la meta ; JSON-LD `Event` avec `startDate`, `endDate`, `location.address.addressLocality`, `image` ; `aggregateRating` présent avec 3 avis et 4,8, absent avec 0 ; `</script>` dans une description ne ferme pas le JSON-LD.
- [ ] **Step 2-4:** Rouge, implémenter, vert.
- [ ] **Step 5: `fiche.ts`** : `/evenement/<id>[/reste]`, `/e/<slug>` et `/evenements/<ancien-slug>[/reste]` → `slug_actuel` → 301 vers `/evenements/<slug>[/reste]` (sauf `/evenement/nouveau` → 301 `/evenements/nouveau`). `/evenements/<slug>` exact et actuel → `context.next()`, lit la fiche (publique) et `apercu_fiche`, remplace `<title>` et `meta description` d'`index.html` et insère le reste de `ficheHead` ; toute autre sous-page, `nouveau`, fiche inconnue ou privée, erreur réseau → `context.next()` inchangé. `Cache-Control: public, max-age=300`.
- [ ] **Step 6: Vérifier** en local avec `netlify dev` si la CLI le permet, sinon sur un déploiement de prévisualisation (`netlify deploy` sans `--prod`, avec le GO d'Uriel) : `curl` d'une fiche → titre propre et JSON-LD ; `curl -I /evenement/<id>` → 301 ; [Test des résultats enrichis de Google] sur l'URL de prévisualisation.
- [ ] **Step 7:** commit `feat(v2): chaque fiche donne à Google son titre, sa description et ses données`.

### Task 5: `sitemap.xml` et `robots.txt`

**Files:**
- Create: `apps/web-v2/netlify/edge-functions/sitemap.ts`, `apps/web-v2/public/robots.txt`
- Modify: `apps/web-v2/netlify.toml` (`path = "/sitemap.xml"`)

- [ ] **Step 1:** `sitemap.ts` : les fiches publiques (`slug`, `updated_at` s'il existe sinon `created_at`), triées par slug, plus `/` et `/festivals` ; XML échappé ; `Content-Type: application/xml`. La logique de rendu est une fonction pure testée dans `src/lib/sitemap.test.ts` (rouge puis vert : deux fiches → deux `<url>` avec `<loc>` et `<lastmod>`, `&` échappé).
- [ ] **Step 2:** `robots.txt` : `User-agent: *`, `Disallow:` des espaces privés (`/admin`, `/reglages`, `/connexion`), `Sitemap: https://flw.sh/sitemap.xml`.
- [ ] **Step 3:** vérifier sur la prévisualisation : `curl /robots.txt` (texte) et `/sitemap.xml` (XML valide, nombre de `<url>` = fiches publiques + 2).
- [ ] **Step 4:** commit `feat(v2): un sitemap des fiches et un robots.txt`.

### Fin

- [ ] Déploiement en prod : **Uriel**, après validation de la prévisualisation. Puis déclarer `https://flw.sh/sitemap.xml` dans la Search Console et demander l'indexation de trois fiches (Claude par le Chrome d'Uriel, avec son accord).
- [ ] READMEs des dossiers touchés ; `_État.md` du vault.
