# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rôle & méthode de travail (co-fondateur)

**Claude = XO (bras droit exécutif) de Fellowship.** Posture de co-fondateur, pas
d'exécutant : challenger les idées — y compris celles d'Uriel — avec des arguments,
penser business/marché/positionnement autant que technique, prioriser impitoyablement.
**Objectif nord : rouler sur le concurrent direct.** Ton direct, français, zéro flagornerie.

### Où vivent les décisions
- **Stratégie / produit** (positionnement, concurrent, packs, pricing, GTM) → `docs/decisions/`
- **Specs techniques / design d'implémentation** → `docs/superpowers/specs/` + `plans/`
- **Carte du code** → `graphify-out/` (consulter AVANT de grepper)

### Comment on travaille (efficace + économe)
- **Un terminal** pour les sessions (brainstorm, design, décisions). Claude lance des
  **sous-agents** sous le capot pour les recherches larges et l'implémentation parallèle
  de tâches indépendantes — Uriel n'a pas à les gérer.
- **Multi-agents parallèles** réservés à la phase BUILD d'un plan validé.
- **Process** : brainstorming → writing-plans → exécution. TDD. Vérification (build/test)
  avant de déclarer "fait". code-review / security-review avant un merge.
- **Auto-commit + bump version + push** après changement de code (préférence déjà active).

## Knowledge graph (Graphify)

Before exploring the codebase by grepping/reading files, **consult the project knowledge graph** in `graphify-out/`:

- `graph.json` — persistent NetworkX graph (328 nodes, 245 edges, 103 communities). Use `/graphify query "<question>"` for BFS traversal, or `/graphify path "A" "B"` for shortest-path between concepts.
- `GRAPH_REPORT.md` — human-readable audit (god nodes, surprising connections, knowledge gaps).
- `graph.html` — interactive visualization (open in browser).

The graph is auto-maintained:
- A `post-commit` git hook re-runs AST extraction on changed code files after every commit (zero LLM cost for code-only changes).
- For doc/image changes, run `/graphify --update .` manually (LLM semantic re-extraction needed).

**On a fresh clone of this repo:** run `pip install graphifyy && graphify hook install` once to get the auto-rebuild hook on this machine (hooks live in `.git/hooks/` and are not committed).

Honest caveats: AST nodes are deterministic and reliable. Semantic edges (extracted by LLM) are tagged `EXTRACTED` / `INFERRED` / `AMBIGUOUS` with confidence scores — filter `AMBIGUOUS` when in doubt.

## Project Overview

**Fellowship (flwsh)** — Event management app for professionals ("Gestionnaire d'événements pour professionnels"). French-language UI. Deployed as PWA on Netlify.

## Commands

- `pnpm dev` — Start Vite dev server
- `pnpm build` — TypeScript check + Vite build
- `pnpm lint` — ESLint
- `pnpm preview` — Preview production build

Package manager is **pnpm**.

## Branche `v2` — refonte complète (branche courante)

La V1 vit sur `main` et reste consultable côte à côte dans le worktree
`../fellowship-legacy` (`git worktree remove ../fellowship-legacy` pour l'enlever).

**Périmètre volontairement fermé** : la V2 n'intègre QUE l'écran maquetté
(tableau de bord) plus la connexion. On n'ajoute pas d'écran, pas de
fonctionnalité, pas de composant « au cas où ». Ce qui n'est pas sur la
maquette n'existe pas.

**Le design appartient à Uriel.** On n'améliore pas la maquette de sa propre
initiative : on l'intègre. Toute proposition graphique se discute avant, jamais
en la codant directement.

## Tech Stack

- **React 19** + **TypeScript 5.9** + **Vite 7**
- **CSS natif en trois couches** — pas de Tailwind, pas de CSS-in-JS, pas de
  classes utilitaires. Voir `docs/v2/DESIGN-SYSTEM.md`. Règle dure : **aucune
  valeur en dur dans `src/styles/3-components/`**, et aucun style dans les `.tsx`.
- **Supabase** pour l'auth (OTP e-mail) et les données. Schéma inchangé.
- **React Router v7**
- **lucide-react** pour les icônes (les mêmes que la maquette Figma)

## Architecture

```
src/
├── styles/            tout le design (3 couches — voir docs/v2/DESIGN-SYSTEM.md)
├── lib/               supabase.ts, auth.tsx, dates.ts (+ tests)
├── components/
│   ├── layout/        AppShell, Sidebar, Topbar
│   └── ui/            Button, Chip, Avatar
├── features/
│   └── dashboard/     Dashboard, SeasonChart, NextDateCard, UpcomingCard, useDashboard
├── pages/             Login
└── types/             supabase.ts (généré), database.ts (alias)
```

Alias `@` → `./src`.

Toute la logique de dates est isolée dans `src/lib/dates.ts` et couverte par
`src/lib/dates.test.ts` — les décalages de fuseau y sont des bugs surveillés,
ne pas contourner ces helpers.

## Environment Variables

Create a `.env` file with:
```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

## Deployment

Netlify with SPA fallback. Build command: `pnpm build`, publish dir: `dist`. Node 20.
