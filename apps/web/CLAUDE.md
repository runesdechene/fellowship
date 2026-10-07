# web — la V1 de Fellowship

> Servie sur `flw.sh`. **En maintenance : on y corrige, on n'y construit plus** — le neuf va dans
> `apps/web-v2`. Règles générales : `CLAUDE.md` racine.

## Commandes (depuis la racine du dépôt)

| Commande                   | Effet                                         |
| -------------------------- | --------------------------------------------- |
| `pnpm dev`                 | serveur local sur http://localhost:5173       |
| `pnpm build`               | typecheck + build dans `apps/web/dist`        |
| `pnpm --filter web test`   | tests                                         |
| `pnpm --filter web lint`   | ESLint                                        |

## Pile

- React 19 + TypeScript 5.9 + Vite 7.
- **Tailwind CSS v4** via `@tailwindcss/vite` (pas de `tailwind.config` : config CSS dans
  `src/index.css`) ; variantes à la shadcn/ui (`class-variance-authority` + `clsx` +
  `tailwind-merge`, helper `cn()` dans `src/lib/utils.ts`).
- Supabase (auth par code OTP) ; React Router v7.
- **PWA** via `vite-plugin-pwa` (workbox). Le service worker **ignore `/v2`** : sans cette
  exclusion, il servirait la V1 à la place de la V2 (`vite.config.ts`).

## Où sont les choses

- `src/lib/supabase.ts` — le client ; `src/lib/auth.tsx` — `useAuth()`.
- `src/pages/` — les pages ; `src/components/ui/` — les primitives.
- Alias `@` → `./src`.

## Environnement

Le `.env` vit à la racine du monorepo (`envDir` dans `vite.config.ts`) :
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Déploiement

Site Netlify `fellowship-app`, **manuel**, depuis ce dossier : `.claude/rules/deploiement.md`.
`netlify.toml` porte la redirection `/v2/*` vers le site de la V2.
