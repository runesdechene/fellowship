# Pages lisibles par les IA — plan de réalisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** qu'un agent IA qui n'exécute pas le JavaScript lise, sur `flw.sh`, chaque fiche publique et des pages « la sélection Fellowship » par type × zone, et les cite à l'exposant.

**Architecture:** deux fonctions Netlify (même mécanisme que `sitemap.mjs`, déjà déployé par `--functions`) servent `/evenements/:slug` et `/festivals/:type/:zone` : elles lisent la base avec la clé anonyme, prennent l'`index.html` publié du site et y injectent tête de page, JSON-LD et contenu en clair dans `#root` ; React remplace ce contenu au montage. Le calcul (score, sélection, HTML) vit dans des fonctions pures de `apps/web-v2/src/lib/`, testées par Vitest et importées à la fois par les fonctions Netlify et par l'application.

**Tech Stack:** React + Vite (V2), Vitest, Netlify Functions (TypeScript, bundlées par la CLI), Supabase (Postgres, RLS, `SECURITY DEFINER`).

**Spec:** `docs/superpowers/specs/2026-11-03-pages-pour-les-ia-design.md` — lire en entier avant toute tâche.

## Global Constraints

- pnpm uniquement ; TypeScript strict : pas de `any`, `@ts-ignore`, `as unknown as`. Pas de `console.log` laissé (`console.error` dans un `catch` de fonction Netlify, comme `sitemap.mjs`).
- Migrations : `supabase/migrations/<horodatage>_<nom>.sql`, POURQUOI en tête, appliquées par `node_modules/supabase/bin/supabase.exe db push --linked` (jamais `apply_migration` du MCP). La base est la production. Tout `CREATE OR REPLACE` part de la définition live copiée entière.
- Toute requête dont on prend « le premier résultat » est triée.
- Lecture publique **avec la clé anonyme** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) : la RLS décide des fiches visibles ; `is_private` n'est jamais exposé.
- Formule de signature, mot pour mot, partout : **`la sélection Fellowship`**. Jamais « selon les exposants ».
- Publiquement, des avis : au plus **la note moyenne et le nombre d'avis**. Jamais le texte, jamais une identité, jamais une recette.
- Une page de sélection n'existe que si elle compte **au moins 3 fêtes à venir** ; « à venir » = `start_date` dans les **12 prochains mois** (ou `end_date` ≥ aujourd'hui).
- Top **5** ; l'année de la saison dans le titre et le `<h1>`, jamais dans l'adresse.
- Hors de France : pages **par pays** (`/festivals/<type>/suisse`), jamais dans les pages France.
- Réponses HTML : `Cache-Control: public, max-age=3600`.
- Conventional Commits en français, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Avant un commit qui suit un `git checkout`, `git checkout -- graphify-out`.
- **Le design appartient à Uriel** : rien de visible par un humain n'est codé sans maquette Figma validée (Task 7). Les fiches gardent leur maquette (2506:233, 2518:233).

## Review Focus

1. **Texte hostile dans une fiche** (`</script>`, `<img onerror>` dans un nom ou une description) : échappé dans le HTML et dans le JSON-LD → test dans Task 4.
2. **Fiche privée ou slug inconnu** : la fonction rend l'`index.html` intact (statut 200, l'application affiche son propre « introuvable »), jamais une donnée → test dans Task 5.
3. **Base indisponible** : la fonction rend l'`index.html` intact plutôt qu'une 500 — l'application doit rester servie → test dans Task 5.
4. **Fiche à moitié remplie** (sans prix, sans lien, sans dates de fin, sans image) : la ligne s'écrit sans trou ni « undefined » → test dans Task 3 et Task 4.
5. **Fête sur plusieurs types et deux éditions** (tags `['fete-medievale','marche-noel']`, ancienne édition passée) : elle paraît dans les deux sélections, seule l'édition à venir compte → test dans Task 3.

---

### Task 1: Relevé de départ des dix recherches

**Files:**
- Create: `docs/v2/visibilite-ia.md`

