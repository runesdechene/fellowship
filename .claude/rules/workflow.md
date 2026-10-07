# Façon de travailler dans ce dépôt

> Se charge toujours. La méthode générale vit dans le vault : `_Socle/Méthode.md`.
> Regroupé le 25/09/2026 depuis la mémoire locale, pour que ce savoir voyage avec le dépôt.

## Le régime de livraison

Depuis le 07/10/2026, Fellowship suit le régime de Runes de Chêne :

- **Une seule branche, `main`.** La V2 ne vit plus sur une branche longue : elle vit dans
  `apps/web-v2`, la V1 dans `apps/web`. Une branche reste possible pour une expérimentation qu'on
  n'est pas sûr de garder.
- **Commit à chaque étape qui marche ; push en fin de session** (ou quand Uriel change de poste).
  Le hook `Stop` rappelle les commits non poussés.
- **Déploiement manuel, par lot**, depuis le dossier de l'app (`deploiement.md`). Pousser sur
  `main` ne déploie plus rien : l'auto-deploy Netlify est coupé (`stop_builds: true`).
- **Les migrations** sont écrites dans l'ordre et appliquées tout de suite par
  `pnpm exec supabase db push --linked` : la base est partagée par les deux apps et c'est la prod.

**Why:** la branche `v2` avait accumulé 142 commits sans mode de déploiement, et l'auto-deploy
redéployait la prod sur un simple commit de doc (constaté le 07/10/2026). Avant ça, la divergence
prod ↔ branche du ship 0.7.168 avait coûté ~2 h de `migration repair`.

[[reference-supabase-db-diverge-recovery]]

## Check git diff before editing dirty files

Always check `git diff HEAD -- <file>` before editing a file that's already modified in git status. Existing uncommitted changes may contain valid fixes from prior sessions.

**Why:** In a session, auth.tsx was already dirty with a working StrictMode fix. Editing it without checking the diff caused a regression — the fix was overwritten and had to be restored.

**How to apply:** At session start, if git status shows modified files, inspect their diffs before touching them. Preserve intentional changes; don't blindly rewrite.

## Never regress committed fixes

When a file is dirty at session start, its uncommitted changes may be intentional fixes from a prior session. NEVER overwrite them blindly.

**Why:** auth.tsx and Login.tsx were both regressed in a session by editing over existing working fixes. The auth StrictMode fix (useRef initialized guard) was deleted, and Login.tsx had an unwanted account-type chooser injected. User had to correct the same bug multiple times.

**How to apply:** At the start of any session with dirty files, run `git diff HEAD -- <file>` for each modified file before touching it. Understand what the existing changes do. Preserve them unless the user explicitly says to revert.

## no-build-after-every-tweak

Ne pas lancer `pnpm build` (ni `pnpm lint`) après chaque petit ajustement
visuel ou textuel. L'utilisateur les détecte directement en regardant l'app
et fait remonter les bugs immédiatement, donc le build est du temps perdu.

**Why:** L'utilisateur va vite et préfère que je ship vite. Si j'ai introduit un bug
de logique TypeScript, son prochain message le signale et je corrige.

**How to apply:**
- Pour des changements de texte / couleur / micro-CSS : commit direct,
  pas de build, pas de lint. Le build se refait de toute façon au
  déploiement manuel, et Uriel regarde en local en dev mode (HMR).
- Build/lint reste utile :
  - Avant un commit qui touche logique TS / nouveaux fichiers / migration / refactor
  - Quand le diff est gros (10+ fichiers) ou implique des types croisés
  - Quand l'utilisateur explicitement demande une vérif

Pas de policy stricte : juge à la situation. Doute = skip.

## Save credentials to .env immediately

Quand l'utilisateur donne un mot de passe DB, une clé API, ou tout credential nécessaire au projet, le sauvegarder IMMÉDIATEMENT dans `.env` du projet. Ne jamais compter sur la mémoire inter-sessions.

**Why:** L'utilisateur a donné le SUPABASE_DB_PASSWORD dans une session précédente, il n'a pas été sauvegardé dans .env, et l'utilisateur a dû le recréer. Frustration évitable.

**How to apply:** Dès qu'un credential est fourni → `echo "VAR=value" >> .env` dans la même réponse, avant de faire quoi que ce soit d'autre.

## Subagent escalation triggers

When dispatching an implementer subagent for tasks that touch test infra, build config, or dep resolution, **give explicit escalation triggers in the prompt** like:

> If you find yourself creating debug-* files to introspect the test environment, or modifying vitest.config.ts / vite.config.ts to fight a setup issue, STOP and report BLOCKED. Do not iterate past 3 attempts at config tweaks.

**Why:** A subagent dispatched on Task 3 (NetworkListItem TDD) hit the React 19 + RTL 16 + jsdom 29 infra issue, spiraled for 73 tool uses + 13 debug test files + a `vitest.config.ts` bandaid (`server.deps.inline` + `dedupe`) before being capped by the rate limit. The work it produced was discarded. The right move was to escalate after the second config tweak failed.

**How to apply:** Whenever the task is "write a test for X" or "configure Y", include a hard upper bound on infra changes in the dispatch prompt. Frame it explicitly: "If the test framework fights you for more than 2 attempts, escalate — don't tweak configs to make it pass." The user prefers root-cause fixes over bandaids (cf. `feedback_no_bandaid.md`), and bandaids dressed as "make the test pass" are still bandaids.

## Graphify — l'index du code

1. **`graphify update .` puis `graphify hook install`** dans un dépôt neuf, sinon l'index pourrit en
   silence et on repaie en lectures de fichiers ce qu'il économisait.
2. **Après tout `git pull` non vide, relancer `graphify update .`** — le hook `post-commit` ne se
   déclenche que sur un commit *local*. Constaté le 25/09/2026 sur IVY : 60 commits tirés d'un autre
   poste, index resté daté d'un mois plus tôt, aucun signal.
3. **Vérifier sa fraîcheur sur la date de `graphify-out/graph.json`** — **pas** celle du dossier
   `graphify-out/`, qui ne bouge pas quand le fichier est réécrit en place. C'est ce piège qui a fait
   conclure à tort, le 25/09/2026, que tous les index étaient morts.
