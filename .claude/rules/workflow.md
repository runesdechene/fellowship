# Façon de travailler dans ce dépôt

> Se charge toujours. La méthode générale vit dans le vault : `_Socle/Méthode.md`.
> Regroupé le 25/09/2026 depuis la mémoire locale, pour que ce savoir voyage avec le dépôt.

## travailler-sur-main-directement

Au lieu de bosser sur une feature branch pendant 5 jours puis merger, on travaillera désormais **directement sur `main`**. Décidé après le ship 0.7.168 où la divergence prod ↔ repo (12 migrations en prod sans équivalent sur la branche, V2 déployée manuellement, etc.) a coûté ~2h de réconciliation `migration repair` + cleanup `gh pr merge` qui a embarqué le local sur l'ancien main. Uriel a re-confirmé fortement : « plus jamais cette galère, on bosse sur prod et main, voire une branche séparée pour un petit truc ».

**Why:** Sur Fellowship `main` = prod (Netlify auto-déploie). Bosser sur une branche n'apporte pas d'isolation utile — la DB est partagée de toute façon, et les divergences avec la prod s'accumulent rapidement. Une feature branche longue te force à faire la danse `migration repair --status applied/reverted` au moment du merge, c'est risqué.

**How to apply:**
- Plus de feature branches pour les changements normaux. Commit directement sur `main`.
- Branches OK uniquement pour : refactos massifs >2j, expérimentations qu'on n'est pas sûr de garder, ou quand on veut un PR review avant prod (rare).
- Les migrations sont écrites dans le bon ordre et appliquées immédiatement via `supabase db push --linked`.
- Pousser sur `main` = déployer en prod : continuer à faire build+lint avant push.

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
- Pour des changements de texte / couleur / micro-CSS : commit + push direct,
  pas de build, pas de lint. Vite est exécuté côté Netlify de toute façon
  au déploiement, et l'utilisateur travaille en local en dev mode (HMR).
- Build/lint reste utile :
  - Avant un commit qui touche logique TS / nouveaux fichiers / migration / refactor
  - Quand le diff est gros (10+ fichiers) ou implique des types croisés
  - Quand l'utilisateur explicitement demande une vérif

Pas de policy stricte : juge à la situation. Doute = skip.

## V1 testing feedback — UX issues

## Feedback from first test session (2026-04-04)

1. **Page profil charge sans fin** — bug, probablement un hook qui ne résout jamais le loading state
2. **Dashboard inaccessible depuis le menu** — le logo dans la sidebar devrait ramener au dashboard (accueil exposant)
3. **Création d'événement pas intuitive** — pas de bouton "Créer" en haut. Le flow devrait être : chercher d'abord, si rien trouvé → proposition de créer dans la recherche (modal ou page séparée). Pas de bouton visible "Créer un événement" en haut à droite.
4. **Tags primaires fixés** — doivent être définis par nous (admin), pas libres. Pour tester : Geek, Fête médiévale, Festival de musique. Les secondaires sont ajoutables par la communauté, partagés.
5. **Formulaire de création trop "form"** — manque de modernité, fait trop classique/HTML brut. Doit être plus moderne, plus Fellowship.

**Why:** L'UX doit être intuitive et moderne pour convaincre les exposants. Un formulaire laid ou un flow confus = abandon.
**How to apply:** Toujours tester les flows du point de vue d'un exposant qui découvre l'app. La recherche est l'action primaire, pas la création.

## Save credentials to .env immediately

Quand l'utilisateur donne un mot de passe DB, une clé API, ou tout credential nécessaire au projet, le sauvegarder IMMÉDIATEMENT dans `.env` du projet. Ne jamais compter sur la mémoire inter-sessions.

**Why:** L'utilisateur a donné le SUPABASE_DB_PASSWORD dans une session précédente, il n'a pas été sauvegardé dans .env, et l'utilisateur a dû le recréer. Frustration évitable.

**How to apply:** Dès qu'un credential est fourni → `echo "VAR=value" >> .env` dans la même réponse, avant de faire quoi que ce soit d'autre.

## Subagent escalation triggers

When dispatching an implementer subagent for tasks that touch test infra, build config, or dep resolution, **give explicit escalation triggers in the prompt** like:

> If you find yourself creating debug-* files to introspect the test environment, or modifying vitest.config.ts / vite.config.ts to fight a setup issue, STOP and report BLOCKED. Do not iterate past 3 attempts at config tweaks.

**Why:** A subagent dispatched on Task 3 (NetworkListItem TDD) hit the React 19 + RTL 16 + jsdom 29 infra issue, spiraled for 73 tool uses + 13 debug test files + a `vitest.config.ts` bandaid (`server.deps.inline` + `dedupe`) before being capped by the rate limit. The work it produced was discarded. The right move was to escalate after the second config tweak failed.

**How to apply:** Whenever the task is "write a test for X" or "configure Y", include a hard upper bound on infra changes in the dispatch prompt. Frame it explicitly: "If the test framework fights you for more than 2 attempts, escalate — don't tweak configs to make it pass." The user prefers root-cause fixes over bandaids (cf. `feedback_no_bandaid.md`), and bandaids dressed as "make the test pass" are still bandaids.
