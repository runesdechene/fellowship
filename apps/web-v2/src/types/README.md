# types — les types de la base

- `supabase.ts` — **généré**, ne pas modifier à la main : `pnpm exec supabase gen types typescript --linked > apps/web-v2/src/types/supabase.ts`. Il date d'avant `event_threads` (dette : voir `docs/v2/README.md`).
- `database.ts` — les alias lisibles que les écrans importent, et `Actor`.
