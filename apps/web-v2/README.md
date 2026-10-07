# web-v2 — l'app Fellowship, V2

Front neuf, écrit de zéro sur la maquette Parchemin, servi sous `flw.sh/v2/`. Même base Supabase
que la V1 (`apps/web`), qu'elle remplacera. Réservé aux admins (`is_admin()`) pendant la
construction : un autre compte retourne sur la V1.

- **Maquette Figma — fait foi** :
  https://www.figma.com/design/9CmmBD3t5rAk4tD583cdN3/FELLOWSHIP?node-id=0-1
- Fondation : `docs/superpowers/specs/2026-10-07-methode-monorepo-v2-design.md`.
- Le design, et comment le changer : `docs/v2/DESIGN-SYSTEM.md`.
- Pourquoi c'est construit ainsi, points ouverts, purge du back : `docs/v2/`.
- Règles de construction : `.claude/rules/v2.md`.

## Commandes (depuis la racine du dépôt)

| Commande                      | Effet                                       |
| ----------------------------- | ------------------------------------------- |
| `pnpm dev:v2`                 | serveur local sur http://localhost:5174/v2/ |
| `pnpm --filter web-v2 test`   | tests                                       |
| `pnpm --filter web-v2 lint`   | ESLint, stylelint, prettier, en-têtes       |
| `pnpm --filter web-v2 format` | remet la mise en forme d'aplomb (prettier)  |
| `pnpm build:v2`               | build de production dans `apps/web-v2/dist` |

## Tester en local avec une session

La V2 lit la session de la V1 (même origine). En local :

1. `pnpm dev` (V1, port 5173) **et** `pnpm dev:v2` (V2, port 5174) ;
2. ouvrir **http://localhost:5174/** — c'est la V1, servie par le proxy de la V2 — et se
   connecter avec le code reçu par e-mail ;
3. ouvrir **http://localhost:5174/v2/** : même origine, même session.

## Où sont les choses

| Dossier                  | Contenu                                                             |
| ------------------------ | ------------------------------------------------------------------- |
| `src/styles/`            | tout le design, en trois couches (aucun style dans les `.tsx`)      |
| `src/components/layout/` | le châssis : AppShell, Sidebar, Topbar, AccountSwitcher, PosterWall |
| `src/components/ui/`     | les briques : Button, Chip, Avatar, Field, Select, Tag…             |
| `src/features/<écran>/`  | un dossier par écran, avec son hook (`useDashboard`, `useEvent`…)   |
| `src/pages/`             | les pages hors coquille (Login)                                     |
| `src/lib/`               | la logique sans React (dates, montants, accès…) et ses tests        |
| `src/types/`             | les types de la base (`supabase.ts` généré, `database.ts`)          |

## Déploiement

Site Netlify `fellowship-web-v2`, **manuel**, depuis ce dossier : `.claude/rules/deploiement.md`.
Pas de PWA côté V2.
