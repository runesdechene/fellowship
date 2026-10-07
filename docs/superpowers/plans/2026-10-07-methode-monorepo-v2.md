# La méthode de Runes de Chêne, et la V2 en monorepo — plan d'exécution

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Fellowship devient un monorepo sur `main`, avec la V1 dans `apps/web` (flw.sh) et la V2 dans `apps/web-v2` (flw.sh/v2/, réservée aux admins), un déploiement Netlify manuel, et la couche Claude de l'app Runes de Chêne.

**Architecture :** Tout se fait sur la branche `v2`, qui contient déjà `origin/main`. Le code V2 est déplacé avec `git mv`, la V1 est restaurée à l'identique depuis `origin/main`, et un workspace pnpm relie les deux. `main` avance ensuite en fast-forward. Le modèle à copier est `../app (Runes de Chêne)/`.

**Tech Stack :** pnpm workspaces · React 19 · Vite 7 · Vitest 4 · Supabase · Netlify CLI · Graphify.

**Spec :** `docs/superpowers/specs/2026-10-07-methode-monorepo-v2-design.md`

## Global Constraints

- Les builds automatiques Netlify sont coupés **avant tout push** (`stop_builds: true`).
- La V1 tourne à l'identique de la prod (`origin/main`, v0.7.398). Seules trois choses changent : `envDir`, l'exclusion `/v2` du service worker et la redirection `/v2/*`. Elle passe en version 0.7.399.
- Rien de la V1 n'entre dans la V2 : aucun import, aucun copier-coller.
- Aucune valeur en dur dans `apps/web-v2/src/styles/3-components/`, et aucun style dans les `.tsx` de la V2.
- Migrations : aucune dans ce plan. `apply_migration` du MCP est interdit (hook).
- Noms des paquets : `web` (V1) et `web-v2` (V2). Ports de dev : V1 sur 5173, V2 sur 5174.
- Sites Netlify : `fellowship-app` (V1, flw.sh, id `8c479753-ecff-4c88-8069-2b25e7514925`) et `fellowship-web-v2` (nouveau).
- Messages de commit en Conventional Commits, en français, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Push en fin de lot, déploiement manuel seulement à la tâche 9.

## Review Focus

1. **Un navigateur qui a déjà la V1 installée (service worker actif) ouvre `/v2/`** : il doit recevoir la V2, pas le shell de la V1. Testé en tâche 3 (`dist/sw.js` contient la denylist) et en tâche 8 (en prod).
2. **Un compte connecté non admin ouvre `/v2/`** : il est renvoyé sur la V1, sans boucle. Testé en tâche 4 (`decideAccess`, `toAccessState`) puis en tâche 8.
3. **Les dépendances de la V1 dérivent pendant la régénération du lockfile** : la V1 serait alors différente de la prod sans qu'on le voie. Testé en tâche 2 (liste des versions comparée à la référence).
4. **Un chemin absolu vers `public/` dans la V2** (`/icon.png`) : sous `/v2/`, il charge en silence le fichier de la V1. Testé en tâche 3 (grep à zéro résultat).
5. **Une erreur réseau pendant la vérification d'accès** : l'écran ne doit pas rester blanc indéfiniment. Testé en tâche 4 (`error` → `leave`).

---

### Task 1 : Couper l'auto-deploy Netlify

**Files :** aucun (réglage du site Netlify).

- [ ] **Step 1 : Relever l'état actuel**

Run :
```bash
netlify api getSite --data '{"site_id":"8c479753-ecff-4c88-8069-2b25e7514925"}' | grep -E '"(stop_builds|repo_branch|base)"'
```
Expected : `"stop_builds": false`, `"repo_branch": "main"`, `"base": ""`.

- [ ] **Step 2 : Couper les builds et pointer la base sur `apps/web`**

Run :
```bash
netlify api updateSite --data '{"site_id":"8c479753-ecff-4c88-8069-2b25e7514925","body":{"build_settings":{"stop_builds":true,"base":"apps/web"}}}' | grep -E '"(stop_builds|base)"'
```
Expected : `"stop_builds": true`, `"base": "apps/web"`.

- [ ] **Step 3 : Relire la cible**

Relancer la commande du Step 1. Expected : `"stop_builds": true`. Ne pas passer à la suite tant que ce n'est pas lu.

---

### Task 2 : Le monorepo — déplacer la V2, restaurer la V1, monter le workspace

**Files :**
- Move : `src/ public/ index.html vite.config.ts vitest.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json eslint.config.js package.json` → `apps/web-v2/`
- Create (depuis `origin/main`) : `apps/web/{src,public}/`, `apps/web/{index.html,vite.config.ts,vitest.config.ts,tsconfig.json,tsconfig.app.json,tsconfig.node.json,eslint.config.js,package.json,netlify.toml}`
- Delete : `netlify.toml` (racine), `pnpm-lock.yaml` (racine, regénéré)
- Create : `package.json` (racine), `pnpm-workspace.yaml`
- Modify : `.github/workflows/ci.yml`

**Interfaces :**
- Produces : paquets `web` et `web-v2` ; scripts racine `dev`, `dev:v2`, `build`, `build:v2`, `test`, `lint`.

- [ ] **Step 1 : Relever la référence des dépendances de la V1 (la prod)**

