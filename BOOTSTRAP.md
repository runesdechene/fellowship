# Bootstrap — Fellowship sur une nouvelle machine

Guide minimal pour cloner Fellowship et retrouver un environnement de dev complet (build, test, Supabase, Graphify, Claude Code).

---

## 1. Prérequis système

| Outil | Version | Notes |
|---|---|---|
| **Node.js** | 20+ | `nvm install 20` ou installeur officiel |
| **pnpm** | 9+ | `npm i -g pnpm` |
| **Git** | 2.40+ | — |
| **Python** | 3.10+ | requis pour Graphify (`pip` dispo) |
| **Supabase CLI** | 2.88+ | installé en devDep du projet (voir étape 4) |
| **Claude Code** | dernière | CLI Anthropic — `npm i -g @anthropic-ai/claude-code` |

---

## 2. Cloner + installer les deps

```bash
git clone https://github.com/runesdechene/fellowship.git
cd fellowship
pnpm install
```

`pnpm install` exécute automatiquement les hooks de Husky/lifecycle si présents. La build dependency `supabase` est marquée `ignoredBuiltDependencies` (pas de script natif au install).

---

## 3. Variables d'environnement

Créer `.env` à la racine (le fichier est gitignored) :

```env
VITE_SUPABASE_URL=https://trbxpsknbtisqwefqoub.supabase.co
VITE_SUPABASE_ANON_KEY=<récupérer depuis https://supabase.com/dashboard/project/trbxpsknbtisqwefqoub/settings/api>
```

**Projet Supabase :** `trbxpsknbtisqwefqoub` (fellowship-app)

> ⚠️ Ne JAMAIS commiter `.env`. Si on a besoin de la `service_role` key (jamais côté client), la garder localement uniquement.

---

## 4. Supabase (optionnel selon le besoin)

Le binaire est installé en devDep, mais sur Windows `pnpm exec` ne marche pas — appeler directement :

```bash
# Windows
./node_modules/supabase/bin/supabase.exe --version

# macOS / Linux
./node_modules/.bin/supabase --version
```

Lier au projet remote (une seule fois par machine) :

```bash
supabase login                          # ouvre le navigateur
supabase link --project-ref trbxpsknbtisqwefqoub
```

Migrations dispo dans `supabase/migrations/` — `supabase db push` pour pousser. Types DB régénérés via :

```bash
supabase gen types typescript --project-id trbxpsknbtisqwefqoub > src/types/supabase.ts
```

---

## 5. Graphify (knowledge graph du projet)

Le graphe persistant est commité dans `graphify-out/` (graph.json, GRAPH_REPORT.md, cache LLM). Pour pouvoir le requêter / le maintenir :

```bash
pip install graphifyy
graphify --version

# Installer le hook post-commit (par machine, hooks non versionnés)
graphify hook install
```

Après ça, chaque `git commit` qui touche du code source ré-extrait l'AST automatiquement (gratuit, déterministe). Pour les changements de docs/images, lancer manuellement :

```bash
graphify --update .
```

Depuis Claude Code, la skill `/graphify` est dispo (queries BFS, shortest-path entre concepts, etc.).

---

## 6. Vérifier que tout marche

```bash
pnpm dev          # http://localhost:5173
pnpm build        # tsc -b + vite build (doit passer 0 erreur)
pnpm lint         # ESLint
pnpm test         # Vitest run
```

Si la build PWA râle au premier run sur Windows à propos des permissions de `sharp`, c'est attendu — `pnpm rebuild sharp` règle le souci.

---

## 7. Claude Code (optionnel mais recommandé)

Le projet utilise les superpowers et une mémoire persistante locale.

- **CLAUDE.md** (à la racine) : versionné, instructions projet
- **`~/.claude/CLAUDE.md`** : tes préférences globales (auto-commit, French, etc.) — **à recréer ou copier depuis l'autre machine** (non versionné, par design)
- **Auto-memory** : `~/.claude/projects/C--Users-<user>-Desktop-DEVs-fellowship/memory/MEMORY.md` (Windows) ou équivalent. Stocke le contexte cross-session (profil user, vision produit, feedback). **Pas synchronisée automatiquement** — soit la recopier depuis l'ancienne machine, soit laisser Claude la reconstruire au fil des sessions.

Lancement :

```bash
claude              # dans le répertoire du projet
```

---

## 8. Déploiement (Netlify)

Aucune action requise pour la dev locale. Netlify rebuilde sur push `main` :

- Build : `pnpm build`
- Publish dir : `dist`
- Node : 20
- Env vars (à set côté Netlify dashboard) : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

Site config dans `netlify.toml` (SPA fallback, headers CSP stricts, cache immutable assets).

---

## 9. Sanity-check final

```bash
git status                       # propre (sauf deltas graphify-out/cache éventuels)
git log -1 --oneline             # = HEAD remote
node --version                   # >= 20
pnpm --version                   # >= 9
pip show graphifyy               # installé
ls .env                          # existe et rempli
```

Si les 5 commandes répondent OK → ready to ship.

---

## Liens utiles

- Repo : https://github.com/runesdechene/fellowship
- Supabase dashboard : https://supabase.com/dashboard/project/trbxpsknbtisqwefqoub
- Graphify : https://github.com/safishamsi/graphify
- Spec V1 : `docs/superpowers/specs/2026-04-04-fellowship-v1-design.md`
- Plan V1 : `docs/superpowers/plans/2026-04-04-fellowship-v1.md`
