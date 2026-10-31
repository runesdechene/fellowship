# Recettes chiffrées — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** les recettes d'un bilan (Carte, Espèces) chiffrées dans le navigateur avec une phrase de
passe par enseigne, illisibles en base, lisibles par l'exposant, l'Exposeur et le plugin Accueil.

**Architecture :** une lib pure (`lib/cipher.ts`) chiffre et déchiffre avec Web Crypto. Deux tables
gardent le sel et les chiffrés. Un contexte React garde la clé de la session. Les chargeurs
déchiffrent et **réinjectent Carte et Espèces comme deux lignes de registre `in`** : bénéfice,
résumé de l'année, tableau de bord et fiche continuent de calculer comme aujourd'hui. Une date
chiffrée sans clé est marquée `masked`, et l'interface affiche `•••• €` partout où le CA entre.

**Tech Stack :** React 19, TypeScript strict, Supabase (Postgres, RLS, edge function), Web Crypto,
vitest.

**Spec :** `docs/superpowers/specs/2026-10-31-recettes-chiffrees-design.md` (à lire avant chaque tâche).

## Global Constraints

- Aucune dépendance nouvelle : `crypto.subtle` seulement.
- PBKDF2-SHA-256, `600_000` itérations, sel 16 octets ; AES-GCM 256 ; IV 12 octets ; payload =
  base64(`IV ‖ chiffré`) ; montants en centimes sur 12 chiffres ; `check` = `fellowship` chiffré.
- Phrase forte : au moins 4 mots et 20 caractères.
- La phrase et la clé ne quittent jamais le navigateur : ni en base, ni dans `localStorage`, ni dans
  un log. La clé vit en mémoire (contexte React), non extractible.
- Libellés exacts de la maquette : « Recettes chiffrées », « Carte », « Espèces », « chiffré »,
  « Phrase de passe », « tape ta phrase pour afficher tes recettes », « Afficher », « Chiffrer tes
  recettes », « Chiffrer mes recettes », « Encore une fois », « Affiche tes recettes pour le
  comparer », « Réinitialiser ma phrase de passe », « Réinitialiser… ». Pas d'italique.
- `.claude/rules/v2.md` : en-tête QUOI/POURQUOI, 400 lignes max, aucun style dans les `.tsx`,
  `dates.ts`/`money.ts` pour toute date ou montant, `pnpm --filter web-v2 lint` vert avant commit.
- Migrations : `supabase/migrations/<horodatage>_<nom>.sql`, POURQUOI en tête, appliquées par
  `node_modules/supabase/bin/supabase.exe db push --linked`, tout `CREATE OR REPLACE` part de la
  définition **live**.

## Review Focus

1. **Phrase fausse** : « Afficher » avec une mauvaise phrase laisse tout masqué et le dit, sans
   lever d'exception → test `unlockKey` rend `null` (Tâche 1) et état d'erreur dans la ligne (Tâche 5).
2. **Zéro** : Carte 0 et Espèces 0 restent masquées et donnent un payload de même longueur qu'un
   gros montant → test de longueur (Tâche 1).
3. **Date chiffrée sans autre ligne** : comptée comme bilan rempli (Mes bilans, tableau de bord,
   Exposeur) → test `isFilled` (Tâche 3) et cas SQL (Tâche 2).
4. **Année mêlant dates claires et chiffrées, clé absente** : le CA et le bénéfice de l'année sont
   masqués, pas sous-estimés → test `yearSummary` (Tâche 3).
5. **Réinitialisation** : après `reset_revenue_key`, plus aucun `report_secrets` de l'enseigne, et
   le prochain chiffrement redemande une phrase → vérification SQL (Tâche 2) et parcours (Tâche 7).

---

### Task 0 : maquette téléphone