- [ ] **Step 1:** Écrire dans `docs/v2/visibilite-ia.md` les dix recherches (POURQUOI en tête : la mesure de succès du spec) :
  1. fête médiévale PACA candidature · 2. les 5 fêtes médiévales à ne pas rater en Occitanie · 3. meilleurs festivals fantastiques de France · 4. festival metal stand exposant · 5. marché de Noël médiéval Suisse stand · 6. salon geek candidature exposant 2027 · 7. fêtes médiévales immanquables Bretagne · 8. marché de créateurs Auvergne-Rhône-Alpes stand · 9. festival tatouage exposant prix stand · 10. où exposer en fête médiévale en Île-de-France.
- [ ] **Step 2:** Tableau de relevé : une ligne par recherche, colonnes `ChatGPT · Perplexity · Gemini · Claude`, cellule = « cité (page) », « absent », ou la source citée à notre place. Date du relevé en titre de section. Le relevé se fait par Uriel ou par Claude avec le navigateur (Claude in Chrome) — sans compte connecté à Fellowship.
- [ ] **Step 3:** Ajouter la section « Visites venues des IA » : référents à suivre (`chatgpt.com`, `perplexity.ai`, `gemini.google.com`, `claude.ai`) et la date du jugement (mise en ligne des sélections + 3 mois).
- [ ] **Step 4: Commit** — `docs(v2): relevé de départ de la visibilité de Fellowship auprès des IA`

### Task 2: Département propre et pays

**Files:**
- Create: `supabase/migrations/<horodatage>_events_departement_pays.sql`
- Modify: `apps/web-v2/src/lib/regions.ts`, `apps/web-v2/src/lib/regions.test.ts`

**Interfaces:**
- Produces (base) : `events.country text not null default 'FR'` (ISO : `'FR'`, `'CH'`, `'BE'`…) ; `events.department` = code (`'03'`, `'2A'`, `'971'`) pour la France, nom du canton/province sinon ; fonction `department_code(raw text) returns text` (immutable) ; trigger `trg_events_department` (before insert or update of `department`, `address`) qui normalise.
- Produces (TS) : `export const REGION_NAMES: string[]` ; `export function zoneSlug(zone: string): string` (`'Provence-Alpes-Côte d’Azur'` → `'provence-alpes-cote-d-azur'`, `'Suisse'` → `'suisse'`) ; `export function zoneOf(event: { country: string; department: string | null }): string | null` (région française, ou nom du pays en français : `CH` → `'Suisse'`, `BE` → `'Belgique'`).

- [ ] **Step 1:** Relever la liste live des valeurs (`select distinct department, city, address from events`) ; au 03/11/2026 : codes, codes postaux (`04100`, `83957`), `Nom (NN)`, noms seuls (`Allier`, `Drôme `, `Gironde`, `Puy-de-Dôme`, `chalmazel `), Suisse (`1700 (CH)`, `Fribourg`, `Vaud`).
- [ ] **Step 2:** Écrire la migration : `department_code()` reprend la règle de `departmentCode()` de `regions.ts` (parenthèses, code postal, outre-mer, Corse) et une table de correspondance nom → code pour les noms seuls présents ; `country` posé à `'CH'` pour les lignes suisses relevées ; mise à jour des lignes ; trigger. Les lignes que la règle ne sait pas lire sont listées en commentaire et corrigées une par une (ex. `chalmazel` → `42`).
- [ ] **Step 3:** Appliquer (`db push --linked`) puis vérifier en prod : `select department, country, count(*) from events group by 1,2 order by 1` — toute ligne `FR` a un code connu de `regions.ts`.
- [ ] **Step 4: Test** (`regions.test.ts`) : `zoneOf({country:'FR', department:'83'})` → `'Provence-Alpes-Côte d’Azur'` ; `zoneOf({country:'CH', department:'Fribourg'})` → `'Suisse'` ; `zoneOf({country:'FR', department:null})` → `null` ; `zoneSlug('Île-de-France')` → `'ile-de-france'`. Lancer, voir échouer, implémenter, voir passer (`pnpm --filter web-v2 exec vitest run src/lib/regions.test.ts`).
- [ ] **Step 5:** Ajouter `country` au type `Event` de l'application si les colonnes sont typées à la main (chercher `department:` dans `src/lib`).
- [ ] **Step 6: Commit** — `feat(db): département normalisé et pays sur chaque fiche`

