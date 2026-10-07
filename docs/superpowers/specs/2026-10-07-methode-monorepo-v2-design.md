# Fellowship — la méthode de Runes de Chêne, et la V2 en monorepo (design)

> Validé avec Uriel le 07/10/2026, en brainstorming. Modèle : `../app (Runes de Chêne)/`.
> Décisions reportées dans le vault : `Fellowship/Dev.md` (Tranché) et `_Socle/Méthode.md`.

## 1. Le but

Reprendre la V2 de Fellowship avec la même méthode que l'app Runes de Chêne : le vault pour
l'état et les décisions, Graphify pour la carte du code, un dépôt où Claude sait tout de suite
où sont les choses, du code qui se lit seul, et la maquette Figma comme référence.

Aujourd'hui, trois choses empêchent de le faire :
- la V2 vit sur une **branche longue** (`v2`, 142 commits d'avance sur la prod) sans mode de
  déploiement, ce qui contredit la règle « on bosse sur `main` » ;
- le contexte Claude est éclaté (`_ContexteIA/`, `xo-status.md`, `BOOTSTRAP.md`,
  `docs/xo-discipline.md`), en partie faux, et **le vault ignore que la V2 existe** ;
- Netlify **redéploie la prod à chaque push sur `main`** (relevé le 07/10 : `provider: github`,
  `stop_builds: false`, et un commit de doc a suffi à redéployer le 14/08).

## 2. L'architecture du dépôt

```
fellowship/                 main = seule branche de travail
├── apps/
│   ├── web/                la V1, telle qu'en prod (v0.7.398) → flw.sh
│   └── web-v2/             le code de la branche v2 → flw.sh/v2/
├── supabase/               commun : migrations, fonctions
├── docs/                   commun ; docs/v2/ = le carnet de la V2
├── scripts/  print/        communs
├── graphify-out/
├── .claude/                settings.json versionné + rules/
├── .github/workflows/      CI des deux apps
├── package.json            racine : workspaces + raccourcis (dev, dev:v2, build, build:v2)
└── pnpm-workspace.yaml     apps/*
```

- **La V1 ne change pas** : elle est déplacée telle quelle, Tailwind et PWA compris.
- **La V2 non plus** : son code est déplacé, pas réécrit. Les écarts de méthode (en-têtes,
  README) se rattrapent dans un lot à part (§ 6).
- **Pas de `packages/` partagé** pour l'instant : rien de la V1 ne rentre dans la V2 (règle
  RdC), donc il n'y a rien à partager. Il viendra si un vrai besoin apparaît.
- **La version** : chaque app garde la sienne (`apps/web` en 0.7.x, `apps/web-v2` en 2.x).

## 3. Le déploiement

- **Manuel, toujours.** Les builds automatiques Netlify sont coupés (`stop_builds: true`). Le
  lien GitHub reste en place. On déploie avec `netlify deploy --prod --site <nom>`, depuis le
  dossier de l'app, quand un lot est prêt.
- **Deux sites.** `fellowship-app` (flw.sh) sert la V1 depuis `apps/web`. Un nouveau site,
  `fellowship-web-v2`, sert la V2. La V1 le relaie par une redirection `/v2/*` en
  `status = 200` : même domaine, donc **même session Supabase**.
- **La V2 vit sous `/v2/`** : `base: '/v2/'` dans Vite, `basename` dans le routeur.
- **Le piège du service worker** : la PWA de la V1 a une portée `/`. Sans exclusion, elle sert
  son propre `index.html` à la place de `/v2/`. Il faut `navigateFallbackDenylist: [/^\/v2/]`
  dans la config Workbox de la V1, et le vérifier en prod sur un navigateur qui a déjà la V1
  installée.
- **L'accès** : tant qu'elle se construit, la V2 est réservée aux comptes autorisés. Le
  mécanisme est à copier sur RdC (`useV2Access`), sans dépendre de la V1.

## 4. La couche Claude

