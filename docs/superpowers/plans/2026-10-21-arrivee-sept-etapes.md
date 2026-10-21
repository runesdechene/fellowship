# L'arrivée en sept étapes — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ajouter à `/bienvenue` la vérification du code de parrainage, l'étape photo et bannière (avant la création), puis « Tu les connais peut-être » et « Ces festivals t'intéressent ? » (après).

**Architecture:** les étapes restent pilotées par `lib/welcome.ts` (pur, testé) et `useWelcomeDraft` (`?etape=N`). La création se déplace de l'étape `address` à l'étape `design` ; l'identité n'est relue qu'à la toute fin, sinon `WelcomeRoute` sort de l'arrivée. Trois RPC nouvelles ; tout le reste réutilise l'existant (envoi d'image du mode édition, `follows`, participations `interesse`).

**Tech Stack:** React 19 + TypeScript strict, Vite, Supabase (Postgres, Storage), vitest, lucide-react.

**Spec:** `docs/superpowers/specs/2026-10-21-arrivee-sept-etapes-design.md` — maquettes Figma `9CmmBD3t5rAk4tD583cdN3` : `2391:65`, `2391:126`, `2391:187`, `2391:260`, `2392:65`, `2392:271`, composants `2363:2`, `2363:14`, dépôt `2373:476`.

## Global Constraints

- Chaque écran se relève dans Figma (`get_design_context`) avant d'être codé, puis se compare à la maquette (`.claude/rules/v2.md`, « Un écran n'est fini que comparé à sa maquette »).
- Aucune valeur en dur dans `styles/3-components/` ; une valeur nouvelle naît en `1-primitives.css` puis prend son sens en `2-semantic.css`, avec sa variante sombre.
- Chaque changement d'état est animé (`--duration-*`, `--ease-*`), et `prefers-reduced-motion` est respecté.
- `pnpm --filter web-v2 lint` (code de sortie 0) et `pnpm --filter web-v2 exec tsc -b` avant chaque commit qui touche du TS.
- Migration : `supabase/migrations/<horodatage>_<nom>.sql`, le POURQUOI en tête, appliquée par `node_modules/supabase/bin/supabase.exe db push --linked`, puis les types régénérés : `node_modules/supabase/bin/supabase.exe gen types typescript --linked --schema public > apps/web-v2/src/types/supabase.ts`.
- Textes exacts :
  - code inconnu : « Aucun code de parrainage trouvé. »
  - code reconnu : « ✓ Code de {parrain} : ton essai Pro passe à 30 jours si tu l'actives dans tes réglages. »
  - étape 5 : titre « Ta photo et ta bannière », phrase « Elles habillent ta vitrine. Tu pourras les changer plus tard. », libellés « Ta photo · facultatif » et « Ta bannière · facultatif », cadre « Déposer une image, ou cliquer pour choisir », « Changer »
  - étape 6 : titre « Tu les connais peut-être », phrase « Des exposants de ton métier et de ta région. Suis-les pour voir où ils exposent. », raisons « Même métier » et « Près de chez toi », boutons « Suivre » et « Suivi ✓ »
  - étape 7 : titre « Ces festivals t’intéressent ? », phrase « Choisis ceux qui te plaisent : on te proposera des festivals qui te ressemblent. », boutons « Ça m’intéresse » et « Intéressé ✓ », « Commencer », lien « Aucun de ces festivals ne m’intéresse, commencer quand même »
- Sur-titre de chaque étape : « Ton enseigne · étape N sur T » (le composant actuel le calcule).
- Commits en Conventional Commits, en français ; pas de push.

## Review Focus

