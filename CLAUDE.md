# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Tech Stack

- **React 19** + **TypeScript 5.9** + **Vite 7**
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin (no tailwind.config — uses CSS-first config in `src/index.css`)
- **Supabase** for auth (magic link OTP) and backend
- **React Router v7** for routing
- **PWA** via `vite-plugin-pwa` with workbox
- **shadcn/ui** pattern: `class-variance-authority` + `clsx` + `tailwind-merge` for component variants

## Architecture

- `src/lib/supabase.ts` — Supabase client singleton. Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `src/lib/auth.tsx` — AuthContext provider with `useAuth()` hook. Auth uses Supabase OTP (magic link)
- `src/components/ProtectedRoute.tsx` — Wraps routes requiring authentication
- `src/pages/` — Page components (Landing, Login, Dashboard)
- `src/components/ui/` — Reusable UI primitives (shadcn/ui style)
- `src/lib/utils.ts` — `cn()` helper for merging Tailwind classes

Path alias: `@` maps to `./src` (configured in vite.config.ts).

## Environment Variables

Create a `.env` file with:
```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

## Deployment

Netlify with SPA fallback. Build command: `pnpm build`, publish dir: `dist`. Node 20.