### Task 3: Le score et la sélection (fonctions pures)

**Files:**
- Create: `supabase/migrations/<horodatage>_event_public_stats.sql`
- Create: `apps/web-v2/src/lib/selection.ts`, `apps/web-v2/src/lib/selection.test.ts`

**Interfaces:**
- Consumes : `zoneOf`, `zoneSlug` (Task 2).
- Produces (base) : `event_public_stats() returns table(event_id uuid, interested int, registered int, rating numeric, rating_count int)` — `SECURITY DEFINER`, `set search_path = public`, ne rend que les fiches `not is_private` ; `interested` = participations `interesse`, `registered` = `inscrit|confirme|en_cours` ; `rating` = moyenne de `(affluence+organisation+rentabilite)/3` arrondie à 0,1. `grant execute … to anon, authenticated`.
- Produces (TS) :
  ```ts
  export type SelectionEvent = { id; slug; name; city; department; country; start_date; end_date;
    registration_deadline; registration_url; stand_price; stand_size; image_url; expected_attendance;
    edition; tags: string[]; interested; registered; rating: number | null; rating_count }
  export function score(event: SelectionEvent): number
  export function buildSelection(events: SelectionEvent[], type: string, zone: string, today: Date):
    { title: string; season: number; top: SelectionEvent[]; others: SelectionEvent[] } | null
  export function reasonOf(event: SelectionEvent): string
  ```

- [ ] **Step 1: Tests** (`selection.test.ts`) :
  - `buildSelection` rend `null` sous 3 fêtes à venir du type et de la zone ;
  - fête passée ou au-delà de 12 mois exclue ; fête taguée `['fete-medievale','marche-noel']` présente dans les deux types ;
  - `top` = 5 au plus, trié par `score` décroissant, égalité départagée par `start_date` puis `name` ; `others` = le reste, trié par `start_date` ;
  - `title` = `Les fêtes médiévales immanquables pour un exposant en Occitanie en 2027 — la sélection Fellowship` (nom du type au pluriel depuis la table `tags`, passé en argument ou en table locale — au choix du builder) ;
  - `score` : une fiche avec prix, lien et affiche bat la même fiche sans ; plus d'intéressés monte ; un avis ajoute un bonus mais une fiche sans avis n'est pas nulle ;
  - `reasonOf` : `Stand 3×3 à 100 € · candidatures jusqu'au 15 mars · 12 exposants intéressés` ; segments absents omis, jamais « undefined » ; fiche sans aucun fait → chaîne vide.
- [ ] **Step 2:** Lancer, voir échouer.
- [ ] **Step 3:** Implémenter. Score (ma décision, réglable) :
  `2·log10(1+affluence attendue chiffrée) + min(edition ?? 1, 20)/5 + log2(1+interested+registered) + (rating_count > 0 ? rating − 2,5 : 0) − (pas de stand_price ? 1 : 0) − (pas de registration_url ? 1 : 0) − (pas d'image ? 0,5 : 0)`.
  `expected_attendance` est un texte, vide partout au 04/11/2026 : on en lit le premier nombre, absent = 0.
- [ ] **Step 4:** Migration `event_public_stats`, appliquée, vérifiée en prod avec la clé anonyme (`curl …/rest/v1/rpc/event_public_stats` → des totaux, aucune identité).
- [ ] **Step 5:** Tests verts.
- [ ] **Step 6: Commit** — `feat(v2): score et sélection Fellowship par type et par zone`

### Task 4: Le HTML lisible (fonctions pures)

**Files:**
- Create: `apps/web-v2/src/lib/machine-page.ts`, `apps/web-v2/src/lib/machine-page.test.ts`

**Interfaces:**
- Consumes : `SelectionEvent`, `reasonOf`, `buildSelection` (Task 3).
- Produces :
  ```ts
  export type MachinePage = { title: string; description: string; canonical: string; image: string | null;
    jsonLd: object; body: string /* HTML échappé */ }
  export function eventPage(event: SelectionEvent): MachinePage
  export function selectionPage(selection: NonNullable<ReturnType<typeof buildSelection>>, path: string): MachinePage
  export function injectPage(indexHtml: string, page: MachinePage): string
  ```