- **Rechargement aux étapes 6 ou 7** : l'enseigne existe, `WelcomeRoute` renvoie au tableau de bord. C'est accepté, mais rien ne doit casser ni créer une seconde enseigne. Le test « `created` survit » vit en tâche 2 (`createdId` dans le brouillon).
- **Retour du navigateur depuis l'étape 6** vers `?etape=5` : il ne doit pas recréer l'enseigne. Le garde `created.current` / `draft.createdId` vit en tâche 5.
- **Image refusée** (HEIC, SVG, plus de 10 Mo) : le message de `imageProblem` ou « Cette image ne peut pas être utilisée. » s'affiche sous le cadre, la création reste possible. C'est en tâche 5.
- **Code tapé puis effacé** : la note revient à la phrase par défaut, et aucune réponse en retard n'écrase l'état. Le test du hook est en tâche 4 (on ignore une réponse dont le code n'est plus celui du champ).
- **Aucune suggestion** (métier vide, nomade, base vide) : les étapes 6 et 7 affichent leur titre, une grille vide n'apparaît pas, et le bouton mène quand même au bout. C'est en tâches 7 et 8.

---

### Task 1 : les trois RPC

**Files:**
- Create: `supabase/migrations/20261021120000_welcome_steps.sql`
- Modify: `apps/web-v2/src/types/supabase.ts` (régénéré)
- Modify: `docs/db/gotchas.md` (une ligne par RPC, section des fonctions)

**Interfaces:**
- Produces :
  - `referral_owner(p_code text) RETURNS text` : le nom de l'enseigne du parrain, ou `NULL`.
  - `welcome_exhibitors(p_actor uuid) RETURNS TABLE(id uuid, name text, avatar text, slug text, city text, reason text)`, où `reason` vaut `'craft' | 'nearby'`. 12 au plus.
  - `welcome_festivals(p_actor uuid) RETURNS TABLE(id uuid, name text, city text, start_date date, end_date date, image_url text, tags text[])`. 12 au plus.

- [ ] **Step 1 : relever les définitions live.** Lire dans `information_schema.columns` : `entities` (`craft_type`, `department`, `type`), `events` (`name`, `city`, `department`, `start_date`, `end_date`, `image_url`, `tags`, `is_private`), `participations` (`status`), puis `actor_public` et `referral_codes`. Toute colonne absente change la requête, pas la signature.
- [ ] **Step 2 : écrire la migration.** Les trois fonctions sont `SECURITY DEFINER SET search_path = public`, avec `REVOKE … FROM PUBLIC, anon` et `GRANT … TO authenticated` (même forme que `accounts_to_follow`).
  - `referral_owner` : même normalisation que `attribute_referral` (`regexp_replace(upper(coalesce(p_code,'')), '[^A-Z0-9]', '', 'g')`), puis `referral_codes` joint à `actor_public` (`btrim(label)`).
  - `welcome_exhibitors` : garde `can_act_as(p_actor)` (exception `42501`, comme `accounts_to_follow`). On prend les exposants `en.type = 'exposant'`, sauf soi, sauf les comptes déjà suivis, et seulement ceux qui ont un `label` non vide. Rang 1 : même métier, `lower(extensions.unaccent(btrim(craft_type)))` égal et non vide. Rang 2 : même `department_code(department)`. Tri par rang, puis par nombre d'abonnés décroissant, puis par nom.
  - `welcome_festivals` : même garde. On prend les événements publics qui commencent entre `current_date` et `current_date + 12 months`. Tri : d'abord ceux du département de l'enseigne, puis par nombre de participations `inscrit|confirme|interesse` décroissant, puis par date.
- [ ] **Step 3 : appliquer et vérifier en prod.** `node_modules/supabase/bin/supabase.exe db push --linked`, puis lancer en SQL (lecture seule) `select referral_owner('runesdechene')` : on attend le nom de l'enseigne si le code existe, sinon `NULL`, sans erreur.
- [ ] **Step 4 : régénérer les types**, avec la commande des contraintes globales. `tsc -b` passe.
- [ ] **Step 5 : commit** `feat(db): RPC de l'arrivée (parrain, exposants, festivals)`.

### Task 2 : les étapes dans `lib/welcome.ts`

**Files:**
- Modify: `apps/web-v2/src/lib/welcome.ts`
- Test: `apps/web-v2/src/lib/welcome.test.ts`

**Interfaces:**
- Produces :
  - `WelcomeStep` gagne `'design' | 'people' | 'festivals'`.
  - `STEPS.new = ['brand','firstName','craft','place','address','design','people','festivals']`, `STEPS.newEntity = ['brand','craft','place','address','design','people','festivals']`, `STEPS.nameOnly = ['firstName']`.
  - `CREATION_STEP: WelcomeStep = 'design'`.
  - `isAfterCreation(steps: WelcomeStep[], index: number): boolean` : vrai pour les étapes qui suivent `CREATION_STEP`.
  - `WelcomeDraft.createdId: string | null` (défaut `null`) : l'enseigne créée, gardée en session.
  - `referralNote(code: string, owner: string | null | undefined): { text: string; tone: 'free' | 'problem' | null }`. Code vide → la phrase actuelle, ton `null`. `undefined` (vérification en cours) → même chose. `null` → « Aucun code de parrainage trouvé. », `problem`. Sinon le texte reconnu, `free`.
  - `stepProblem` rend `null` pour `design`, `people` et `festivals`.

- [ ] **Step 1 : tests en échec.** Dans `welcome.test.ts`, mettre à jour les trois tests `welcomeSteps` avec les listes ci-dessus et ajouter :

```ts
test('isAfterCreation : les exposants et les festivals, pas le design', () => {
  const steps = welcomeSteps('newEntity')
  expect(isAfterCreation(steps, steps.indexOf('design'))).toBe(false)
  expect(isAfterCreation(steps, steps.indexOf('people'))).toBe(true)
})
test('referralNote : inconnu, reconnu, vide', () => {
  expect(referralNote('RUNES9Z3Q', null)).toEqual({ text: 'Aucun code de parrainage trouvé.', tone: 'problem' })
  expect(referralNote('RUNESDECHENE', 'Runes de Chêne').text).toBe(
    '✓ Code de Runes de Chêne : ton essai Pro passe à 30 jours si tu l’actives dans tes réglages.',
  )
  expect(referralNote('', undefined).tone).toBeNull()
})
test('les étapes après l’adresse ne bloquent jamais', () => {
  for (const step of ['design', 'people', 'festivals'] as const) expect(stepProblem(step, EMPTY_DRAFT)).toBeNull()
})
```

- [ ] **Step 2 : lancer** `pnpm --filter web-v2 exec vitest run src/lib/welcome.test.ts`. On attend un ÉCHEC.
- [ ] **Step 3 : implémenter.** Déplacer la phrase par défaut (« Le parrain et toi gagnez un mois de Pro. ») de `WelcomeStepFields.tsx` vers `referralNote`. Mettre à jour l'en-tête du fichier.
- [ ] **Step 4 : relancer.** On attend un SUCCÈS.
- [ ] **Step 5 : commit** `feat(v2): les sept étapes de l'arrivée dans lib/welcome`.

### Task 3 : l'envoi d'image partagé

**Files:**
- Create: `apps/web-v2/src/lib/entity-images.ts`
- Modify: `apps/web-v2/src/features/vitrine/useVitrineEdit.ts` (retirer `upload`, `GALLERY`, `MAX_WIDTH`, `ImageKind`, `PendingImage`, `UNREADABLE`, qui viennent désormais d'ici)

**Interfaces:**
- Produces :
  - `type ImageKind = 'cover' | 'avatar'`, `interface PendingImage { blob: Blob; preview: string }`, `GALLERY = 'entity-gallery'`.
  - `prepareImage(kind: ImageKind, file: File): Promise<PendingImage | string>` : l'image réduite, ou le message de refus (`imageProblem`, ou `UNREADABLE`).
  - `uploadEntityImage(actorId: string, kind: ImageKind, image: PendingImage): Promise<{ path: string; url: string }>` : l'ancien `upload`, inchangé.

- [ ] **Step 1 : déplacer sans changer de comportement.** `useVitrineEdit.pick` appelle `prepareImage`. Il n'y a pas de test unitaire, car le canvas n'existe pas sous jsdom (`.claude/rules/dev.md`).
- [ ] **Step 2 : vérifier** dans le navigateur, sur sa propre vitrine en mode édition : changer la bannière s'affiche, puis Annuler. Rien n'est enregistré, la base est la prod. `tsc -b` et le lint passent.
- [ ] **Step 3 : commit** `refactor(v2): l'envoi d'image de la vitrine passe dans lib/entity-images`.

### Task 4 : le code de parrainage vérifié en direct

**Files:**
- Create: `apps/web-v2/src/features/welcome/useReferralOwner.ts`
- Modify: `apps/web-v2/src/features/welcome/WelcomeStepFields.tsx` (étape `address`)

**Interfaces:**
- Consumes : `referral_owner` (tâche 1) et `referralNote` (tâche 2).
- Produces : `useReferralOwner(code: string): string | null | undefined`. Il rend `undefined` tant que le code a moins de 3 caractères ou qu'une vérification est en cours.

- [ ] **Step 1 : écrire le hook** sur le modèle de `useSlugFree.ts` : même délai, et la réponse est ignorée si `code` a changé entre-temps (patron `cancelled` de l'effet). Une erreur réseau rend `undefined`, jamais `null`, pour ne pas dire « introuvable » sur une coupure.
- [ ] **Step 2 : brancher la note** de l'étape `address` sur `referralNote(draft.referral, owner)`. La classe vaut `welcome__note`, plus `welcome__note--free` ou `welcome__note--problem` selon `tone`.
- [ ] **Step 3 : vérifier dans le navigateur** sur `/bienvenue?nouvelle-enseigne&etape=4` : `RUNES-9Z3Q` donne la note rouge, un code réel la note verte, un champ vidé la phrase par défaut. Comparer à `2391:65` et `2391:126`.
- [ ] **Step 4 : commit** `feat(v2): le code de parrainage se vérifie à la saisie`.

### Task 5 : l'étape photo et bannière, et la création déplacée

**Files:**
- Create: `apps/web-v2/src/components/ui/ImageDrop.tsx` et `apps/web-v2/src/styles/3-components/image-drop.css`, d'après le dépôt `2373:476` et la ligne remplie de `2391:260`
- Modify: `apps/web-v2/src/features/welcome/WelcomeStepFields.tsx` (étape `design`)
- Modify: `apps/web-v2/src/features/welcome/WelcomePage.tsx` (`finish` découpé)
- Modify: `apps/web-v2/src/features/welcome/WelcomePreview.tsx` (prop `bannerUrl`)
- Modify: `apps/web-v2/src/styles/3-components/welcome.css` (la bannière en image)

**Interfaces:**
- Consumes : `prepareImage` et `uploadEntityImage` (tâche 3), `CREATION_STEP` et `draft.createdId` (tâche 2).
- Produces :
  - `ImageDrop({ label: string; round: boolean; image: PendingImage | null; fileName: string | null; problem: string | null; onPick: (file: File) => void })`. Le composant est un `<label>` qui contient un `<input type="file" accept="image/*">` caché ; le dépôt par glisser est accepté.
  - `WelcomePreview` prend `bannerUrl?: string | null`.
  - Dans `WelcomePage` : `create(): Promise<boolean>`, qui crée, attribue, envoie et écrit le prénom, et `enter(): Promise<void>`, qui relit l'identité, change d'acteur, efface et navigue.

- [ ] **Step 1 : `ImageDrop`**, relevé sur la maquette : cadre en pointillés (`--dropzone-border`), vignette ronde (photo) ou large (bannière), nom du fichier, « Changer ».
- [ ] **Step 2 : l'étape `design`** tient deux `PendingImage` dans l'état de `WelcomePage` (pas dans le brouillon, car un fichier ne se sérialise pas). Elle libère les URL locales comme `useVitrineEdit`, et passe `preview` à `WelcomePreview` (`avatarUrl`, `bannerUrl`).
- [ ] **Step 3 : découper `finish`.**
  - Soumettre l'étape `design` appelle `create()`. Si `draft.createdId` existe déjà, il ne recrée rien.
  - Après `create_owned_entity` et `attribute_referral` (toujours sans bloquer), chaque image passe par `uploadEntityImage(created, kind, image)`, puis une seule mise à jour `entities.update({ avatar_url, banner_url }).eq('actor_id', created)`. Une image qui échoue est ignorée.
  - On écrit `set({ createdId })`, puis `next()`.
  - Le bouton dit « Créer ma vitrine » sur `design` et « Continuer » sur `address`.
- [ ] **Step 4 : pas de « Retour »** quand `isAfterCreation(steps, index)` est vrai, ni sur la page, ni dans le libellé du bouton.
- [ ] **Step 5 : vérifier dans le navigateur** sur `/bienvenue?nouvelle-enseigne&etape=5` : choisir une photo et une bannière, la vitrine en direct change, une image HEIC affiche le refus. Ne pas encore créer (c'est la tâche 9). Comparer à `2391:187` et `2391:260`. Lint et `tsc -b`.
- [ ] **Step 6 : commit** `feat(v2): photo et bannière à l'arrivée, avant la création`.

### Task 6 : `PersonCard` et `DateCard`

**Files:**
- Create: `apps/web-v2/src/components/ui/PersonCard.tsx`, `apps/web-v2/src/components/ui/DateCard.tsx`
- Create: `apps/web-v2/src/styles/3-components/person-card.css`, `apps/web-v2/src/styles/3-components/date-card.css`
- Modify: `apps/web-v2/src/components/ui/README.md`, `apps/web-v2/src/styles/2-semantic.css`

**Interfaces:**
- Produces :
  - `PersonCard({ name: string; meta: string; avatarUrl: string | null; reason: string; action: ReactNode })`
  - `DateCard({ name: string; when: string; imageUrl: string | null; tags: readonly string[] | null; action: ReactNode })`, avec l'affiche par `Poster`.
  - Le bouton pilule « Suivre » / « Suivi ✓ » et « Ça m'intéresse » / « Intéressé ✓ » est le même : `.pill-toggle` dans `person-card.css`, réutilisé par `DateCard` via `action`.

- [ ] **Step 1 : relever `2363:2` et `2363:14`** avec `get_design_context`, puis écrire les deux composants et leurs jetons. La bascule de la pilule est animée.
- [ ] **Step 2 : vérifier** à l'usage dans les tâches 7 et 8, puisqu'aucune page ne les monte seuls. Lint et `tsc -b`.
- [ ] **Step 3 : commit** `feat(v2): les cartes personne et date`.

### Task 7 : « Tu les connais peut-être »

**Files:**
- Create: `apps/web-v2/src/features/welcome/WelcomePeople.tsx` (le hook de chargement dans le même fichier s'il reste court, sinon `useWelcomePeople.ts`)
- Modify: `apps/web-v2/src/features/welcome/WelcomePage.tsx`, `apps/web-v2/src/styles/3-components/welcome.css`

**Interfaces:**
- Consumes : `welcome_exhibitors` (tâche 1), `PersonCard` (tâche 6), `draft.createdId` (tâche 2).
- Produces : `WelcomePeople({ actorId: string })`.

- [ ] **Step 1 : le chargement** suit le patron de `.claude/rules/v2.md` (une fonction async rend l'état, l'effet l'applique une fois). Une erreur s'affiche ; elle ne passe jamais pour une liste vide.
- [ ] **Step 2 : la carte.** `meta` = la ville, `reason` = « Même métier » si `reason = 'craft'`, « Près de chez toi » sinon. Le suivi s'écrit tout de suite (`follows.insert` / `delete`, comme `followBack` de `lib/network.ts`) et revient en arrière si l'écriture échoue.
- [ ] **Step 3 : la page sans vitrine en direct**, la grille sur toute la largeur. Sur téléphone, deux colonnes. Une liste vide : on ne montre pas de grille.
- [ ] **Step 4 : vérifier** en comparant à `2392:65` (avec l'enseigne créée en tâche 9, ou une enseigne de test déjà en base, en lecture seule). Lint et `tsc -b`.
- [ ] **Step 5 : commit** `feat(v2): « Tu les connais peut-être » à l'arrivée`.

### Task 8 : « Ces festivals t'intéressent ? » et la fin

**Files:**
- Create: `apps/web-v2/src/features/welcome/WelcomeFestivals.tsx`
- Modify: `apps/web-v2/src/features/welcome/WelcomePage.tsx`, `apps/web-v2/src/styles/3-components/welcome.css`

**Interfaces:**
- Consumes : `welcome_festivals` (tâche 1), `DateCard` (tâche 6), `enter()` (tâche 5), `dates.ts` pour « 26–27 sept. · Ménétrol » (le formateur de période déjà utilisé par les cartes de date).
- Produces : `WelcomeFestivals({ actorId: string; onDone: () => void })`.

- [ ] **Step 1 : chargement et cartes**, même patron que la tâche 7. « Ça m'intéresse » écrit l'upsert `participations { actor_id, event_id, status: 'interesse' }` (`onConflict: 'actor_id,event_id'`) ; le second clic supprime la ligne. On revient en arrière si l'écriture échoue.
- [ ] **Step 2 : deux sorties** qui appellent `enter()` : le bouton « Commencer », et le lien. La sortie se fait sur une liste vide aussi.
- [ ] **Step 3 : vérifier** en comparant à `2392:271`. Lint et `tsc -b`.
- [ ] **Step 4 : commit** `feat(v2): « Ces festivals t'intéressent ? » termine l'arrivée`.

### Task 9 : le parcours entier, pour de vrai

**Files:** aucun, sauf correction.

- [ ] **Step 1 : demander son accord à Uriel** avant de créer une enseigne de test en prod, et convenir de son nom. On la supprime ensuite par le flux de suppression existant, avec son accord.
- [ ] **Step 2 : faire le parcours** sur `/bienvenue?nouvelle-enseigne` : un code faux puis le bon, deux images, deux suivis, deux festivals, « Commencer ».
- [ ] **Step 3 : relire en base** l'enseigne (`avatar_url`, `banner_url`, ville), `referrals`, `follows` et `participations` de l'enseigne.
- [ ] **Step 4 : rendu téléphone** à 390 px pour les étapes 5 à 7. Capture à montrer à Uriel, car il n'y a pas de maquette.
- [ ] **Step 5 : mettre à jour** `features/welcome/README.md` et les en-têtes, `pnpm --filter web-v2 build`, puis commit `docs(v2): l'arrivée en sept étapes`.
