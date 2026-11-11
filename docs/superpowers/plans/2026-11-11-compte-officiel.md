# Compte officiel Fellowship — plan de construction

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** un compte « Fellowship » officiel : badge sceau partout où son nom paraît, ses sujets en tête de la barre avec l'anneau à halo, une vitrine sans Suivre avec « Écrire » ouvert à tous.

**Architecture:** la base porte le drapeau (`officiel`), la règle unique `peut_ecrire` et le compte lui-même (créé par la migration). Le front lit une fois la liste des comptes officiels et décide le badge, l'ordre et l'anneau sur l'id d'acteur ; il demande `peut_ecrire` à la base pour afficher Écrire.

**Tech Stack:** Postgres (Supabase, migrations horodatées), React 19 + TypeScript strict (`apps/web-v2`), vitest pour la logique pure, CSS en trois couches.

**Spec:** `docs/superpowers/specs/2026-11-11-compte-officiel-design.md` — maquette Figma page Story, planche `2835:893`.

## Global Constraints

- La base est la **production** : migration `supabase/migrations/<horodatage>_compte_officiel.sql`, POURQUOI en tête, appliquée par `node_modules/supabase/bin/supabase.exe db push --linked`, jamais `apply_migration` du MCP.
- Tout `CREATE OR REPLACE` part de la définition **live** copiée entière (`pg_get_functiondef`), pas d'un fichier de migration.
- Un nom de colonne ou de table ne se devine pas : `information_schema` ou `docs/db/gotchas.md` avant d'écrire.
- Front : pas de `any`, pas de style inline hors variables `'--nom'`, aucune valeur en dur dans `3-components/`, en-tête QUOI / POURQUOI sur chaque fichier, 400 lignes max, `pnpm --filter web-v2 lint` vert (code de sortie, pas un grep).
- Badge : pastille au dégradé `--brand-gradient` (border-box), logo blanc au centre ; **16 px** près d'un nom courant, **22 px** sur la vitrine. Jamais de coche (elle est au badge « Certifié » des Pro).
- Anneau officiel : dégradé de la marque, **4 px** (les autres : 3 px), halo de 1,5 px en `--terre-150` à 5 px autour. Pas de bulle du mot.
- Libellés : « Officiel » comme nom accessible du badge (`aria-label`, `title`).
- Toute transition passe par les jetons `--duration-*` / `--ease-*` ; `prefers-reduced-motion` respecté.

## Review Focus

1. **Fellowship écrit en premier à un non-ami** (pour répondre à un retour) : `ouvrir_conversation` doit accepter dans les deux sens — test en base, tâche 1.
2. **Un groupe** ne doit pas s'ouvrir aux non-amis via un membre officiel : `ajouter_membres` garde son test « amis » — vérification en base, tâche 1.
3. **La liste des officiels qui échoue à se charger** : aucun badge, aucun tri, rien ne casse ; jamais d'erreur affichée pour un signe discret — tâche 2.
4. **Deux sujets officiels ouverts** : tous deux en tête, dans l'ordre d'origine entre eux — test pur, tâche 2.
5. **Le visiteur sans compte sur `flw.sh/fellowship`** : ni Suivre ni Écrire, la vitrine s'affiche — vérification navigateur, tâche 5.

---

### Task 1: La base — drapeau, règle d'écriture, compte Fellowship

**Files:**
- Create: `supabase/migrations/<horodatage>_compte_officiel.sql`
- Modify: `apps/web-v2/src/types/supabase.ts` (régénéré)
- Modify: `docs/db/gotchas.md` si un piège est payé

**Interfaces:**
- Produces: colonne `officiel boolean not null default false` sur la table qui porte l'id d'acteur (attendu : `actors`, à confirmer dans `information_schema`) ; `public.peut_ecrire(p_actor uuid, p_other uuid) returns boolean` (`SECURITY DEFINER`, vérifie `can_act_as(p_actor)`, `GRANT` à `authenticated`) ; `public.comptes_officiels() returns setof uuid` lisible par `authenticated` et `anon` ; l'enseigne Fellowship, slug `fellowship`, officielle, Uriel seul membre.