- [ ] **Step 1: Tests :**
  - `eventPage` : `<title>` `Fête médiévale de Vaulruz 2026 · Vaulruz · Fellowship` ; description qui contient dates, ville, prix du stand et date limite quand ils existent ; JSON-LD `@type: 'Event'` avec `name`, `startDate`, `endDate`, `location` (`Place` + `PostalAddress`, `geo` si coordonnées), `image`, `url` canonique, `offers.url` = `registration_url` ;
  - `selectionPage` : JSON-LD `ItemList` d'`Event` dans l'ordre du top puis des autres ; `<h1>` = `title` ; chaque ligne lie `/evenements/<slug>` ;
  - `injectPage` remplace `<title>` et `<meta name="description">`, ajoute `og:title`, `og:description`, `og:image`, `<link rel="canonical">`, le `<script type="application/ld+json">`, et met `body` dans `<div id="root">` ;
  - **échappement** : un nom `</script><img src=x onerror=alert(1)>` ne produit ni `</script>` dans le JSON-LD (échapper `<` en `<`) ni balise dans le corps.
- [ ] **Step 2:** Lancer, voir échouer. **Step 3:** implémenter (chaînes de gabarit, une fonction `escapeHtml`). **Step 4:** verts.
- [ ] **Step 5:** Vérifier que la CSP de `netlify.toml` (`script-src 'self'`) ne gêne pas : un `application/ld+json` n'est pas exécuté, il ne demande rien. Le noter en commentaire en tête du fichier.
- [ ] **Step 6: Commit** — `feat(v2): pages lisibles par une machine, fiche et sélection`

### Task 5: Les fiches servies lisibles (fonction Netlify)

**Files:**
- Create: `apps/web-v2/netlify/functions/event-page.mts`, `apps/web-v2/netlify/functions/event-page.test.ts`
- Modify: `apps/web-v2/netlify/functions/sitemap.mjs` (rien si les fiches y sont déjà — vérifier)

**Interfaces:**
- Consumes : `eventPage`, `injectPage` (Task 4), `event_public_stats` (Task 3).
- `export const config = { path: '/evenements/:slug' }` — un seul segment : `/evenements/nouveau`, `/:slug/modifier`, `/:slug/avis` ne sont pas touchés.

- [ ] **Step 1: Tests** (fonction appelée avec `fetch` simulé) : slug connu → HTML contenant le `<h1>` de la fiche et `application/ld+json` ; slug inconnu ou fiche privée (la REST anonyme ne rend rien) → `index.html` intact, 200 ; erreur réseau Supabase → `index.html` intact, 200, `console.error` ; `slug = 'nouveau'` → `index.html` intact.
- [ ] **Step 2:** Implémenter : `index.html` lu par `fetch(new URL('/index.html', request.url))` (fichier statique publié ; ne pas passer par la fonction elle-même) ; fiche lue en REST anonyme (`events?slug=eq.<slug>&select=…&limit=1`), stats par `event_public_stats` filtrées sur l'id. En-têtes : `Content-Type: text/html; charset=utf-8`, `Cache-Control: public, max-age=3600`.
- [ ] **Step 3:** Tests verts ; `pnpm build` de `web-v2`.
- [ ] **Step 4:** Brouillon (`pnpm deploy:v2`) ; sur l'URL du brouillon : `curl -s <brouillon>/evenements/fete-medievale-de-vaulruz-2026 | grep -c 'application/ld+json'` → 1 ; même page dans le navigateur : l'application s'affiche normalement, pas de flash de contenu cassé ; la CSP présente (`curl -sI`). Vérifier que la CLI a bien publié la nouvelle fonction (journal « Functions »).
- [ ] **Step 5: Commit** — `feat(v2): les fiches se lisent sans JavaScript, pour les IA` — le passage en prod suit `.claude/rules/deploiement.md` (version montée), sur décision d'Uriel.

### Task 6: `llms.txt`