Run :
```bash
git worktree add ../fellowship-ref origin/main
cd ../fellowship-ref && pnpm install --frozen-lockfile && pnpm list --depth 0 > "$SCRATCH/v1-deps-ref.txt"; cd -
```
(`$SCRATCH` = le dossier scratchpad de la session.) Expected : le fichier liste ~50 dépendances, avec `react 19.x` et `vite 7.x`.

- [ ] **Step 2 : Déplacer la V2**

```bash
mkdir -p apps/web-v2
git mv src public index.html vite.config.ts vitest.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json eslint.config.js package.json apps/web-v2/
git rm -q netlify.toml pnpm-lock.yaml
```

- [ ] **Step 3 : Restaurer la V1 depuis la prod**

```bash
git read-tree --prefix=apps/web/src/ -u origin/main:src
git read-tree --prefix=apps/web/public/ -u origin/main:public
for f in index.html vite.config.ts vitest.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json eslint.config.js package.json netlify.toml; do git show origin/main:$f > apps/web/$f; done
git add apps/web
git diff --cached --stat origin/main -- apps/web | tail -1
```
Vérifier : `git diff origin/main:src HEAD:apps/web/src` est vide une fois commité (contrôle au Step 9).

- [ ] **Step 4 : Renommer les paquets et déplacer les outils de dépôt à la racine**

Dans `apps/web/package.json` : `"name": "web"`. Retirer de `devDependencies` : `pg`, `playwright-core`, `sharp`, `sharp-cli`, `supabase`. Retirer le bloc `pnpm` (il remonte à la racine). Avant de retirer, vérifier qu'aucun fichier de `apps/web/src` ne les importe :
```bash
grep -rlE "from ['\"](pg|playwright-core|sharp)['\"]" apps/web/src || echo "aucun import"
```
Expected : `aucun import`.

Dans `apps/web-v2/package.json` : `"name": "web-v2"`. Retirer `supabase` des `devDependencies`, et `packageManager`.

- [ ] **Step 5 : Écrire le workspace racine**

`pnpm-workspace.yaml` :
```yaml
packages:
  - 'apps/*'
```

`package.json` (racine). Remplacer `<PNPM>` par la sortie de `pnpm -v` :
```json
{
  "name": "fellowship",
  "private": true,
  "packageManager": "pnpm@<PNPM>",
  "scripts": {
    "dev": "pnpm --filter web dev",
    "dev:v2": "pnpm --filter web-v2 dev",
    "build": "pnpm --filter web build",
    "build:v2": "pnpm --filter web-v2 build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint"
  },
  "devDependencies": {
    "@supabase/supabase-js": "^2.86.0",
    "playwright-core": "^1.60.0",
    "sharp": "^0.34.5",
    "supabase": "^2.88.1"
  },
  "pnpm": {
    "onlyBuiltDependencies": ["esbuild", "sharp"],
    "ignoredBuiltDependencies": ["supabase"]
  }
}
```
Pourquoi ces dépendances : `scripts/` et `print/` restent à la racine et importent `@supabase/supabase-js`, `sharp` et `playwright-core`. Le CLI `supabase` sert à `supabase/`.

- [ ] **Step 6 : Installer et comparer les dépendances de la V1**

```bash
pnpm install
pnpm --filter web list --depth 0 > "$SCRATCH/v1-deps-new.txt"
diff <(grep -E '^[a-z@]' "$SCRATCH/v1-deps-ref.txt" | sort) <(grep -E '^[a-z@]' "$SCRATCH/v1-deps-new.txt" | sort)
```
Expected : seules les cinq dépendances retirées au Step 4 apparaissent dans le diff. Toute autre version qui bouge est épinglée en exact dans `apps/web/package.json` (la version de la référence), puis on relance `pnpm install` et ce step.

- [ ] **Step 7 : Lancer les deux apps en build et en test**

```bash
pnpm --filter web build && pnpm --filter web test && pnpm --filter web lint
pnpm --filter web-v2 build && pnpm --filter web-v2 test && pnpm --filter web-v2 lint
```
Expected : tout passe. Les deux `.env` sont encore lus depuis chaque dossier d'app : si le build réclame les variables Supabase, copier temporairement `.env` dans `apps/web/` et `apps/web-v2/` (la tâche 4 règle ça avec `envDir`).

Si un build échoue sur la résolution des types React (deux versions de `@types/react`), **s'arrêter et remonter** : c'est le piège connu de RdC (`.claude/rules/v2.md` de RdC, section « Deux versions de @types/react »). Ne pas bricoler les configs plus de deux fois.

- [ ] **Step 8 : Adapter la CI**

`.github/workflows/ci.yml` : retirer `with: version: 9` de `pnpm/action-setup` (la version vient de `packageManager`), et remplacer les étapes Lint/Build/Test par :
```yaml
      - name: Lint
        run: pnpm -r lint

      - name: Build V1
        run: pnpm --filter web build
        env:
          VITE_SUPABASE_URL: https://ci.local.invalid
          VITE_SUPABASE_ANON_KEY: ci-placeholder

      - name: Build V2
        run: pnpm --filter web-v2 build
        env:
          VITE_SUPABASE_URL: https://ci.local.invalid
          VITE_SUPABASE_ANON_KEY: ci-placeholder

      - name: Test
        run: pnpm -r test
```

- [ ] **Step 9 : Commit**

