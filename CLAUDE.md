# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