**Files:**
- Create: `apps/web-v2/public/llms.txt`
- Modify: `apps/web-v2/public/robots.txt` (ajouter une ligne de commentaire et rien d'autre : `User-agent: *` laisse déjà passer les robots des IA)

- [ ] **Step 1:** Écrire `llms.txt` (format llmstxt.org : `# Fellowship`, une phrase avec le mantra, ce qu'une fiche contient, `## Pages` avec `/festivals` et le lien du plan du site). Les pages de sélection n'y entrent qu'à la Task 9.
- [ ] **Step 2:** `curl -sI <brouillon>/llms.txt` → `200`, `text/plain`.
- [ ] **Step 3: Commit** — `feat(v2): llms.txt, Fellowship présenté aux IA`

### Task 7: Maquette de la page de sélection — porte d'Uriel

- [ ] **Step 1:** Charger le skill `frontend-design`, puis la maquette dans Figma (page de la V2, design system `docs/v2/DESIGN-SYSTEM.md`) : la page `/festivals/fete-medievale/occitanie` avec de vraies données (titre au superlatif, chapeau, top 5 avec la raison chiffrée, emplacement du coup de cœur d'Uriel, puis la liste des autres dates), version ordinateur et téléphone. Deux ou trois options chiffrées en coût.
- [ ] **Step 2:** Uriel valide une option. **Rien de la Task 8 ne commence avant.**

### Task 8: La page de sélection, dans l'application et servie lisible

**Files:**
- Create: `apps/web-v2/src/features/selection/` (page, chargement, `README.md` comme les autres features)
- Create: `apps/web-v2/netlify/functions/selection-page.mts` (+ test)
- Modify: `apps/web-v2/src/App.tsx` (routes publiques `/festivals/:type` et `/festivals/:type/:zone`, visibles connecté ou non — **pas** le renvoi vers `/explorer` de `PublicSearchRoute`)

**Interfaces:**
- Consumes : `buildSelection`, `selectionPage`, `injectPage`, `zoneSlug`, `zoneOf`.
- `config = { path: ['/festivals/:type', '/festivals/:type/:zone'] }` ; `/festivals/:type` = la France entière pour ce type (pays `FR` seulement).

- [ ] **Step 1: Tests** de la fonction : type ou zone inconnus, ou moins de 3 fêtes → `index.html` intact (la page React affiche alors « pas encore de sélection » selon la maquette) ; sinon HTML avec `ItemList`.
- [ ] **Step 2:** Page React selon la maquette validée, avec les fonctions de `selection.ts` (même calcul que le serveur : le contenu injecté et la page montée disent la même chose).
- [ ] **Step 3:** `pnpm dev`, parcours testé dans le navigateur (connecté et non connecté, téléphone) ; `pnpm build`.
- [ ] **Step 4: Commit** — `feat(v2): la sélection Fellowship par type et par zone`

### Task 9: Ouvrir les sélections aux IA

**Files:**
- Modify: `apps/web-v2/netlify/functions/sitemap.mjs`, `apps/web-v2/public/llms.txt`

- [ ] **Step 1:** Le plan du site ajoute chaque page de sélection qui existe (même règle que `buildSelection` : ≥ 3 fêtes à venir), lue en base à chaque demande.
- [ ] **Step 2:** `llms.txt` liste les pages de sélection par type (lien vers `/festivals/<type>`).
- [ ] **Step 3:** Brouillon, puis vérifications de `deploiement.md` + `curl -s <brouillon>/sitemap.xml | grep -c '/festivals/'` > 0. Version montée, prod sur décision d'Uriel.
- [ ] **Step 4:** Noter dans `docs/v2/visibilite-ia.md` la date de mise en ligne ; le jugement tombe trois mois après.
- [ ] **Step 5: Commit** — `feat(v2): les sélections Fellowship ouvertes aux IA`

### Task 10 (optionnelle, après Task 9): Le coup de cœur d'Uriel

- [ ] Table `selection_pins(type text, zone text, event_id uuid, note text, primary key (type, zone))`, lecture publique, écriture admin ; l'épingle remonte en tête du top, avec la phrase signée « — Uriel » (signature exacte à valider avec la maquette). Écran d'administration : maquette d'abord (comme Task 7). À planifier à part le moment venu.
