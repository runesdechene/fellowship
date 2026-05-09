# Fellowship

> Gestionnaire d'événements pour professionnels — créateurs, artisans, exposants. PWA déployée sur Netlify, backend Supabase.

## Stack

- **React 19** + **TypeScript 5.9** (strict) + **Vite 7**
- **Tailwind CSS v4** (config CSS-first dans `src/index.css`, pas de `tailwind.config`)
- **Supabase** — auth (magic link OTP), Postgres + RLS, Storage
- **React Router v7**
- **PWA** via `vite-plugin-pwa` (Workbox)
- **shadcn/ui** pattern : `class-variance-authority` + `clsx` + `tailwind-merge`
- **Vitest** + React Testing Library pour les tests
- **pnpm** comme package manager

## Setup local

Prérequis : Node 20+ et pnpm 9+.

```bash
pnpm install
cp .env.example .env   # remplir les valeurs Supabase
pnpm dev
```

### Variables d'environnement

`.env` à la racine :

```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

## Commandes

| Commande | Action |
|---|---|
| `pnpm dev` | Vite dev server (HMR) |
| `pnpm build` | TypeScript check + build prod (`dist/`) |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest run |
| `pnpm test:watch` | Vitest watch mode |
| `pnpm preview` | Preview du build prod local |

## Architecture

```
src/
├── lib/
│   ├── supabase.ts      Client Supabase singleton
│   ├── auth.tsx         AuthContext + useAuth() (OTP magic link)
│   └── utils.ts         cn() helper Tailwind
├── components/
│   ├── ui/              Primitives shadcn-style (button, toast, ...)
│   ├── events/          EventCard, EventForm, EventDashboard, EventHero
│   ├── calendar/        Vues calendrier (year, month, mobile)
│   ├── notifications/   NotificationItem, panels, sidebars
│   ├── admin/           Hub admin (events, users, tags, reports)
│   └── ...              profile, layout, pwa, reviews, notes
├── hooks/               useEvents, useParticipations, useFollows, useAdmin, ...
├── pages/               Landing, Login, Dashboard, EventPage, Profile, Embed, ...
├── types/
│   ├── database.ts      Row types app
│   └── supabase.ts      Types générés (Supabase CLI)
└── version.ts           APP_VERSION exporté (synchronisé à package.json via Vite)

supabase/migrations/     23 migrations SQL (RLS, triggers, fuzzy search, ...)
docs/superpowers/        Specs + plans de design (frozen, history)
graphify-out/            Knowledge graph du projet (graph.json, GRAPH_REPORT.md, viz HTML)
```

Path alias : `@` → `./src` (configuré dans `vite.config.ts` et `tsconfig.app.json`).

## Knowledge graph (Graphify)

Le projet est mappé en graphe de connaissances persistant via [graphify](https://github.com/safishamsi/graphify) :

```bash
pip install graphifyy
/graphify --update .          # refresh incrémental après modifications
```

- `graphify-out/graph.json` — graphe NetworkX persistant (utile pour `--update` et queries)
- `graphify-out/GRAPH_REPORT.md` — audit communautés, god nodes, gaps
- `graphify-out/graph.html` — visualisation interactive (ouvrir dans le navigateur)

## Déploiement

Netlify avec SPA fallback. Build : `pnpm build`, publish : `dist/`, Node 20.
Variables d'env Supabase à définir dans le dashboard Netlify.

Headers de sécurité actifs dans `netlify.toml` :
- `Content-Security-Policy` strict (script-src 'self', frame-ancestors 'none' par défaut)
- `frame-ancestors *` uniquement sur la route `/*/embed` (le widget doit être iframable)
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` : caméra/micro/géoloc/cohort tous à off
- Cache immutable sur `/assets/*`, `*.js`, `*.css`

## CI

GitHub Actions sur PR + push `main` : lint → build (typecheck inclus) → test.
Voir `.github/workflows/ci.yml`.
