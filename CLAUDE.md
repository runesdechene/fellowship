# Fellowship — monorepo

> pnpm workspaces · TypeScript strict · Supabase · Netlify
> L'état du projet, les décisions et la façon de travailler avec Uriel vivent dans le vault
> **Mon Cerveau** : lire le `CLAUDE.md` du vault, `1. LE MÉTIER/2. Fellowship/_État.md`, `Dev.md`
> et `_Socle/`. Ici, le code seulement.

## Où sont les choses

| Quoi                                                     | Où                                                        |
| -------------------------------------------------------- | --------------------------------------------------------- |
| V1 en production (`flw.sh`) — maintenance                | `apps/web/` — voir son `CLAUDE.md`                        |
| V2 en construction (`flw.sh/v2/`, admins seulement)      | `apps/web-v2/` — carnet : `docs/v2/`                      |
| Design system de la V2                                   | `docs/v2/DESIGN-SYSTEM.md`                                |
| Maquette de la V2 — **fait foi**                         | Figma, lien dans `apps/web-v2/README.md`                  |
| Base, migrations, fonctions                              | `supabase/`                                               |
| Pièges DB, workflow migrations                           | `docs/db/`                                                |
| Décisions produit historiques                            | `docs/decisions/`                                         |
| Specs et plans                                           | `docs/superpowers/specs/` · `plans/`                      |
| Pièges payés en prod, chargés selon les fichiers touchés | `.claude/rules/` — lire `deploiement.md` avant tout déploiement |

## Démarrage

1. `graphify-out/graph.json` absent → mauvais dépôt ou machine fraîche : **stop, demander**.
2. `git fetch` ; en retard → `git pull`, puis `graphify update .` (le hook ne tourne pas sur un pull).
3. Question d'architecture → `graphify-out/GRAPH_REPORT.md` d'abord.

## Chercher avant de lire

1. Lib externe (React, Supabase, React Router…) → **Context7**
2. Code local, RPC, table → **Graphify** (`graphify-out/graph.json`)
3. Fichier brut en dernier, lu partiellement.

Un nom de colonne ou une signature de RPC ne se devine jamais : graph, `docs/db/gotchas.md` ou
`information_schema`. Graphify se reconstruit seul au commit (hook `post-commit`).

## Règles

- **Le code est un chef-d'œuvre de simplicité** : simple, compréhensible, propre, épuré. L'outil
  standard avant le code maison. Si c'est compliqué à lire, c'est à réécrire. Détail :
  `.claude/rules/v2.md`.
- **Le périmètre de la V2 est la maquette Figma.** Ce qui n'y est pas n'existe pas. **Le design
  appartient à Uriel** : on intègre, on n'améliore pas d'office — toute proposition graphique se
  discute avant.
- **pnpm** uniquement. **TS strict** : pas de `any`, `@ts-ignore`, `as unknown as`.
- **Conventional Commits**, en français.
- **Migrations** horodatées (`supabase/migrations/<horodatage>_<nom>.sql`), canal unique
  `node_modules/supabase/bin/supabase.exe db push --linked` (`pnpm exec supabase` ne marche pas ici : `.claude/rules/supabase.md`), jamais `apply_migration` du MCP (hook). Je les applique
  moi-même, puis je vérifie en prod. En tête : le POURQUOI. Tout `CREATE OR REPLACE` part de la
  définition **live** copiée entière. La base est la **production**. Détail : `docs/db/`.
- **Architecture existante d'abord** : helpers (`lib/`), RPC et composants en place avant d'en
  créer — chercher dans le graphe et `docs/db/gotchas.md`. Source canonique, jamais une
  approximation qui « ressemble ».
- **Toute requête dont on prend « le premier résultat » est triée** : sans tri, l'ordre est celui
  que Postgres veut ce jour-là.
- **Code mort croisé = supprimé dans le même commit.** Une rustine signale une cause racine.
- **Netlify manuel**, jamais d'auto-deploy Git (`stop_builds: true`).
- Pas de `console.log` laissé.

## Livrer

- Front modifié → `pnpm dev` (V1) et `pnpm dev:v2` (V2), le parcours testé dans le navigateur,
  puis le build de l'app concernée.
- Commit à chaque étape qui marche ; push par lots, **toujours en fin de session**.
- Déploiement manuel, quand un lot est prêt : `.claude/rules/deploiement.md`.
- Fin de session : une décision → `_État.md` du vault ; un piège → `.claude/rules/`. Rien d'autre.

## Nouvelle machine

`.env` racine (gitignoré, sauvegardé à part) → `pnpm install` → `pip install graphifyy` →
`graphify update .` → `graphify hook install`.