```bash
git add -A apps package.json pnpm-workspace.yaml pnpm-lock.yaml .github
git commit -m "refactor(repo): monorepo — la V1 dans apps/web, la V2 dans apps/web-v2"
git diff origin/main:src HEAD:apps/web/src --stat | tail -1
```
Expected pour la dernière commande : aucune sortie (la V1 est identique à la prod).

---

### Task 3 : `.env` partagé, et `/v2/` des deux côtés

**Files :**
- Modify : `apps/web/vite.config.ts`, `apps/web/vitest.config.ts`, `apps/web/netlify.toml`, `apps/web/package.json` (version)
- Modify : `apps/web-v2/vite.config.ts`, `apps/web-v2/vitest.config.ts`, `apps/web-v2/src/main.tsx`, `apps/web-v2/src/components/layout/Sidebar.tsx:45`, `apps/web-v2/src/pages/Login.tsx:44`, `apps/web-v2/package.json` (version)
- Create : `apps/web-v2/netlify.toml`

- [ ] **Step 1 : La V1 lit le `.env` racine, son service worker ignore `/v2`**

`apps/web/vite.config.ts` : ajouter `envDir: path.resolve(__dirname, '../..'),` dans `defineConfig({...})`, et remplacer la denylist Workbox par :
```ts
        //  - /v2 : la V2, servie par son propre site sous la même origine. Sans cette
        //    exclusion, ce service worker répondrait par le shell de la V1.
        navigateFallbackDenylist: [/\/embed(?:$|\?)/, /\/e\//, /\/evenement\//, /^\/v2(\/|$)/],
```
`apps/web/vitest.config.ts` : rien (les tests n'ont pas besoin du `.env`).

`apps/web/netlify.toml` : ajouter, **avant** le bloc `# SPA fallback` (Netlify applique la première redirection qui correspond) :
```toml
# V2 en construction (apps/web-v2) : même origine que la V1, donc même session.
# Le site V2 publie dist/ à sa racine avec base /v2/ — la redirection retire /v2.
# ATTENTION — pas de règle « /v2 → /v2/ » : chez RdC elle bouclait (30/09/2026).
# /v2/* couvre /v2 et /v2/.
[[redirects]]
  from = "/v2/*"
  to = "https://fellowship-web-v2.netlify.app/:splat"
  status = 200
  force = true
```
`apps/web/package.json` : `"version": "0.7.399"`.

- [ ] **Step 2 : La V2 vit sous `/v2/`**

`apps/web-v2/vite.config.ts` devient :
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// Fellowship V2 — pas de Tailwind, pas de PWA : uniquement React + CSS natif.
// Toute la mise en forme vit dans src/styles/ (voir docs/v2/DESIGN-SYSTEM.md).
// Servie sous /v2/ : `base` préfixe tous les fichiers générés. En dev, le proxy sert la V1
// sur le même port : lancer `pnpm dev` ET `pnpm dev:v2`, puis tout ouvrir sur :5174.
export default defineConfig({
  base: '/v2/',
  envDir: path.resolve(__dirname, '../..'),
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '^/(?!v2(/|$)).*': { target: 'http://localhost:5173', ws: true },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```
`apps/web-v2/src/main.tsx` : `<BrowserRouter basename="/v2">`.

`Sidebar.tsx:45` : `src={`${import.meta.env.BASE_URL}icon.png`}`. `Login.tsx:44` : `src={`${import.meta.env.BASE_URL}logo.png`}`.

`apps/web-v2/netlify.toml` :
```toml
# Site fellowship-web-v2 — joint par la V1 via la redirection /v2/* (apps/web/netlify.toml).
# Il sert dist/ à sa racine ; tout chemin inconnu revient à index.html (le routeur décide).
[build]
  command = "pnpm build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```
`apps/web-v2/package.json` : `"version": "2.19.0"`.

- [ ] **Step 3 : Vérifier qu'aucun chemin absolu vers `public/` ne reste dans la V2**

Run :
```bash
grep -rnE "['\"\`(]/(icon|logo|favicon|apple|pwa|maquettes)[^'\"]*" apps/web-v2/src
```
Expected : aucune sortie.

- [ ] **Step 4 : Vérifier les builds**

```bash
rm -f apps/web/.env apps/web-v2/.env
pnpm build && pnpm build:v2
grep -c 'v2' apps/web/dist/sw.js
grep -o 'src="/v2/assets/[^"]*"' apps/web-v2/dist/index.html
```
Expected : les deux builds passent sans copie locale du `.env`. `sw.js` contient la denylist (compte ≥ 1). `index.html` de la V2 pointe sur `/v2/assets/…`.

- [ ] **Step 5 : Vérifier en local, dans le navigateur**

Lancer `pnpm dev` et `pnpm dev:v2` (en arrière-plan). Ouvrir `http://localhost:5174/` : c'est la V1 (proxy). Se connecter avec le code reçu par e-mail. Ouvrir `http://localhost:5174/v2/` : le tableau de bord V2 s'affiche **sans nouvelle connexion**, avec le logo et l'icône. Lire la console : aucune erreur.

- [ ] **Step 6 : Commit**

```bash
git add apps
git commit -m "feat(v2): servie sous /v2/, meme origine et meme session que la V1"
```

---

### Task 4 : L'accès réservé aux admins

**Files :**
- Create : `apps/web-v2/src/lib/access.ts`, `apps/web-v2/src/lib/access.test.ts`, `apps/web-v2/src/lib/useV2Access.ts`
- Modify : `apps/web-v2/src/App.tsx` (`ProtectedRoute`)

**Interfaces :**
- Produces :
  - `type AccessCheck = 'pending' | 'allowed' | 'refused' | 'error'`
  - `type AccessState = { status: 'loading' } | { status: 'ready'; hasSession: boolean; hasAccess: boolean } | { status: 'error' }`
  - `toAccessState(input: { authLoading: boolean; hasUser: boolean; check: AccessCheck }): AccessState`
  - `type AccessDecision = 'wait' | 'allow' | 'login' | 'leave'`
  - `decideAccess(state: AccessState): AccessDecision`
  - `useV2Access(): AccessDecision`

- [ ] **Step 1 : Vérifier que `is_admin()` est appelable par un compte connecté**

Via le MCP Supabase `execute_sql` (lecture seule) :
```sql
select has_function_privilege('authenticated', 'public.is_admin()', 'execute') as appelable,
       prosecdef as security_definer
from pg_proc where proname = 'is_admin';
```
Expected : `appelable = true`, `security_definer = true`. Sinon, **s'arrêter et remonter** : il faudrait une migration, hors de ce plan.

- [ ] **Step 2 : Écrire le test qui échoue**

`apps/web-v2/src/lib/access.test.ts` :
```ts
import { decideAccess, toAccessState } from './access'

describe('toAccessState', () => {
  it('attend tant que la session se lit', () => {
    expect(toAccessState({ authLoading: true, hasUser: false, check: 'pending' })).toEqual({ status: 'loading' })
  })
  it('sans compte, ne demande rien à la base', () => {
    expect(toAccessState({ authLoading: false, hasUser: false, check: 'pending' })).toEqual({
      status: 'ready', hasSession: false, hasAccess: false,
    })
  })
  it('attend la réponse de la base pour un compte connecté', () => {
    expect(toAccessState({ authLoading: false, hasUser: true, check: 'pending' })).toEqual({ status: 'loading' })
  })
  it('traduit la réponse de la base', () => {
    expect(toAccessState({ authLoading: false, hasUser: true, check: 'allowed' })).toEqual({
      status: 'ready', hasSession: true, hasAccess: true,
    })
    expect(toAccessState({ authLoading: false, hasUser: true, check: 'refused' })).toEqual({
      status: 'ready', hasSession: true, hasAccess: false,
    })
    expect(toAccessState({ authLoading: false, hasUser: true, check: 'error' })).toEqual({ status: 'error' })
  })
})

describe('decideAccess', () => {
  it('attend pendant le chargement', () => {
    expect(decideAccess({ status: 'loading' })).toBe('wait')
  })
  it('envoie un visiteur sans session vers la connexion de la V2', () => {
    expect(decideAccess({ status: 'ready', hasSession: false, hasAccess: false })).toBe('login')
  })
  it('ouvre la V2 à un admin', () => {
    expect(decideAccess({ status: 'ready', hasSession: true, hasAccess: true })).toBe('allow')
  })
  it('renvoie un compte non admin vers la V1', () => {
    expect(decideAccess({ status: 'ready', hasSession: true, hasAccess: false })).toBe('leave')
  })
  it('renvoie vers la V1 si la vérification échoue, plutôt qu’un écran blanc', () => {
    expect(decideAccess({ status: 'error' })).toBe('leave')
  })
})
```

- [ ] **Step 3 : Vérifier qu'il échoue**

Run : `pnpm --filter web-v2 exec vitest run src/lib/access.test.ts`
Expected : FAIL, `Failed to resolve import "./access"`.

- [ ] **Step 4 : Écrire `access.ts`**

```ts
/**
 * QUOI     — décide, à partir de la session et de la réponse de la base, si la V2 s'ouvre.
 * POURQUOI — la V2 se construit sous les yeux des seuls admins (is_admin(), déjà en base).
 *            Fonctions pures : toute la garde se lit et se teste ici, sans navigateur.
 * ATTENTION — une erreur de vérification renvoie vers la V1 : pendant la construction, mieux
 *            vaut un admin qui recharge qu'un écran blanc. Pas de PWA côté V2, donc pas
 *            d'usage hors ligne à protéger.
 */
export type AccessCheck = 'pending' | 'allowed' | 'refused' | 'error'

export type AccessState =
  | { status: 'loading' }
  | { status: 'ready'; hasSession: boolean; hasAccess: boolean }
  | { status: 'error' }

export type AccessDecision = 'wait' | 'allow' | 'login' | 'leave'

export function toAccessState(input: {
  authLoading: boolean
  hasUser: boolean
  check: AccessCheck
}): AccessState {
  if (input.authLoading) return { status: 'loading' }
  if (!input.hasUser) return { status: 'ready', hasSession: false, hasAccess: false }
  switch (input.check) {
    case 'pending':
      return { status: 'loading' }
    case 'error':
      return { status: 'error' }
    case 'allowed':
      return { status: 'ready', hasSession: true, hasAccess: true }
    case 'refused':
      return { status: 'ready', hasSession: true, hasAccess: false }
  }
}

export function decideAccess(state: AccessState): AccessDecision {
  switch (state.status) {
    case 'loading':
      return 'wait'
    case 'error':
      return 'leave'
    case 'ready':
      if (!state.hasSession) return 'login'
      return state.hasAccess ? 'allow' : 'leave'
  }
}
```

- [ ] **Step 5 : Vérifier que le test passe**

Run : `pnpm --filter web-v2 exec vitest run src/lib/access.test.ts`
Expected : PASS (9 tests).

- [ ] **Step 6 : Écrire le hook `useV2Access.ts`**

```ts
/**
 * QUOI     — demande à la base si le compte connecté peut ouvrir la V2.
 * POURQUOI — la coquille mince autour de access.ts : elle lit la session (useAuth), appelle
 *            is_admin() une fois par compte, et rend la décision.
 * ATTENTION — la réponse est rattachée à l'id du compte : changer de compte relance la
 *            vérification au lieu de réutiliser celle du précédent.
 */
import { useEffect, useState } from 'react'
import { useAuth } from './auth'
import { supabase } from './supabase'
import { decideAccess, toAccessState, type AccessCheck, type AccessDecision } from './access'

export function useV2Access(): AccessDecision {
  const { user, loading } = useAuth()
  const [answer, setAnswer] = useState<{ userId: string; check: AccessCheck } | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    void supabase.rpc('is_admin').then(({ data, error }) => {
      if (cancelled) return
      setAnswer({ userId: user.id, check: error ? 'error' : data ? 'allowed' : 'refused' })
    })
    return () => {
      cancelled = true
    }
  }, [user])

  const check = user && answer?.userId === user.id ? answer.check : 'pending'
  return decideAccess(toAccessState({ authLoading: loading, hasUser: Boolean(user), check }))
}
```

- [ ] **Step 7 : Brancher la garde dans `App.tsx`**

Remplacer `ProtectedRoute` par :
```tsx
function ProtectedRoute({ children }: { children: ReactNode }) {
  const decision = useV2Access()
  if (decision === 'wait') return null
  if (decision === 'login') return <Navigate to="/connexion" replace />
  if (decision === 'leave') return <LeaveToV1 />
  return <>{children}</>
}

// Hors du routeur de la V2 (basename /v2) : la V1 vit à la racine du domaine.
function LeaveToV1() {
  useEffect(() => {
    window.location.replace('/')
  }, [])
  return null
}
```
Imports : `useEffect` depuis `react`, `useV2Access` depuis `@/lib/useV2Access`.

- [ ] **Step 8 : Vérifier**

```bash
pnpm --filter web-v2 test && pnpm --filter web-v2 build && pnpm --filter web-v2 lint
```
Puis, en local (comme en tâche 3, Step 5) : avec ton compte admin, `/v2/` s'ouvre.

Pour le refus, poser temporairement `return 'leave'` en tête de `decideAccess` (sans le commiter) : `/v2/` doit renvoyer sur `/` sans boucle. Retirer la ligne ensuite.

- [ ] **Step 9 : Commit**

```bash
git add apps/web-v2/src
git commit -m "feat(v2): la V2 ne s'ouvre qu'aux admins, les autres retournent a la V1"
```

---

### Task 5 : La couche Claude

**Files :**
- Create : `.claude/settings.json`, `.claude/rules/v2.md`, `apps/web/CLAUDE.md`, `apps/web-v2/README.md`
- Rewrite : `CLAUDE.md`
- Modify : `.claude/settings.local.json`, `.claude/rules/workflow.md`, `.claude/rules/{supabase,interface,dev,deploiement}.md`, `docs/v2/DESIGN-SYSTEM.md`, `README.md`

- [ ] **Step 1 : `.claude/settings.json`**

Copier `../app (Runes de Chêne)/.claude/settings.json` à l'identique, avec deux ajustements :
- dans le message du hook `apply_migration`, remplacer `supabase/migrations/NNN_*.sql` par `supabase/migrations/<horodatage>_<nom>.sql` (Fellowship nomme ses migrations par horodatage) ;
- remplacer `npx supabase` par `pnpm exec supabase`, et retirer la référence à `docs/db/migrations-workflow.md` si ce fichier n'existe pas dans `docs/db/` (`ls docs/db`).

Garder `"autoMemoryEnabled": false`.

- [ ] **Step 2 : Nettoyer `.claude/settings.local.json`**

Retirer `"mcp__plugin_supabase_supabase__apply_migration"` de `allow`, et retirer le bloc `"enabledMcpjsonServers": ["xo"]`.

- [ ] **Step 3 : Réécrire `CLAUDE.md` à la racine**

Il suit le plan de `../app (Runes de Chêne)/CLAUDE.md`, section par section, et ne dépasse pas une page et demie :
- **En-tête** : « Fellowship — monorepo » ; pnpm workspaces · TypeScript strict · Supabase · Netlify. L'état du projet, les décisions et la façon de travailler vivent dans le vault **Mon Cerveau** : lire son `CLAUDE.md`, `1. LE MÉTIER/2. Fellowship/_État.md`, `Dev.md` et `_Socle/`. Ici, le code seulement.
- **Où sont les choses** (tableau) :
  - V1 en prod (flw.sh) → `apps/web/`, voir son `CLAUDE.md` ;
  - V2 en construction (flw.sh/v2/) → `apps/web-v2/`, carnet `docs/v2/` ;
  - design system V2 → `docs/v2/DESIGN-SYSTEM.md` ;
  - base, migrations, fonctions → `supabase/` ;
  - pièges DB → `docs/db/` ;
  - décisions produit historiques → `docs/decisions/` ;
  - specs et plans → `docs/superpowers/` ;
  - pièges payés → `.claude/rules/` (lire `deploiement.md` avant tout déploiement).
- **Démarrage** : le texte de RdC, à l'identique (graph absent → stop ; fetch/pull puis `graphify update .` ; architecture → `GRAPH_REPORT.md`).
- **Chercher avant de lire** : Context7 → Graphify → fichier brut. Un nom de colonne ou une signature de RPC ne se devine jamais.
- **Règles** : chef-d'œuvre de simplicité (détail : `.claude/rules/v2.md`) · pnpm uniquement · TS strict (pas de `any`, `@ts-ignore`, `as unknown as`) · Conventional Commits en français · migrations horodatées, canal unique `pnpm exec supabase db push --linked`, jamais `apply_migration`, tout `CREATE OR REPLACE` part de la définition live · architecture existante d'abord · code mort croisé = supprimé dans le même commit · **Netlify manuel**, jamais d'auto-deploy · le périmètre V2 est celui de la maquette Figma, et le design appartient à Uriel (toute proposition graphique se discute avant).
- **Livrer** : front modifié → `pnpm dev` (+ `pnpm dev:v2`), le parcours testé dans le navigateur, puis le build ; commit à chaque étape qui marche ; push en fin de session ; déploiement manuel par lot (`.claude/rules/deploiement.md`) ; fin de session : une décision → `_État.md` du vault, un piège → `.claude/rules/`.
- **Nouvelle machine** : `.env` racine (gitignoré) → `pnpm install` → `pip install graphifyy` → `graphify update .` → `graphify hook install`.

- [ ] **Step 4 : `apps/web/CLAUDE.md` et `apps/web-v2/README.md`**

`apps/web/CLAUDE.md` : reprendre de l'ancien `_ContexteIA/CLAUDE.md` **seulement** ce qui concerne la V1 (commandes, stack Tailwind/PWA, variables d'environnement). Préciser : « La V1 est en maintenance : on y corrige, on n'y construit plus. »

`apps/web-v2/README.md`, sur le modèle de `../app (Runes de Chêne)/apps/web-v2/README.md` :
- une phrase sur ce qu'elle est (front neuf, même base que la V1, réservé aux admins) ;
- les liens : spec `docs/superpowers/specs/2026-10-07-methode-monorepo-v2-design.md`, `docs/v2/` ;
- un tableau de commandes (`pnpm dev:v2`, `pnpm --filter web-v2 test`, `pnpm build:v2`) ;
- « Tester en local avec une session » (les 3 étapes de la tâche 3, Step 5) ;
- « Où sont les choses » (les dossiers de `src/`) ;
- la ligne `Maquette Figma : <URL à fournir par Uriel>`, laissée **visible** tant que l'URL manque.

- [ ] **Step 5 : `.claude/rules/v2.md`**

Frontmatter :
```yaml
---
paths:
  - "apps/web-v2/**"
  - "docs/v2/**"
---
```
Contenu :
1. Copier depuis `../app (Runes de Chêne)/.claude/rules/v2.md`, en adaptant les chemins, les sections suivantes :
   - « Un chef-d'œuvre de simplicité » (l'exemple TanStack Query devient « le cache est celui du navigateur ou de React, pas un code maison ») ;
   - « Tout est animé, fluide » (jetons de durée : les noms réels de `apps/web-v2/src/styles/1-primitives.css` / `2-semantic.css`, ou à défaut « à poser dans `2-semantic.css` ») ; retirer le paragraphe MapLibre ;
   - « Rien de la V1 ne rentre » ;
   - « Chaque fichier se lit seul » ;
   - « Le registre de purge » ;
   - « Tout état navigable est une URL » ;
   - « Un écran n'est fini que comparé à sa maquette », où `tokens.css` devient `1-primitives.css` et `/v2/da` disparaît.
2. Ajouter « Le design system en trois couches » : renvoi à `docs/v2/DESIGN-SYSTEM.md`, aucune valeur en dur dans `3-components/`, aucun style dans les `.tsx`.
3. Ajouter, sous forme **Le piège (date) / How to apply**, les leçons de `_ContexteIA/xo-status.md` (section « Mémoire ») :
   - la cascade `.button:hover:not(:disabled)` ;
   - l'onglet en arrière-plan qui gèle les transitions et fait mentir `getComputedStyle` (la capture fait foi) ;
   - « une animation se maquette avant de se coder » ;
   - le décor retiré trop tard pour `startViewTransition`, et `useLayoutEffect` qui n'y change rien ;
   - `PageChrome.back` est un chemin, jamais une fonction ;
   - « se méfier des règles qui tiennent surtout parce qu'elles se formulent bien » (le verrou des dates passées).

- [ ] **Step 6 : Revoir `workflow.md` et les chemins des autres règles**

`workflow.md` :
- supprimer « travailler-sur-main-directement » et le remplacer par « Le régime de livraison » (commit à chaque étape, push en fin de session, déploiement manuel ; la V2 vit dans `apps/web-v2`, pas sur une branche) ;
- supprimer « V1 testing feedback — UX issues » ;
- garder les autres sections.

Dans `supabase.md`, `interface.md`, `dev.md`, `deploiement.md` : remplacer les chemins `src/…` par `apps/web/src/…` (ou `apps/web-v2/src/…` quand le piège porte sur la V2), et mettre à jour les `paths:` du frontmatter.

`deploiement.md` reçoit une section « Les deux sites et le cycle de déploiement » :
- le tableau des deux sites (nom, id, domaine) ;
- « déployer depuis le dossier de l'app, jamais d'ailleurs » (sinon `netlify.toml` n'est pas lu) ;
- le piège du service worker `/v2` ;
- les commandes de la tâche 8.

`docs/v2/DESIGN-SYSTEM.md` : `src/styles/` → `apps/web-v2/src/styles/`. `README.md` racine : trois lignes (ce qu'est Fellowship, les deux apps, renvoi à `CLAUDE.md`).

- [ ] **Step 7 : Commit**

```bash
git add CLAUDE.md README.md .claude apps/web/CLAUDE.md apps/web-v2/README.md docs/v2/DESIGN-SYSTEM.md
git commit -m "chore(claude): la couche Claude de Runes de Chene — CLAUDE.md court, hooks, regles V2"
```
Ne pas commiter `.claude/settings.local.json` s'il est ignoré (`git check-ignore -v .claude/settings.local.json`).

---

### Task 6 : Dissoudre l'ancien système, ouvrir le carnet V2, mettre le vault à jour

**Files :**
- Delete : `_ContexteIA/` (entier), `.mcp.json`, `BOOTSTRAP.md`, `docs/xo-discipline.md`
- Create : `docs/v2/README.md`, `docs/v2/purge-back.md`, `docs/v2/decisions/README.md`, `docs/v2/sondes/README.md`
- Modify (vault) : `1. LE MÉTIER/2. Fellowship/_État.md`, `1. LE MÉTIER/2. Fellowship/Dev.md`

- [ ] **Step 1 : Vérifier que tout a été repris avant de supprimer**

Relire `_ContexteIA/xo-status.md`, `BOOTSTRAP.md` et `docs/xo-discipline.md`. Pour chaque règle ou piège, vérifier qu'il figure dans `CLAUDE.md` ou `.claude/rules/`. Sinon, l'y ajouter. Les décisions déjà tranchées (« créer un événement → intéressé », « un exposant est payé après ») vont dans `Dev.md`, section Tranché.

- [ ] **Step 2 : Le carnet `docs/v2/`**

`docs/v2/README.md` :
```markdown
# V2 — carnet de bord

- `DESIGN-SYSTEM.md` — le design, et comment le changer sans toucher au code.
- `decisions/` — une page par choix structurant : le contexte, la décision, les options
  écartées et pourquoi. On ne rediscute pas une décision sans lire sa page.
- `sondes/` — relevés en prod, en lecture seule, faits avant une spec (un relevé d'un jour).
- `purge-back.md` — tout ce que le back devra perdre ou corriger une fois la V2 lancée.

Conception : `docs/superpowers/specs/2026-10-07-methode-monorepo-v2-design.md`.

## Points ouverts
```
Sous « Points ouverts » : une ligne par tâche **non cochée** de `xo-status.md`, reprise telle quelle, sauf « Choisir le mode de déploiement de la branche v2 » (réglé par ce plan).

`docs/v2/purge-back.md` : un titre, la règle « une ligne par objet back douteux, dans le même commit ; pas de DROP tant que la V1 tourne », et une liste vide. `decisions/README.md` et `sondes/README.md` : la phrase correspondante du README ci-dessus.

- [ ] **Step 3 : Supprimer**

```bash
git rm -r -q _ContexteIA .mcp.json BOOTSTRAP.md docs/xo-discipline.md
git worktree prune
```

- [ ] **Step 4 : Le vault**

Dans `Fellowship/_État.md`, section « Où on en est », ajouter un paragraphe :
> **La V2 de l'application** se construit dans `apps/web-v2`, servie sous `flw.sh/v2/` et réservée aux admins. Elle repart de zéro sur la maquette Parchemin. Déjà là : le tableau de bord, la fiche événement avec son mur d'affiche, la création d'événement et la discussion du festival. Les points ouverts sont dans `docs/v2/README.md` du dépôt.

Dans `Dev.md`, section « Où on en est » : remplacer la phrase « `main` est la branche de travail **et** la production — plus de branches de fonctionnalité longues » par « Monorepo depuis le 07/10/2026 : la V1 dans `apps/web` (maintenance), la V2 dans `apps/web-v2`. `main` est la seule branche, et le déploiement est manuel. » Dans « Écarté », remplacer « Les branches de fonctionnalité longues — `main` est l'atelier et la production » par « Les branches de fonctionnalité longues — la V2 elle-même vit sur `main`, dans son dossier ». Mettre `last-verified: 2026-10-07` dans les deux frontmatters.

- [ ] **Step 5 : Commit**

```bash
git add -A docs/v2 _ContexteIA .mcp.json BOOTSTRAP.md docs/xo-discipline.md
git commit -m "chore(repo): l'ancien systeme XO se dissout, le carnet V2 s'ouvre"
```

---

### Task 7 : Graphify

- [ ] **Step 1 : Rebuild complet**

Run : `graphify update .`
Expected : le rapport cite des fichiers sous `apps/web/` et `apps/web-v2/`, et aucun chemin `src/…` à la racine. Contrôle : `grep -c "apps/web-v2" graphify-out/GRAPH_REPORT.md` ≥ 1.

- [ ] **Step 2 : Réinstaller le hook**

Run : `graphify hook install`, puis `ls -la .git/hooks/post-commit`. Expected : le fichier existe, daté d'aujourd'hui.

- [ ] **Step 3 : Commit**

```bash
git add graphify-out
git commit -m "chore(graphify): rebuild apres le passage en monorepo"
```
Expected : le hook `post-commit` tourne sans erreur.

---

### Task 8 : Vérifier, pousser, déployer

- [ ] **Step 1 : Vérification locale complète**

```bash
pnpm install --frozen-lockfile && pnpm lint && pnpm test && pnpm build && pnpm build:v2
```
Expected : tout passe. Puis le parcours de la tâche 3, Step 5, une dernière fois.

- [ ] **Step 2 : `main` avance en fast-forward, et on pousse**

```bash
git checkout main
git merge --ff-only v2
git push origin main
```
Expected : `Fast-forward`. Le push ne déclenche **aucun** déploiement. Le vérifier :
```bash
netlify api listSiteDeploys --data '{"site_id":"8c479753-ecff-4c88-8069-2b25e7514925","per_page":1}' | grep -E '"(created_at|commit_ref)"'
```
Expected : le dernier déploiement est toujours celui du 14/08 (`87e4cfb`). La CI GitHub passe : `gh run list --limit 1`.

- [ ] **Step 3 : Créer le site de la V2 et le déployer**

```bash
netlify api createSite --data '{"body":{"name":"fellowship-web-v2"}}' | grep -E '"(id|name|url)"'
cd apps/web-v2 && pnpm build && netlify deploy --prod --dir dist --site fellowship-web-v2; cd ../..
curl -s https://fellowship-web-v2.netlify.app/ | grep -o 'src="/v2/assets/[^"]*"'
```
Expected : le site est créé (noter son id pour `deploiement.md`), et le `curl` montre les assets en `/v2/assets/`. Si `createSite` demande un compte, ajouter `"account_slug"` (voir `netlify api listAccountsForUser`).

- [ ] **Step 4 : Déployer la V1 (avec la redirection)**

```bash
cd apps/web && pnpm build && netlify deploy --prod --dir dist --site fellowship-app; cd ../..
```

- [ ] **Step 5 : Vérifier en prod**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://flw.sh/
curl -s https://flw.sh/v2/ | grep -o 'src="/v2/assets/[^"]*"'
curl -s https://flw.sh/sw.js | grep -c 'v2'
```
Expected : `200`, les assets V2, et la denylist présente dans `sw.js`.

Puis, dans le navigateur :
- sur flw.sh, la V1 affiche 0.7.399, et la connexion et le tableau de bord marchent ;
- sur `flw.sh/v2/`, avec ton compte admin, la V2 s'ouvre sans nouvelle connexion ;
- dans un navigateur qui avait déjà la V1 installée, recharger deux fois `flw.sh/v2/` : la V2 s'affiche, pas la V1. Lire la console.

- [ ] **Step 6 : Écrire l'id du site V2 dans `deploiement.md`, et commit**

```bash
git add .claude/rules/deploiement.md
git commit -m "docs(deploiement): l'id du site fellowship-web-v2"
git push origin main
```

---

### Task 9 : Supprimer la branche `v2`

- [ ] **Step 1 : Vérifier qu'elle est entièrement dans `main`**

Run : `git log --oneline main..v2 | wc -l`. Expected : `0`.

- [ ] **Step 2 : Supprimer**

```bash
git branch -d v2
git push origin --delete v2
git worktree remove ../fellowship-ref
```

---

### Task 10 : Le lot « lisibilité » de la V2

Aucun changement de comportement. Un commit par dossier.

**Files :** chaque fichier `.ts` / `.tsx` / `.css` de `apps/web-v2/src`, plus un `README.md` par dossier de `apps/web-v2/src` (`components/layout`, `components/ui`, `features/dashboard`, `features/event`, `features/event-create`, `lib`, `pages`, `styles`, `styles/3-components`, `types`, `test`).

- [ ] **Step 1 : Un dossier à la fois**

Pour chaque dossier :
1. Écrire son `README.md` : ce que le dossier contient, en 3 à 8 lignes, puis une ligne par fichier.
2. Ajouter en tête de chaque fichier :
   ```ts
   /**
    * QUOI     — <ce que fait le fichier, une ligne>
    * POURQUOI — <la raison d'être ou le choix non évident>
    * ATTENTION — <le piège, seulement s'il y en a un>
    */
   ```
   En CSS, la même chose en `/* … */`. Le contenu se tire du code et de l'historique (`git log --format=%B -- <fichier>`), jamais de l'imagination. Un commentaire existant qui paraphrase sa ligne se retire.
3. Run : `pnpm --filter web-v2 test && pnpm --filter web-v2 build`. Expected : PASS.
4. Commit : `docs(v2): <dossier> se lit seul`.

- [ ] **Step 2 : Pousser en fin de lot**

Run : `git push origin main`. Pas de déploiement (les commentaires ne changent rien au comportement).