**Files :** Figma `9CmmBD3t5rAk4tD583cdN3`, à partir de `2157:2` (« 2027 mobile — Bilan d'une date »).

- [ ] Dupliquer `2157:2` en trois états (affichées, verrouillées, fenêtre) en reprenant les nœuds
      ordinateur `2566:233`, `2566:524`, `2566:815`. Aucun élément neuf.
- [ ] Faire valider par Uriel. **Aucune tâche d'interface (5 à 7) ne démarre avant.**

### Task 1 : la lib de chiffrement

**Files :**
- Create : `apps/web-v2/src/lib/cipher.ts`
- Test : `apps/web-v2/src/lib/cipher.test.ts`

**Interfaces :**
- Produces :
  - `interface KeyRecord { salt: string; iterations: number; check: string }`
  - `interface SecretRevenue { carte: number; especes: number }` (euros)
  - `isStrongPassphrase(phrase: string): boolean`
  - `createKey(phrase: string): Promise<{ key: CryptoKey; record: KeyRecord }>`
  - `unlockKey(phrase: string, record: KeyRecord): Promise<CryptoKey | null>`
  - `sealRevenue(key: CryptoKey, revenue: SecretRevenue): Promise<string>`
  - `openRevenue(key: CryptoKey, payload: string): Promise<SecretRevenue>`

- [ ] **Step 1 : écrire les tests** (`describe('cipher')`), avec `iterations` réel :
  - `isStrongPassphrase('chêne lune forge rivière')` → `true` ; `'chêne lune forge'` → `false` ;
    `'a b c d'` → `false`.
  - aller-retour : `openRevenue(key, await sealRevenue(key, { carte: 2830, especes: 1380 }))`
    → `{ carte: 2830, especes: 1380 }` ; idem `{ carte: 0, especes: 0.5 }`.
  - deux scellements du même montant donnent deux payloads différents.
  - `(await sealRevenue(key, { carte: 0, especes: 0 })).length ===
    (await sealRevenue(key, { carte: 999999.99, especes: 999999.99 })).length`.
  - `unlockKey('mauvaise phrase de passe ici', record)` → `null` ; la bonne phrase → une clé qui
    ouvre un payload scellé par la clé de `createKey`.
  - `record.iterations === 600000`, `record.salt` décodé fait 16 octets.
- [ ] **Step 2 :** `pnpm --filter web-v2 exec vitest run src/lib/cipher.test.ts` → FAIL (module absent).
- [ ] **Step 3 :** implémenter avec `crypto.subtle` (`importKey` PBKDF2 → `deriveKey` AES-GCM,
      `extractable: false`). Montants arrondis au centime par `money.ts` si un helper existe,
      sinon `Math.round(x * 100)`, puis `padStart(12, '0')`.
- [ ] **Step 4 :** relancer → PASS.
- [ ] **Step 5 :** commit `feat(bilans): chiffrement des recettes dans le navigateur`.

### Task 2 : la base

**Files :**
- Create : `supabase/migrations/<horodatage>_recettes_chiffrees.sql`
- Modify : `apps/web-v2/src/types/supabase.ts` (régénéré), `docs/db/gotchas.md`

**Interfaces :**
- Produces : tables `revenue_keys(actor_id uuid pk → entities, salt text, iterations int,
  check text, created_at timestamptz)` et `report_secrets(actor_id, event_id, payload text,
  updated_at, primary key (actor_id, event_id))`, FK `on delete cascade` comme
  `event_ledger_entries` ; RPC `reset_revenue_key(p_actor uuid) returns void` (security invoker,
  `can_act_as`) ; `exposeur_chiffres` rend en plus `cle` (`{salt, iterations}` ou `null`) et
  `secrets` (`[{payload, dans_ca}]`).

- [ ] **Step 1 :** écrire la migration : tables, RLS `can_act_as(actor_id)` pour tout,
      `reset_revenue_key`. Dans `exposeur_chiffres` (définition **live** copiée entière) :
      `rempli` vaut aussi vrai quand la date a un `report_secrets` ; `secrets` liste les
      payloads des dates comptées, `dans_ca = (revenue_goal is null)`.
- [ ] **Step 2 :** `node_modules/supabase/bin/supabase.exe db push --linked`.
- [ ] **Step 3 : vérifier en prod** (lecture seule, MCP `execute_sql`) : les deux tables existent
      avec RLS active ; `exposeur_chiffres` sur la clé de Runes de Chêne rend les mêmes `ca` qu'avant,
      `cle: null`, `secrets: []`.
- [ ] **Step 4 :** régénérer `types/supabase.ts`, ajouter les deux tables à `docs/db/gotchas.md`
      (« les recettes chiffrées ne sont pas dans event_ledger_entries »).
- [ ] **Step 5 :** commit `feat(db): tables des recettes chiffrées et exposeur`.

### Task 3 : les chiffres d'une date chiffrée

**Files :**
- Modify : `apps/web-v2/src/lib/reports.ts`, `apps/web-v2/src/lib/reports.test.ts`

**Interfaces :**
- Consumes : `SecretRevenue` (Tâche 1).
- Produces :
  - `ReportDate.secret: 'none' | 'masked' | 'open'` (nouveau champ requis)
  - `secretLines(revenue: SecretRevenue): ReportLine[]` — deux lignes `in`, `source: 'manual'`,
    catégories `'carte'` et `'especes'` (type `ReportLine['category']` élargi localement si besoin)
  - `ReportFigures.masked: boolean`, `YearSummary.masked: boolean`

- [ ] **Step 1 : tests**
  - `isFilled` sur une date `secret: 'masked'` sans ligne → vrai (via `reportFigures(date).filled`).
  - `reportFigures` d'une date `masked` → `masked: true`.
  - `yearSummary` d'une date claire (CA 1000) et d'une date `masked` → `masked: true`.
  - `yearSummary` d'une date `open` dont les lignes incluent `secretLines({carte: 2830, especes: 1380})`
    et une dépense de 1340 → `revenue: 4210`, `net: 2870`, `masked: false`.
- [ ] **Step 2 :** FAIL. **Step 3 :** implémenter. **Step 4 :** PASS (et tests existants verts).
- [ ] **Step 5 :** commit `feat(bilans): une date chiffrée compte comme un bilan rempli`.

### Task 4 : la clé de session et les chargeurs

**Files :**
- Create : `apps/web-v2/src/lib/revenue-key.tsx` (contexte), `apps/web-v2/src/features/reports/secretRevenue.ts`
- Modify : `features/reports/loadReport.ts`, `features/reports/useReports.ts`,
  `features/dashboard/useDashboard.ts`, `features/event/useLastEditionReport.ts`, le fournisseur
  racine de l'app (là où `AuthProvider` est posé)

**Interfaces :**
- Consumes : Tâches 1 à 3.
- Produces :
  - `useRevenueKey(): { status: 'none' | 'locked' | 'open'; key: CryptoKey | null; create(phrase): Promise<void>; unlock(phrase): Promise<boolean>; reset(): Promise<void> }`
    — `status` lu dans `revenue_keys` pour l'acteur courant ; la clé se perd au changement d'acteur.
  - `loadSecrets(actorId: string, eventIds: string[], key: CryptoKey | null): Promise<Map<string, SecretRevenue | 'masked'>>`
  - Chaque chargeur pose `secret` sur ses `ReportDate` et ajoute `secretLines(...)` quand c'est ouvert ;
    il prend `key` en dépendance pour recharger au déverrouillage.

- [ ] **Step 1 :** implémenter `loadSecrets` (une requête `report_secrets` `in (eventIds)`, `must()`,
      `openRevenue` par ligne) et le contexte.
- [ ] **Step 2 :** brancher les quatre chargeurs. Une requête qui échoue lève, jamais « rien ».
- [ ] **Step 3 :** `pnpm --filter web-v2 exec tsc -b` et `pnpm --filter web-v2 test` → verts.
- [ ] **Step 4 :** commit `feat(bilans): la clé de session déchiffre les recettes partout`.

### Task 5 : le bilan d'une date

**Files :**
- Create : `features/reports/EncryptDialog.tsx`, `features/reports/UnlockRow.tsx`,
  `styles/3-components/report-secret.css`
- Modify : `features/reports/Ledger.tsx`, `features/reports/ReportSummary.tsx`,
  `features/reports/ReportGoal.tsx`, `features/reports/ReportPage.tsx`,
  `features/reports/reportActions.ts`, `lib/report-writes.ts` (catégorie « Recettes chiffrées »)

**Interfaces :**
- Consumes : `useRevenueKey`, `sealRevenue`, `isStrongPassphrase`.
- Produces : `sealRevenueLines(target: Target, key: CryptoKey, revenue: SecretRevenue): Promise<void>`
  dans `reportActions.ts` — `ensureReport`, upsert `report_secrets`, suppression des lignes `in`
  `manual` de la date ; `clearReport` efface aussi `report_secrets`.

- [ ] **Step 1 :** relever `2566:233`, `2566:524`, `2566:815` par `get_design_context` et tenir le
      tableau maquette / code (`.claude/rules/v2.md`).
- [ ] **Step 2 :** écritures (`sealRevenueLines`, `clearReport`), puis l'interface : catégorie dans
      la ligne d'ajout → fenêtre si `status === 'none'`, sinon les deux montants ; lignes Carte et
      Espèces modifiables sur place quand c'est ouvert (rescellées à chaque changement) ;
      `UnlockRow` quand c'est masqué, avec « Phrase incorrecte » sur un échec ; résumé et jauge
      masqués ; nouvelle ligne de confidentialité.
- [ ] **Step 3 :** `pnpm dev`, parcours dans le navigateur sur une date de test : chiffrer,
      recharger (masqué), mauvaise phrase, bonne phrase, modifier Espèces à 0 (reste masqué au
      rechargement). Captures côte à côte avec Figma.
- [ ] **Step 4 :** lint + build, commit `feat(bilans): chiffrer ses recettes dans le bilan`.

### Task 6 : Mes bilans, tableau de bord, fiche

**Files :** `features/reports/YearCard.tsx`, `MonthlyChart.tsx`, `ReportsTable.tsx`,
`features/dashboard/ReportsSection.tsx`, le bloc « ton bilan de l'an passé » de la fiche.

- [ ] **Step 1 :** partout où un CA, un bénéfice ou un mois en dépend : `•••• €` quand `masked`.
      Rien d'autre (pas de champ de déverrouillage hors du bilan : pas dans la maquette).
- [ ] **Step 2 :** parcours navigateur clé absente / clé ouverte ; lint ; commit
      `feat(bilans): les totaux masqués tant que la phrase n'est pas tapée`.

### Task 7 : Réglages

**Files :** Create `features/settings/ResetRevenueKey.tsx` ; Modify `features/settings/SettingsPage.tsx`.

- [ ] **Step 1 :** la carte de `2573:233` au-dessus de `DeleteAccount`, affichée seulement si
      `status !== 'none'` ; `ConfirmDialog` avant `reset()`.
- [ ] **Step 2 :** parcours : réinitialiser, vérifier en base (lecture seule) qu'il ne reste aucun
      `report_secrets` de l'enseigne de test, rechiffrer redemande une phrase. Commit
      `feat(réglages): réinitialiser sa phrase de passe`.

### Task 8 : Exposeur et plugin Accueil

**Files :**
- Modify : `supabase/functions/exposeur/index.ts` (passe `cle` et `secrets` tels quels),
  `docs/superpowers/specs/2026-10-31-exposeur-design.md`
- Autre dépôt `Desktop/DEVs/Plugin` : `src/connecteurs.ts` et ses tests

- [ ] **Step 1 :** déployer `exposeur` (`.claude/rules/deploiement.md`), vérifier la réponse.
- [ ] **Step 2 (plugin) :** connecteur `json` : si la réponse porte `cle` et `secrets`, lire la
      phrase dans `app.secretStorage` (nom de secret dans les réglages du connecteur, saisie par
      appareil), déchiffrer avec le même algorithme (copie de `openRevenue`/`unlockKey`, testée sur
      un payload produit par la Tâche 1), ajouter Carte + Espèces à `ca_reel`, et à `ca` si `dans_ca`.
      Phrase absente → erreur lisible « phrase des recettes absente du coffre ».
- [ ] **Step 3 :** tests du plugin verts, copie dans `.obsidian/plugins/accueil`, commit dans chaque dépôt.

## Fin

Mettre à jour `_État.md` (vault) : où on en est, prochaine action. Un piège payé → `.claude/rules/`.
