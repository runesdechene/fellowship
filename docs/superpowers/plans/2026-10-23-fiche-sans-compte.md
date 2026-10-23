# La fiche vue sans compte — plan d'intégration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** intégrer la maquette Figma 2482:878 — la fiche d'un festival telle que la voit un visiteur sans compte venu de Google — et retirer le prix du stand de toutes les fiches.

**Architecture:** une fonction SQL `apercu_fiche` remplace `compter_avis_et_questions` et rend au visiteur ce qu'il a le droit de voir (nombres, note, un avis, métiers) ; un hook et deux petits composants la lisent dans `features/event/` ; la barre de la landing gagne un état clair pour les pages publiques ; le bas de fiche réutilise `ToolsCompare` de la landing.

**Tech Stack:** React 19, React Router, Supabase (Postgres, RPC), Vitest, CSS en couches (`styles/1-primitives` → `3-components`).

**Spec:** la maquette Figma `9CmmBD3t5rAk4tD583cdN3`, nœud **2482:878** (fait foi) ; les décisions du 23/10/2026 dans le vault, `Décisions produit.md` (« La fiche vue sans compte », « Fil d'Ariane »).

## Global Constraints

- Sans compte, **en clair** : nom, dates, lieu, affiche, univers, description, la note globale et le nombre d'avis, **un** avis entier signé « Un exposant, édition AAAA », « N exposants y vont » avec leurs métiers, la date de clôture des candidatures.
- **Derrière le compte gratuit** : les autres avis, les questions, qui y va en noms, le dossier en ligne et le contact de l'organisateur.
- **Aucun voile, aucun flou, aucun faux texte**, aucun mot du Pro au visiteur, aucune fenêtre bloquante.
- **Le prix du stand ne s'affiche jamais, pour personne** : il est propre à chaque exposant et vit dans « Mon dossier ».
- Fil d'Ariane : `Festivals › <premier univers> › <région> › <nom>` — **la région, pas le département**. Sans liens tant que les pages univers × région n'existent pas.
- Libellés exacts : « Lire les N autres avis, avec ton compte gratuit » · « Le dossier en ligne et le contact de l’organisateur, avec ton compte gratuit » · « Créer mon compte gratuit » · « Gratuit. Fait par des exposants, pour les exposants. » (« sans carte bancaire » retiré tant que ce n'est pas vérifié).
- Migration : POURQUOI en tête, canal unique `node_modules/supabase/bin/supabase.exe db push --linked`, vérifiée en prod. Pas de `any`, pas de `console.log`. Commits Conventional, en français.

## Review Focus

1. **Une fiche sans aucun avis** : ni note, ni carte, ni lien « autres avis » — pas de « 0 avis ». (Task 1 test SQL, Task 3 test du composant.)
2. **Un avis sans commentaire** (notes seules) : il ne peut pas être l'extrait ; si aucun avis n'a de texte, la carte montre la note seule. (Task 1.)
3. **Une fiche privée ou inconnue** : `apercu_fiche` ne rend rien d'autre que des zéros et `null`. (Task 1.)
4. **Un exposant inscrit en visibilité `prive`** : il n'est compté nulle part, ni dans le nombre ni dans les métiers. (Task 1.)
5. **Un département hors table** (vide, « 2A », « 971 », faute de frappe) : `regionOf` rend `null` et le fil s'arrête à l'univers, sans planter. (Task 2.)

---

### Task 1: La fonction `apercu_fiche`

**Files:**
- Create: `supabase/migrations/<horodatage>_apercu_fiche.sql`
- Modify: `apps/web-v2/src/types/supabase.ts` (régénéré)

**Interfaces:**
- Produces: `apercu_fiche(p_event uuid) RETURNS TABLE (avis integer, note numeric, extrait text, extrait_annee integer, questions integer, exposants integer, metiers jsonb)` — `metiers` = `[{ "metier": text, "n": integer }]`, trois au plus. Accordée à `anon, authenticated`.

- [ ] **Step 1: Écrire la migration.** En tête, le POURQUOI (décision du 23/10/2026, remplace `compter_avis_et_questions`). `SECURITY DEFINER`, `SET search_path = public`, `STABLE`, même garde que l'ancienne : `events.id = p_event AND is_private = false`, sinon `0, null, null, null, 0, 0, '[]'`.
  - `avis`, `note` : `review_count` et `avg_overall` de la vue `event_scores`.
  - `extrait` : le `comment` non vide le plus long de `reviews` pour cette date, départagé par `created_at DESC` ; `extrait_annee` = année de son `created_at`. Jamais l'auteur.
  - `questions` : comme l'ancienne (`event_threads`, `audience = 'exposant'`).
  - `exposants` : `participations` de la date, `status IN ('inscrit','confirme')`, `visibility <> 'prive'`.
  - `metiers` : sur ces mêmes participations, jointure `entities.actor_id = participations.actor_id`, `trim(craft_type)` non vide, groupé, trié `count DESC, metier ASC`, `LIMIT 3`.
  - `DROP FUNCTION public.compter_avis_et_questions(uuid);` dans la même migration.

- [ ] **Step 2: Appliquer.** Run: `node_modules/supabase/bin/supabase.exe db push --linked` — Expected: la migration listée puis `Finished supabase db push.`

- [ ] **Step 3: Vérifier en prod** (MCP Supabase, `execute_sql`, lecture seule) sur trois cas : une fiche publique avec avis et inscrits, une fiche sans avis, une fiche privée. Expected : la première rend des valeurs cohérentes avec `event_scores` ; la deuxième `avis = 0, note = null, extrait = null` ; la privée tout à zéro. Vérifier aussi qu'un inscrit en `prive` n'est pas compté (requête directe sur `participations` à côté).

- [ ] **Step 4: Régénérer les types.** Run: `node_modules/supabase/bin/supabase.exe gen types typescript --linked > apps/web-v2/src/types/supabase.ts` — Expected: `apercu_fiche` présent, `compter_avis_et_questions` absent.

- [ ] **Step 5: Commit** — `feat(db): apercu_fiche, ce qu'une fiche montre sans compte`

### Task 2: `regionOf` — du département à la région

**Files:**
- Create: `apps/web-v2/src/lib/regions.ts`, `apps/web-v2/src/lib/regions.test.ts`

**Interfaces:**
- Produces: `regionOf(department: string | null): string | null` — les 13 régions métropolitaines et les 5 d'outre-mer, noms officiels (« Auvergne-Rhône-Alpes », « Provence-Alpes-Côte d’Azur »…). Accepte `'01'`…`'95'`, `'2A'`, `'2B'`, `'971'`…`'976'` ; `trim`, insensible à la casse.

- [ ] **Step 1: Test qui échoue** — `regionOf('63') === 'Auvergne-Rhône-Alpes'`, `regionOf('35') === 'Bretagne'`, `regionOf('2a') === 'Corse'`, `regionOf('974') === 'La Réunion'`, `regionOf(' 75 ') === 'Île-de-France'`, `regionOf('') === null`, `regionOf(null) === null`, `regionOf('99') === null`.
- [ ] **Step 2:** `pnpm --filter web-v2 exec vitest run src/lib/regions.test.ts` — Expected: FAIL (module absent).
- [ ] **Step 3: Implémenter** : une table `Record<string, string>` département → région, rien d'autre.
- [ ] **Step 4:** même commande — Expected: PASS.
- [ ] **Step 5: Commit** — `feat(v2): regionOf, la région d'un département`

### Task 3: Le haut et l'aperçu de la fiche sans compte

**Files:**
- Create: `apps/web-v2/src/features/event/useFicheApercu.ts`, `apps/web-v2/src/features/event/GuestReviews.tsx`, `apps/web-v2/src/features/event/Breadcrumb.tsx`, `apps/web-v2/src/lib/apercu.ts`, `apps/web-v2/src/lib/apercu.test.ts`, `apps/web-v2/src/styles/3-components/guest-reviews.css`
- Modify: `apps/web-v2/src/features/event/EventPage.tsx` (en-tête, bloc avis, ligne « y vont »), `apps/web-v2/src/features/event/Applying.tsx` (visiteur : la date limite seule + la ligne vers le compte), `apps/web-v2/src/styles/index.css`
- Delete: `GuestTeaser.tsx`, `useEventTeaser.ts`, `lib/teaser.ts`, `lib/teaser.test.ts`, `styles/3-components/guest-teaser.css` (code mort croisé)

**Interfaces:**
- Consumes: `apercu_fiche` (Task 1), `regionOf` (Task 2).
- Produces: `useFicheApercu(eventId: string): FicheApercu | null` ; `goingLine(exposants: number, metiers: { metier: string; n: number }[]): string | null` dans `lib/apercu.ts`.

- [ ] **Step 1: Test qui échoue** (`lib/apercu.test.ts`) — `goingLine(12, [{metier:'forgeron',n:3},{metier:'maroquinier',n:2}])` → `'12 exposants y vont : 3 forgerons, 2 maroquiniers'` ; `goingLine(1, [])` → `'1 exposant y va'` ; `goingLine(0, [])` → `null` ; un métier à `n = 1` reste au singulier (`'1 céramiste'`). Pluriel : `+ 's'`, sauf mot déjà terminé par `s`, `x` ou `z`. Points de suspension « … » seulement si la somme des `n` affichés est inférieure à `exposants`.
- [ ] **Step 2:** `pnpm --filter web-v2 exec vitest run src/lib/apercu.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implémenter `goingLine`** puis `useFicheApercu` sur le modèle exact de `useEventTeaser` (même garde `cancelled`, `null` en cas d'échec).
- [ ] **Step 4:** même commande — Expected: PASS.
- [ ] **Step 5: Câbler dans `EventPage`, pour `!member` seulement** :
  - `Breadcrumb` au-dessus du `h1` : `Festivals › {event.tags[0]} › {regionOf(event.department)} › {event.name}`, chaque maillon absent sauté, aucun lien, `nav aria-label="Fil d’Ariane"` + `<ol>`.
  - à la place de `Companions` : la ligne `goingLine`, le début en gras comme la maquette.
  - à la place de `GuestTeaser` : `GuestReviews` — titre « Avis des exposants » + « N avis », une carte note (serif, étoiles comme `EventReviews`) | séparateur | extrait + « Un exposant, édition {extrait_annee} », puis « Lire les {avis − 1} autres avis, avec ton compte gratuit » vers `loginReturning(pathname)`. Lien absent si `avis ≤ 1`, bloc absent si `avis = 0`, carte sans extrait si `extrait = null`.
  - dans `Applying` : le visiteur voit la date limite et la ligne « Le dossier en ligne et le contact de l’organisateur, avec ton compte gratuit » vers `loginReturning(pathname)` ; aucune autre ligne.
  - pas de bloc Discussions pour le visiteur.
- [ ] **Step 6: Vérifier dans le navigateur** (`pnpm dev`, déconnecté) sur une fiche avec avis et une sans avis : rendu conforme à 2482:878, aucun texte d'avis autre que l'extrait dans la réponse réseau.
- [ ] **Step 7: Commit** — `feat(v2): la fiche sans compte montre la note, un avis, qui y va et le fil d'Ariane`

### Task 4: Le prix du stand disparaît

**Files:**
- Modify: `apps/web-v2/src/features/event/EventPage.tsx:246`

- [ ] **Step 1:** retirer la ligne `Emplacement` (`stand_price`, `stand_size`) de `facts`, et l'import `Store` s'il ne sert plus. La colonne reste en base : la V1 (non servie) la lit encore ; sa suppression ira avec le ménage de la V1.
- [ ] **Step 2: Relever en prod** combien de fiches ont `stand_price` rempli (`SELECT count(*) FROM events WHERE stand_price IS NOT NULL AND stand_price <> ''`) et le noter dans le rapport.
- [ ] **Step 3: Commit** — `fix(v2): le prix du stand ne s'affiche plus, il est propre à chaque exposant`

### Task 5: La barre claire et le concept en bas de fiche

**Files:**
- Modify: `apps/web-v2/src/features/landing/LandingTopBar.tsx` (classe `is-away` quand `away`), `apps/web-v2/src/styles/3-components/landing.css`, `apps/web-v2/src/components/layout/GuestShell.tsx` ou `EventPage.tsx` (le bas de fiche)
- Create: `apps/web-v2/src/features/event/GuestPitch.tsx`, `apps/web-v2/src/styles/3-components/guest-pitch.css`

**Interfaces:**
- Consumes: `ToolsCompare` (`features/landing/ToolsCompare.tsx`), tel quel.

- [ ] **Step 1: La barre claire.** `away` pose `is-away` au lieu de `is-compact` : fond `--surface-app`, filet bas d'encre à 8 %, marque et liens en encre (`--fete-ink`, liens en couleur de texte secondaire), « Se connecter » détouré d'encre, « Commencer » en encre pleine et texte crème. Jetons sémantiques nouveaux dans `2-semantic.css`, pas de valeur en dur dans le composant. La landing elle-même ne change pas.
- [ ] **Step 2: `GuestPitch`**, rendu en bas de la fiche pour `!member` : `ToolsCompare`, puis le bouton pilule « Créer mon compte gratuit » (`landing-button landing-button--pill`, vers `loginReturning(pathname)`), puis « Gratuit. Fait par des exposants, pour les exposants. » Centré sur la colonne gauche (hors mur d'affiche). Sur téléphone, `ToolsCompare` garde son comportement de la landing.
- [ ] **Step 3: Vérifier dans le navigateur** déconnecté, bureau et 390 px : barre claire, bas de fiche conforme à 2482:878 ; la landing inchangée (barre sombre, puis compacte au défilement).
- [ ] **Step 4: Build** — `pnpm --filter web-v2 build` — Expected: succès sans erreur TS.
- [ ] **Step 5: Commit** — `feat(v2): la barre claire et « Une seule app » en bas de la fiche sans compte`

### Fin

- [ ] Mettre à jour `features/event/README.md` (lot 11b → décision du 23/10/2026) et la ligne « Relire les écrans faits sans maquette » du vault si la barre claire en sortait.