**`CLAUDE.md` racine, court, sur le modèle RdC.** Il renvoie au vault (`Fellowship/_État.md`,
`Dev.md`, `_Socle/`), puis ne parle que du code : où sont les choses (tableau), démarrage
(graph absent = stop ; fetch, pull, rebuild Graphify), chercher avant de lire (Context7 →
Graphify → fichier), règles, livrer, nouvelle machine. `apps/web/CLAUDE.md` garde les
spécificités de la V1. `apps/web-v2/README.md` sert de porte d'entrée à la V2.

**`.claude/settings.json` versionné**, repris de RdC :
- `autoMemoryEnabled: false` : le savoir va dans `.claude/rules/`, pas dans la mémoire locale ;
- hook `Stop` : rappel quand des commits ne sont pas poussés ;
- hook `PreToolUse` sur `Grep|Glob` : rappel de lire `graphify-out/GRAPH_REPORT.md` d'abord ;
- hook `PreToolUse` qui **refuse `apply_migration`** du MCP Supabase. Canal unique :
  `supabase/migrations/` puis `supabase db push --linked`.

`apply_migration` est retiré de la liste d'autorisations de `settings.local.json`.

**`.claude/rules/`** :
- `v2.md` (nouveau, chargé sur `apps/web-v2/**` et `docs/v2/**`) : les règles de RdC — chef-d'œuvre de
  simplicité, tout est animé, rien de la V1 ne rentre, chaque fichier se lit seul, registre de
  purge, tout état navigable est une URL, un écran n'est fini que comparé à sa maquette. Il
  reçoit aussi les pièges déjà payés sur la V2 Fellowship, sortis de `xo-status.md` :
  - la cascade `.button:hover:not(:disabled)` ;
  - un onglet en arrière-plan gèle les transitions et fait mentir `getComputedStyle` ;
  - une animation se maquette avant de se coder ;
  - le décor d'une page n'est pas retiré à temps pour `startViewTransition` ;
  - `PageChrome.back` est un chemin, jamais une fonction.
- `workflow.md` est revu : on retire les retours de test V1 d'avril et l'ancienne règle
  « pas de branche », on écrit le régime de livraison (§ 5).
- `supabase.md`, `interface.md`, `dev.md`, `deploiement.md` : chemins mis à jour (`src/` →
  `apps/web/src/`), le reste inchangé. `deploiement.md` reçoit les deux sites et le piège du
  service worker.

**Graphify** : rebuild complet après le déplacement (les chemins changent tous). Le hook
`post-commit` est réinstallé. Si `supabase/migrations/` doit être indexé comme chez RdC, on
reprendra `scripts/graphify-sql.py`, mais pas dans ce chantier.

## 5. La méthode de travail

- **Livrer** : commit à chaque étape qui marche, push en fin de session, déploiement manuel
  quand un lot est prêt. Avant de déployer un front : `pnpm dev`, le parcours testé dans le
  navigateur, puis `pnpm build`.
- **Le code de la V2 se lit seul** : un en-tête `QUOI / POURQUOI / (ATTENTION)` sur chaque
  fichier, un `README.md` par dossier. Un commentaire dit *pourquoi*, jamais ce que la ligne
  dit déjà. La V1 n'est pas reprise.
- **Figma** : via le plugin MCP. Un écran se relève avec `get_design_context` (valeurs
  exactes, icônes téléchargées), puis la capture de la V2 se pose à côté de la capture Figma,
  et chaque écart est repris. Une couleur de maquette absente des primitives s'ajoute à
  `1-primitives.css`, jamais en dur.
- **Fin de session** : une décision va dans le `_État.md` du vault, un piège dans
  `.claude/rules/`. Rien d'autre.

## 6. Ce qui disparaît