- [ ] **Step 1: Relever le live** — `pg_get_functiondef` de `ouvrir_conversation`, `ajouter_membres`, `accounts_to_follow`, `envoyer_message`, `create_owned_entity` ; colonnes de `actors`, `entities` et de la table d'appartenance ; l'id d'acteur de la personne d'Uriel (e-mail `thenorthwanderers@gmail.com`). Noter si `envoyer_message` refait un test « amis ».
- [ ] **Step 2: Écrire la migration** — dans cet ordre : la colonne ; `peut_ecrire` = `are_friends(p_actor, p_other)` **ou** l'un des deux officiel ; `ouvrir_conversation` (live entier) dont le test « amis » d'une conversation à deux devient `peut_ecrire` (le cas groupe ne change pas) ; `accounts_to_follow` (live entier) qui exclut les officiels ; `comptes_officiels()` ; la création de l'enseigne Fellowship en refaisant ce que fait `create_owned_entity` (mêmes tables, mêmes valeurs par défaut), avatar `https://flw.sh/pwa-512x512.png`, vitrine publique au slug `fellowship`, puis `officiel = true`. Idempotente sur le slug (`ON CONFLICT` ou garde `IF NOT EXISTS`).
- [ ] **Step 3: Appliquer** — `node_modules/supabase/bin/supabase.exe db push --linked`. Attendu : migration appliquée, aucune erreur.
- [ ] **Step 4: Vérifier en prod, en lecture** (`set role authenticated` + `request.jwt.claims` d'un compte test, dans une transaction annulée) : `peut_ecrire(X, fellowship)` et `peut_ecrire(fellowship, X)` vrais pour un non-ami X ; faux entre deux non-amis ordinaires ; `accounts_to_follow(X)` ne contient pas Fellowship ; `comptes_officiels()` rend exactement un id ; `flw.sh/fellowship` lisible.
- [ ] **Step 5: Régénérer les types et committer** — `supabase gen types` vers `apps/web-v2/src/types/supabase.ts` ; commit `feat(db): le compte officiel Fellowship et la règle peut_ecrire`.

### Task 2: Le front sait qui est officiel

**Files:**
- Create: `apps/web-v2/src/lib/officials.ts`, `apps/web-v2/src/lib/officials.test.ts`, `apps/web-v2/src/lib/useOfficials.ts`
- Modify: `apps/web-v2/src/lib/README.md`

**Interfaces:**
- Consumes: `comptes_officiels()` (tâche 1).
- Produces: `officialFirst<T>(items: T[], authorOf: (item: T) => string, officials: ReadonlySet<string>): T[]` (pure) ; `useOfficials(): ReadonlySet<string>` — lu une fois par session (une promesse de module partagée), ensemble vide tant que rien n'est lu ou si la lecture échoue.

- [ ] **Step 1: Test qui échoue** — `officials.test.ts` :
```ts
test('les sujets officiels passent en tête, dans leur ordre', () => {
  const items = ['a', 'f1', 'b', 'f2']
  expect(officialFirst(items, (x) => x, new Set(['f1', 'f2']))).toEqual(['f1', 'f2', 'a', 'b'])
})
test('sans officiel, rien ne bouge', () => {
  expect(officialFirst(['a', 'b'], (x) => x, new Set())).toEqual(['a', 'b'])
})
```
- [ ] **Step 2: Lancer** — `pnpm --filter web-v2 exec vitest run src/lib/officials.test.ts` → FAIL (`officialFirst` absent).
- [ ] **Step 3: Écrire `officialFirst`** (tri stable : filtre des officiels puis du reste) **et `useOfficials`**.
- [ ] **Step 4: Relancer** → PASS.
- [ ] **Step 5: Commit** `feat(v2): le front connaît les comptes officiels`.

### Task 3: Le badge, posé partout

**Files:**
- Create: `apps/web-v2/src/assets/logo.svg` (copie de `dist/logo.svg` d'Uriel, chemin remplacé en `fill="#fff"`, attributs Inkscape retirés), `apps/web-v2/src/components/ui/OfficialBadge.tsx`, `apps/web-v2/src/styles/3-components/official-badge.css`
- Modify: `StoryBar.tsx` (nom), `SujetStory.tsx:71`, `Conversation.tsx:174`, `ChatFeed.tsx:177`, `MessagesPage.tsx` (nom de la ligne), `features/community/FeedItem.tsx` (nom), `features/vitrine/VitrineHead.tsx:157` ; `components/ui/README.md` ; `styles/index.css` (import)

**Interfaces:**
- Consumes: `useOfficials()` (tâche 2).
- Produces: `<OfficialBadge actorId={string} size?: 'small' | 'large' />` — rend `null` si le compte n'est pas officiel ; `small` = 16 px, `large` = 22 px.

- [ ] **Step 1: Le composant et son CSS** — `<span class="official-badge official-badge--small" role="img" aria-label="Officiel" title="Officiel"><img src={logo} alt="" /></span>` ; tailles et dégradé par jetons (ajouter `--official-badge-small/large` en couche 2 si absents).
- [ ] **Step 2: Le poser aux sept endroits**, collé au nom (même ligne, `align-items: center`, écart `--space-4`) ; sur la vitrine, en `large`, avant le badge Certifié.
- [ ] **Step 3: Vérifier dans le navigateur** (`pnpm dev`, compte Fellowship et compte ordinaire) : badge aux sept endroits sur Fellowship, nulle part ailleurs ; capture posée à côté de la planche `2835:893`.
- [ ] **Step 4: Lint + commit** `feat(v2): le badge Officiel`.

### Task 4: L'anneau et la place en tête

**Files:**
- Modify: `apps/web-v2/src/features/discussions/StoryBar.tsx`, `apps/web-v2/src/styles/3-components/discussions.css`, `apps/web-v2/src/styles/2-semantic.css`

**Interfaces:**
- Consumes: `officialFirst`, `useOfficials` (tâche 2).

- [ ] **Step 1: L'ordre** — `sujets` passe par `officialFirst(sujets, (s) => s.created_by, officials)` avant le rendu ; « Toi » reste premier.
- [ ] **Step 2: L'anneau** — classe `story--official` sur un sujet officiel (elle l'emporte sur la couleur du festival et sur `story--seen`) : bordure 4 px au dégradé (`border: 4px solid transparent; background: var(--brand-gradient) border-box` + masque, ou `::before` — la solution la plus simple qui garde le visage intact), halo en `::after` (`--terre-150`, 1,5 px, à 5 px). Jetons en couche 2 : `--story-official-ring`, `--story-official-halo`.
- [ ] **Step 3: Vérifier** dans le navigateur, sur le tableau de bord : sujet Fellowship juste après « Toi », anneau et halo conformes à la planche, en clair et en sombre.
- [ ] **Step 4: Lint + commit** `feat(v2): les sujets officiels en tête de la barre`.

### Task 5: La vitrine officielle

**Files:**
- Modify: `apps/web-v2/src/features/vitrine/VitrineHead.tsx`, `apps/web-v2/src/features/vitrine/useVitrine.ts`, `apps/web-v2/src/features/discussions/WriteButton.tsx`

**Interfaces:**
- Consumes: `peut_ecrire` (tâche 1), `useOfficials` (tâche 2).
- Produces: `Vitrine.official: boolean`, `Vitrine.canWrite: boolean` (lu par `peut_ecrire`, faux sans compte connecté ou sur sa propre vitrine).

- [ ] **Step 1: Lire `canWrite`** dans `useVitrine` par `rpc('peut_ecrire', { p_actor, p_other })`, à la place du test `following && followsMe` de `VitrineHead.tsx:139` (code mort retiré dans le même commit).
- [ ] **Step 2: Retirer Suivre** sur une vitrine officielle (`official`) ; garder Partager.
- [ ] **Step 3: Vérifier dans le navigateur** : `flw.sh/fellowship` connecté → pas de Suivre, Écrire ouvre la conversation ; une vitrine d'ami → Écrire comme avant ; une vitrine de non-ami → pas d'Écrire ; sans compte → ni l'un ni l'autre.
- [ ] **Step 4: Lint + commit** `feat(v2): la vitrine officielle, sans Suivre, avec Écrire`.

### Task 6: Livrer

- [ ] **Step 1:** `pnpm --filter web-v2 lint` et `pnpm --filter web-v2 build` verts.
- [ ] **Step 2:** version de `apps/web-v2/package.json` montée à la main (Edit, chemin complet), commit.
- [ ] **Step 3:** `pnpm deploy:v2`, vérifications de `.claude/rules/deploiement.md` sur le brouillon, puis `pnpm deploy:v2:prod` et `curl -s https://flw.sh/version.json`.
- [ ] **Step 4:** ligne dans le `_État.md` (Où on en est) ; push en fin de session.