| Quoi | Où va son contenu |
|---|---|
| `_ContexteIA/CLAUDE.md` | réécrit en `CLAUDE.md` racine |
| `_ContexteIA/xo-status.md` (« Mémoire ») | pièges → `rules/v2.md` ; décisions → vault |
| `_ContexteIA/xo-status.md` (tâches ouvertes) | « Points ouverts » en bas de `docs/v2/README.md` |
| `_ContexteIA/Équipe/` (personas), `projet.json`, `cover.png` | supprimés (accord du 07/10) |
| `.mcp.json` (serveur `xo`) + `enabledMcpjsonServers` | supprimés (accord du 07/10) |
| `BOOTSTRAP.md` | section « Nouvelle machine » du `CLAUDE.md` |
| `docs/xo-discipline.md` | règles du `CLAUDE.md` et de `rules/` |
| la branche `v2` | fusionnée dans `main`, puis supprimée |
| le worktree `../fellowship-legacy` (déjà absent du disque) | `git worktree prune` |

**Le carnet `docs/v2/`** se crée avec `README.md`, `decisions/`, `sondes/` et
`purge-back.md`, à côté du `DESIGN-SYSTEM.md` déjà présent.

**Le vault** : `_État.md` et `Dev.md` disent que la V2 existe, ce qu'elle contient (tableau de
bord, fiche événement, création, discussion) et sa prochaine action.

## 7. L'ordre des opérations

Tout se fait sur la branche `v2`, qui contient déjà `origin/main`. `main` avance ensuite en
fast-forward : l'historique est conservé, sans merge à résoudre.

1. **Couper l'auto-deploy Netlify** avant tout push (`stop_builds: true`), et vérifier.
2. **Déplacer la V2** : `src/`, `public/`, `index.html` et les configs d'app passent dans
   `apps/web-v2/` (`git mv`).
3. **Restaurer la V1** dans `apps/web/` depuis `origin/main`, c'est-à-dire la prod : `src/`,
   `public/`, `index.html` et les configs d'app de ce commit, à l'identique.
4. **Monter le workspace** : `pnpm-workspace.yaml`, `package.json` racine, `pnpm install`,
   puis `pnpm build` et `pnpm test` sur les deux apps, et la CI adaptée.
5. **Brancher `/v2/`** : `base`, `basename`, exclusion dans le service worker de la V1,
   redirection, accès réservé.
6. **La couche Claude** (§ 4) et la dissolution (§ 6).
7. **Rebuild Graphify**, puis `graphify hook install`.
8. **Vérifier en local** : V1 sur `/`, V2 sur `/v2/` avec la même session.
9. **Pousser `main`**, créer le site Netlify de la V2, rebrancher la V1 sur `apps/web`, et
   déployer : la V1 d'abord (en vérifiant qu'elle est identique), puis la V2.
10. **Supprimer la branche `v2`** (locale et distante) et le worktree mort.
11. **Le lot « lisibilité »** : en-têtes et README dans `apps/web-v2`. Il ne change pas le
    comportement, donc il passe en commits séparés.

## 8. Comment on sait que c'est fini

- flw.sh sert la V1 à l'identique : même version affichée, parcours de connexion et
  tableau de bord testés.
- flw.sh/v2/ sert la V2 avec la session de la V1, et refuse un compte non autorisé.
- Un navigateur qui avait déjà la V1 installée ouvre bien `/v2/`, sans tomber sur la V1.
- Un push sur `main` ne déclenche aucun déploiement.
- Une nouvelle session Claude ouverte dans le dépôt trouve d'elle-même le vault, Graphify et
  les règles V2, et sait où en est la V2.

## 9. Points ouverts

- **Les 16 commits du `main` local jamais poussés** (cockpit2 derrière `?app2=1`, plus une
  sauvegarde WIP du 16/08). Proposition : `apps/web` = la prod (`origin/main`). Ces commits
  restent dans l'historique de `v2`, puis de `main`. Le cockpit2 qu'ils contiennent a été
  remplacé par la V2.
- **Faut-il reprendre la pile de RdC pour la V2** (TanStack Query, stylelint, prettier) ? Hors
  de ce chantier : à trancher en reprenant le développement.
- **L'URL du fichier Figma de la maquette V2** : à fournir par Uriel, pour l'écrire dans
  `apps/web-v2/README.md`.
