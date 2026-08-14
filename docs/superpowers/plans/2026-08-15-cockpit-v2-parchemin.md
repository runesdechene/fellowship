# Cockpit V2 « Parchemin » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer le contour V2 et le Cockpit V2 au langage « Parchemin », derrière l'interrupteur `?app2=1`, sans qu'un seul pixel de la V1 ne bouge.

**Architecture:** Un calque CSS scopé `.app2` qui définit ses propres jetons parchemin (jamais ceux de `src/index.css`), une mise en page `AppLayoutV2` avec sa barre latérale / barre du haut / barre du bas dédiées, et une page `CockpitV2` qui consomme exactement les mêmes hooks et sélecteurs que la V1. Le choix V1/V2 se fait dans la route, au-dessus de la mise en page.

**Tech Stack:** React 19 · React Router 7 · Vite 7 · TypeScript · Tailwind 4 (socle) + CSS global par composant · vitest 4 + jsdom · pnpm

**Spec:** [`docs/superpowers/specs/2026-08-14-cockpit-v2-parchemin-design.md`](../specs/2026-08-14-cockpit-v2-parchemin-design.md)

## Global Constraints

- **La V1 ne bouge pas.** Seuls trois fichiers existants sont modifiés : `src/App.tsx`, `src/lib/theme.ts`, `src/lib/landing-v2.ts` (+ `index.html` pour le script anti-flash). Tout le reste est en création. `git diff --stat` est vérifié à chaque tâche.
- **Jamais toucher aux jetons de `src/index.css`.** ~224 `hsl(var(--x))` écrits à la main dans 17 fichiers CSS en dépendent. Les jetons parchemin sont en hex et vivent **uniquement** sous `.app2`.
- **Pas de test JSX.** React 19.2 + RTL 16.3 + vitest 4.1 ne flushent pas les rendus concurrents en synchrone : `render()` retourne avant le commit et `screen.getByText` ne trouve rien. Convention du projet : extraire la logique en **fonction pure** dans `src/lib/*.ts`, la tester en vitest, et vérifier le composant dans le navigateur.
- **Toute classe CSS est préfixée.** Les `*.css` de ce projet sont globaux, pas des modules : une classe nue (`.card`, `.list`, `.av`, `.dot`) fuit dans toute l'app. Préfixes réservés : `ck2-` (Cockpit), `sd2-` (barre latérale), `tb2-` (barre du haut), `bb2-` (barre du bas), `app2-` (coque).
- **Un composant réutilisable = un fichier CSS à côté de lui.** Pas de Tailwind en ligne sur ces composants, pas de styles logés dans le CSS d'un parent.
- **Aucune bascule automatique sur `prefers-color-scheme`.** Le clair est le défaut en V2 ; le sombre ne s'active que sur demande explicite.
- **Jamais de `#fff` en dur** pour du texte sur surface (invisible en clair), jamais de `inset 0 1px 0 rgba(255,255,255,…)` en dur (trait blanc visible en sombre) — ça passe par `--lift`, redéfini par thème.
- **On travaille directement sur `main`** (= prod, Netlify auto-déploie). Build + lint + tests avant chaque push.
- **Palette parchemin, valeurs exactes** (clair / sombre) :
  `--parchment` `#F4EEE1` / `#171414` · `--rail` `#EFE8D9` / `#1B1716` · `--ink` `#594848` / `#F0E5D6` · `--ink-soft` `#8C7B72` / `#A3948A` · `--ink-faint` `#B0A197` / `#786A62` · `--accent-app2` `#C06846` / `#E29B76` · `--accent-ink2` `#FFF6F0` / `#2A1810` · `--ok` `#4E7355` / `#8FBF9C` · `--wait` `#B98032` / `#E0B26A`

---

### Task 1: L'interrupteur générique

**Files:**
- Create: `src/lib/v2-switch.ts`
- Create: `src/lib/v2-switch.test.ts`
- Modify: `src/lib/landing-v2.ts` (le réécrire au-dessus du générique, comportement identique)
- Test: `src/lib/v2-switch.test.ts`, `src/lib/landing-v2.test.ts` (existant, doit rester vert sans être modifié)

**Interfaces:**
- Consumes: rien.
- Produces:
  - `resolveV2Switch(param: string, search: string, stored: string | null): V2Decision`
  - `readV2Switch(param: string, storageKey: string): boolean`
  - `interface V2Decision { enabled: boolean; persist: '1' | null }`
  - `APP_V2_PARAM = 'app2'`, `APP_V2_STORAGE_KEY = 'flwsh-app-v2'`

- [ ] **Step 1: Write the failing test**

Créer `src/lib/v2-switch.test.ts` :

```ts
// src/lib/v2-switch.test.ts
import { describe, it, expect } from 'vitest'
import { resolveV2Switch } from './v2-switch'

describe('resolveV2Switch', () => {
  it('sans paramètre ni mémoire → V1', () => {
    expect(resolveV2Switch('app2', '', null)).toEqual({ enabled: false, persist: null })
  })
  it('?app2=1 → V2 et on mémorise', () => {
    expect(resolveV2Switch('app2', '?app2=1', null)).toEqual({ enabled: true, persist: '1' })
  })
  it('?app2=0 → V1 et on efface la mémoire', () => {
    expect(resolveV2Switch('app2', '?app2=0', '1')).toEqual({ enabled: false, persist: null })
  })
  it('sans paramètre mais mémoire allumée → V2', () => {
    expect(resolveV2Switch('app2', '', '1')).toEqual({ enabled: true, persist: '1' })
  })
  it('valeur de mémoire inattendue → V1', () => {
    expect(resolveV2Switch('app2', '', 'oui')).toEqual({ enabled: false, persist: null })
  })
  it('le paramètre de la vitrine n\'allume pas l\'app', () => {
    expect(resolveV2Switch('app2', '?v2=1', null)).toEqual({ enabled: false, persist: null })
  })
  it('le paramètre de l\'app n\'allume pas la vitrine', () => {
    expect(resolveV2Switch('v2', '?app2=1', null)).toEqual({ enabled: false, persist: null })
  })
  it('les deux paramètres à la fois → chacun le sien', () => {
    expect(resolveV2Switch('app2', '?v2=1&app2=1', null)).toEqual({ enabled: true, persist: '1' })
    expect(resolveV2Switch('v2', '?v2=1&app2=1', null)).toEqual({ enabled: true, persist: '1' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/v2-switch.test.ts`
Expected: FAIL — `Failed to resolve import "./v2-switch"`.

- [ ] **Step 3: Write minimal implementation**

Créer `src/lib/v2-switch.ts` :

```ts
// src/lib/v2-switch.ts
// L'interrupteur V1/V2, en pur. Un paramètre d'URL allume et mémorise, `=0`
// éteint et oublie, sinon on relit la mémoire. Défaut : V1.
// Généralisé depuis landing-v2.ts pour servir la vitrine ET l'app, avec des
// clés distinctes : allumer l'une n'allume pas l'autre.

export interface V2Decision {
  /** Faut-il rendre la V2 ? */
  enabled: boolean
  /** Valeur à écrire en mémoire, ou null pour l'effacer. */
  persist: '1' | null
}

export const APP_V2_PARAM = 'app2'
export const APP_V2_STORAGE_KEY = 'flwsh-app-v2'

export function resolveV2Switch(param: string, search: string, stored: string | null): V2Decision {
  const value = new URLSearchParams(search).get(param)
  if (value === '1') return { enabled: true, persist: '1' }
  if (value === '0') return { enabled: false, persist: null }
  return stored === '1' ? { enabled: true, persist: '1' } : { enabled: false, persist: null }
}

/** Lit l'interrupteur côté navigateur et applique l'effet de mémoire. */
export function readV2Switch(param: string, storageKey: string): boolean {
  if (typeof window === 'undefined') return false
  const stored = window.localStorage.getItem(storageKey)
  const { enabled, persist } = resolveV2Switch(param, window.location.search, stored)
  if (persist) window.localStorage.setItem(storageKey, persist)
  else window.localStorage.removeItem(storageKey)
  return enabled
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/v2-switch.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Rebrancher la vitrine sur le générique**

Remplacer tout le contenu de `src/lib/landing-v2.ts` par :

```ts
// src/lib/landing-v2.ts
// L'interrupteur de la VITRINE. La mécanique vit dans v2-switch.ts ; ce module
// n'est plus qu'un nommage stable (clé + paramètre) pour ne pas casser les
// appelants ni les tests existants.
import { resolveV2Switch, readV2Switch, type V2Decision } from './v2-switch'

export const LANDING_V2_STORAGE_KEY = 'flwsh-landing-v2'
export const LANDING_V2_PARAM = 'v2'

export type LandingV2Decision = V2Decision

export function resolveLandingV2(search: string, stored: string | null): LandingV2Decision {
  return resolveV2Switch(LANDING_V2_PARAM, search, stored)
}

export function readLandingV2(): boolean {
  return readV2Switch(LANDING_V2_PARAM, LANDING_V2_STORAGE_KEY)
}
```

- [ ] **Step 6: Vérifier que la vitrine n'a pas changé de comportement**

Run: `pnpm exec vitest run src/lib/landing-v2.test.ts src/lib/v2-switch.test.ts`
Expected: PASS. **`src/lib/landing-v2.test.ts` ne doit pas être modifié** — c'est lui qui prouve l'absence de régression.

- [ ] **Step 7: Commit**

```bash
git add src/lib/v2-switch.ts src/lib/v2-switch.test.ts src/lib/landing-v2.ts
git commit -m "refactor(v2): interrupteur generique partage vitrine/app"
```

---

### Task 2: Les trois états du thème

**Files:**
- Modify: `src/lib/theme.ts`
- Modify: `src/lib/theme.test.ts` (ajouts uniquement, les cas existants restent)
- Modify: `src/hooks/use-theme.tsx`
- Modify: `index.html:21-41` (script anti-flash)
- Test: `src/lib/theme.test.ts`

**Interfaces:**
- Consumes: `APP_V2_PARAM`, `APP_V2_STORAGE_KEY` (Task 1).
- Produces:
  - `resolveInitialTheme(stored: string | null, hasLightClass: boolean, isV2: boolean): Theme`
  - `applyThemeClass(theme: Theme): void` — pose/retire `.light`, **ne persiste pas**
  - `persistTheme(theme: Theme): void` — écrit `flwsh-theme`
  - `getInitialTheme(isV2?: boolean): Theme` — conservée, s'appuie sur `resolveInitialTheme`
  - `applyTheme` est **supprimée** ; ses deux appelants sont `use-theme.tsx` et `theme.test.ts`

**Le problème réparé ici :** aujourd'hui `ThemeProvider` appelle `applyTheme(theme)` dans un `useEffect` au montage, et `applyTheme` écrit `flwsh-theme` **même quand l'utilisateur n'a rien choisi**. Une seule visite en V2 imposerait donc le clair à la V1. On sépare « poser la classe » (à chaque rendu) de « mémoriser » (sur geste seulement).

- [ ] **Step 1: Write the failing test**

Ajouter à la fin de `src/lib/theme.test.ts`, avant la dernière accolade fermante :

```ts
describe('resolveInitialTheme — les trois états', () => {
  it('aucun choix + V1 → night (défaut historique)', () => {
    expect(resolveInitialTheme(null, false, false)).toBe('night')
  })
  it('aucun choix + V2 → day (le parchemin est le défaut, décision 0007)', () => {
    expect(resolveInitialTheme(null, false, true)).toBe('day')
  })
  it('choix "night" + V2 → night (un choix explicite est roi)', () => {
    expect(resolveInitialTheme('night', false, true)).toBe('night')
  })
  it('choix "day" + V1 → day', () => {
    expect(resolveInitialTheme('day', false, false)).toBe('day')
  })
  it('valeur invalide + V2 → day (on retombe sur le défaut du contexte)', () => {
    expect(resolveInitialTheme('banana', false, true)).toBe('day')
  })
  it('aucun choix + classe .light déjà posée par l\'anti-flash → day, pas de divergence', () => {
    expect(resolveInitialTheme(null, true, false)).toBe('day')
  })
})

describe('applyThemeClass / persistTheme — la séparation', () => {
  it('applyThemeClass("day") pose la classe SANS rien mémoriser', () => {
    applyThemeClass('day')
    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })
  it('applyThemeClass("night") retire la classe SANS rien mémoriser', () => {
    document.documentElement.classList.add('light')
    applyThemeClass('night')
    expect(document.documentElement.classList.contains('light')).toBe(false)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })
  it('persistTheme écrit le choix', () => {
    persistTheme('night')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('night')
  })
})
```

Et remplacer la ligne d'import en tête du fichier par :

```ts
import { getInitialTheme, resolveInitialTheme, applyThemeClass, persistTheme, THEME_STORAGE_KEY } from './theme'
```

Les deux derniers cas du `describe('theme')` existant testaient `applyTheme` ; les remplacer par :

```ts
  it('applyThemeClass("day") + persistTheme("day") = l\'ancien applyTheme', () => {
    applyThemeClass('day')
    persistTheme('day')
    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('day')
  })
  it('applyThemeClass("night") + persistTheme("night") = l\'ancien applyTheme', () => {
    document.documentElement.classList.add('light')
    applyThemeClass('night')
    persistTheme('night')
    expect(document.documentElement.classList.contains('light')).toBe(false)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('night')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/theme.test.ts`
Expected: FAIL — `resolveInitialTheme is not a function` / `applyThemeClass is not exported`.

- [ ] **Step 3: Write minimal implementation**

Remplacer tout le contenu de `src/lib/theme.ts` par :

```ts
export type Theme = 'night' | 'day'

export const THEME_STORAGE_KEY = 'flwsh-theme'

/**
 * Le thème d'ouverture, en pur. Trois états, pas deux :
 *  - un choix explicite mémorisé  → il est roi, partout ;
 *  - aucun choix, en V2           → JOUR (le parchemin est l'identité, décision 0007) ;
 *  - aucun choix, en V1           → NUIT (le défaut historique de l'app).
 * `hasLightClass` reflète la décision déjà prise avant le premier paint par le
 * script anti-flash d'index.html : le DOM est la source de cette décision, la
 * ré-inventer ici ferait diverger les deux et produirait un scintillement.
 */
export function resolveInitialTheme(stored: string | null, hasLightClass: boolean, isV2: boolean): Theme {
  if (stored === 'day' || stored === 'night') return stored
  if (hasLightClass) return 'day'
  return isV2 ? 'day' : 'night'
}

export function getInitialTheme(isV2 = false): Theme {
  if (typeof window === 'undefined') return 'night'
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  const hasLightClass = typeof document !== 'undefined'
    && document.documentElement.classList.contains('light')
  return resolveInitialTheme(stored, hasLightClass, isV2)
}

/**
 * Pose l'habillage : jour = classe `.light` sur <html>, nuit = aucune classe.
 * NE PERSISTE RIEN — appelé à chaque rendu du provider. Persister ici écrivait
 * un choix que l'utilisateur n'avait jamais fait, et une visite V2 imposait
 * alors le clair à toute la V1.
 */
export function applyThemeClass(theme: Theme): void {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('light', theme === 'day')
  }
}

/** Mémorise un choix EXPLICITE de l'utilisateur. Le seul appelant légitime est un geste. */
export function persistTheme(theme: Theme): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/theme.test.ts`
Expected: PASS.

- [ ] **Step 5: Câbler le provider**

Remplacer le corps de `ThemeProvider` dans `src/hooks/use-theme.tsx` (l'import en tête devient `import { type Theme, getInitialTheme, applyThemeClass, persistTheme } from '@/lib/theme'`) :

```tsx
export function ThemeProvider({ children }: { children: ReactNode }) {
  // `isV2` est lu une seule fois, au montage : l'interrupteur ne change pas
  // en cours de visite, et il a déjà été résolu par le script anti-flash.
  const [theme, setThemeState] = useState<Theme>(
    () => getInitialTheme(readV2Switch(APP_V2_PARAM, APP_V2_STORAGE_KEY)),
  )

  // Pose la classe à chaque changement. Ne mémorise RIEN : voir lib/theme.ts.
  useEffect(() => {
    applyThemeClass(theme)
  }, [theme])

  // Les deux seuls chemins qui mémorisent — ils partent d'un geste de l'utilisateur.
  const setTheme = useCallback((next: Theme) => {
    persistTheme(next)
    setThemeState(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((t) => {
      const next: Theme = t === 'night' ? 'day' : 'night'
      persistTheme(next)
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
```

Ajouter en tête du fichier : `import { readV2Switch, APP_V2_PARAM, APP_V2_STORAGE_KEY } from '@/lib/v2-switch'`.

- [ ] **Step 6: Étendre le script anti-flash**

Dans `index.html`, remplacer la ligne qui calcule `isV2` (actuellement `var isV2 = param === '1' || (param !== '0' && localStorage.getItem('flwsh-landing-v2') === '1');`) par le bloc suivant, qui traite les deux interrupteurs :

```js
          var qs = new URLSearchParams(location.search);
          // Un `=0` est un ORDRE d'extinction, pas une absence d'ordre : il doit
          // gagner AVANT que React n'ait pu effacer la mémoire, sinon éteindre
          // l'interrupteur peignait quand même en clair.
          function on(name, key) {
            var p = qs.get(name);
            if (p === '1') return true;
            if (p === '0') return false;
            return localStorage.getItem(key) === '1';
          }
          if (on('v2', 'flwsh-landing-v2') || on('app2', 'flwsh-app-v2')) {
            document.documentElement.classList.add('light');
          }
```

(La ligne `var param = new URLSearchParams(location.search).get('v2');` et le `if (isV2)` qui suivait sont supprimés.)

- [ ] **Step 7: Vérifier**

Run: `pnpm exec vitest run && pnpm lint`
Expected: PASS, 0 erreur eslint.

Puis vérifier à la main dans le navigateur (`pnpm dev`), en vidant `localStorage` entre chaque cas :
1. `/` sans paramètre → vitrine V1, thème nuit.
2. `/tableau-de-bord?app2=1` → clair, et `localStorage.flwsh-theme` **absent** (rien n'a été mémorisé).
3. Basculer le thème en nuit → `localStorage.flwsh-theme === 'night'`.
4. Ouvrir `/explorer` (V1) dans le même navigateur → toujours nuit, la V1 est intacte.
5. Vider `localStorage`, ouvrir `/explorer` → nuit. La visite V2 ne contamine plus.

- [ ] **Step 8: Commit**

```bash
git add src/lib/theme.ts src/lib/theme.test.ts src/hooks/use-theme.tsx index.html
git commit -m "fix(theme): separer poser-la-classe de memoriser-un-choix

Le provider persistait flwsh-theme au montage meme sans geste de
l'utilisateur : une visite V2 imposait le clair a toute la V1.
Trois etats desormais : choix explicite > anti-flash > defaut du
contexte (jour en V2, nuit en V1)."
```

---

### Task 3: Le contour V2

**Files:**
- Create: `src/styles/app2.css` (le calque de jetons + les règles de base)
- Create: `src/components/layout/AppLayoutV2.tsx`
- Create: `src/components/layout/AppLayoutV2.css`
- Create: `src/components/layout/SidebarV2.tsx`
- Create: `src/components/layout/SidebarV2.css`
- Create: `src/components/layout/TopbarV2.tsx`
- Create: `src/components/layout/TopbarV2.css`
- Create: `src/components/layout/BottomBarV2.tsx`
- Create: `src/components/layout/BottomBarV2.css`
- Modify: `src/App.tsx` (la fonction `AuthenticatedApp`, lignes 65-73)

**Interfaces:**
- Consumes: `readV2Switch`, `APP_V2_PARAM`, `APP_V2_STORAGE_KEY` (Task 1) ; `navItemsFor`, `entryState`, `planForActor`, `vitrineHref`, `NAV_DEFS` de `@/lib/navModel` (existants, inchangés) ; `useAuth`, `useMyParticipations`, `useCommunityBadge`, `useAdminPendingReportsCount` (existants).
- Produces: `<AppLayoutV2>{children}</AppLayoutV2>` — même contrat que `AppLayout`.

**Note :** cette tâche livre le contour avec le **Cockpit V1 inchangé dedans**. C'est volontairement inconfortable à l'œil — c'est la preuve que l'interrupteur et le calque fonctionnent avant qu'on refasse la page. Le Cockpit V2 arrive en Task 4.

- [ ] **Step 1: Créer le calque de jetons**

Créer `src/styles/app2.css` :

```css
/* src/styles/app2.css
   DA V2 « Parchemin » — décision 0007. TOUT est scopé sous .app2 : les .css de
   ce projet sont globaux, et les jetons de src/index.css sont des triplets HSL
   consommés par ~224 hsl(var(--x)) écrits à la main. Ces jetons-ci sont en hex
   et ne doivent JAMAIS porter les mêmes noms. */

.app2 {
  --parchment: #F4EEE1;
  --rail: #EFE8D9;
  --surf: #FBF7EF;
  --surf-2: #F3EDE1;
  --ink: #594848;
  --ink-soft: #8C7B72;
  --ink-faint: #B0A197;
  --hairline: rgba(89,72,72,.13);
  --hairline-2: rgba(89,72,72,.09);
  --shade: rgba(89,72,72,.045);
  --accent-app2: #C06846;
  --accent-ink2: #FFF6F0;
  --accent-wash2: rgba(192,104,70,.11);
  --ok: #4E7355; --ok-wash: rgba(78,115,85,.13);
  --wait: #B98032; --wait-wash: rgba(185,128,50,.14);

  /* Un bloc = un fond à peine décalé du parchemin. Ni bordure ni ombre :
     la séparation se fait par la teinte. Légèrement translucide pour capter
     les halos qui passent derrière — c'est ce qui l'empêche d'être un
     rectangle mort. */
  --block: rgba(255,252,246,.58);
  --block-2: rgba(255,252,246,.38);
  --rail-bg: linear-gradient(180deg, rgba(247,241,229,.86), rgba(240,232,217,.92));
  --nav-on: rgba(255,252,245,.92);

  /* La matière : jamais une ombre dure. Un liseré de lumière, une ombre large
     et très diffuse. Le liseré passe par ce jeton et JAMAIS en dur : écrit en
     dur, il se voit comme un trait blanc en thème sombre. */
  --lift:
    inset 0 1px 0 rgba(255,255,255,.72),
    0 1px 2px rgba(84,62,44,.045),
    0 10px 26px -8px rgba(84,62,44,.10);

  --halo-1: rgba(226,155,118,.17);
  --halo-2: rgba(186,152,214,.075);
  --halo-3: rgba(232,180,120,.08);
  --halo-4: rgba(214,146,120,.08);
  --halo-blur: 90px;
  --photo-a: #D8C7A8; --photo-b: #A8927A;

  --sidebar2-w: 232px;

  color: var(--ink);
  background-color: var(--parchment);
  -webkit-font-smoothing: antialiased;
}

/* Le sombre ne s'active JAMAIS tout seul : aucune règle prefers-color-scheme.
   Dans cette app, absence de .light = nuit (défaut historique de la V1). */
html:not(.light) .app2 {
  --parchment: #171414;
  --rail: #1B1716;
  --surf: #221C19;
  --surf-2: #2A231F;
  --ink: #F0E5D6;
  --ink-soft: #A3948A;
  --ink-faint: #786A62;
  --hairline: rgba(240,229,214,.15);
  --hairline-2: rgba(240,229,214,.10);
  --shade: rgba(240,229,214,.05);
  --accent-app2: #E29B76;
  --accent-ink2: #2A1810;
  --accent-wash2: rgba(226,155,118,.16);
  --ok: #8FBF9C; --ok-wash: rgba(143,191,156,.15);
  --wait: #E0B26A; --wait-wash: rgba(224,178,106,.16);
  --block: rgba(255,238,222,.042);
  --block-2: rgba(255,238,222,.028);
  --rail-bg: linear-gradient(180deg, rgba(30,25,23,.88), rgba(23,19,18,.94));
  --nav-on: rgba(255,240,225,.075);
  --lift:
    inset 0 1px 0 rgba(255,255,255,.055),
    0 1px 2px rgba(0,0,0,.34),
    0 12px 30px -10px rgba(0,0,0,.50);
  --halo-1: rgba(226,124,78,.18);
  --halo-2: rgba(150,110,205,.15);
  --halo-3: rgba(226,155,90,.10);
  --halo-4: rgba(196,96,80,.12);
  --halo-blur: 110px;
  --photo-a: #4E4237; --photo-b: #2E2721;
}

/* Sans cette règle, les SVG portés depuis une maquette prennent fill:black et
   deviennent des taches noires dans LES DEUX thèmes. La couleur de l'icône
   vient du `color` du parent. */
.app2 svg { fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; flex: none; }
.app2 * { box-sizing: border-box; }
.app2 p { margin: 0; }

/* Les halos, à ~17 %. En clair, le chaud domine et le froid ne fait que
   ponctuer : un halo bleu ou vert trop présent grise le parchemin. */
.app2 .app2-halos { position: fixed; inset: 0; z-index: -1; pointer-events: none; overflow: hidden; }
.app2 .app2-halos i { position: absolute; border-radius: 50%; filter: blur(var(--halo-blur)); display: block; }
.app2 .app2-h1 { width: 680px; height: 560px; top: -200px; left: -140px; background: var(--halo-1); }
.app2 .app2-h2 { width: 520px; height: 460px; top: 2%; right: -160px; background: var(--halo-2); }
.app2 .app2-h3 { width: 620px; height: 520px; top: 52%; left: 18%; background: var(--halo-3); }
.app2 .app2-h4 { width: 520px; height: 440px; bottom: -170px; right: 6%; background: var(--halo-4); }

/* Typographie 0007 : graisse 500, interlettrage négatif, jamais de noir pur. */
.app2 .app2-title { font-size: 2rem; font-weight: 500; letter-spacing: -.032em; line-height: 1.08; margin: 0; }
.app2 .app2-sub { font-size: .9375rem; color: var(--ink-soft); }
.app2 .app2-label { font-size: .6875rem; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: var(--ink-faint); }
.app2 .app2-muted { color: var(--ink-soft); font-size: .875rem; }
.app2 .app2-faint { color: var(--ink-faint); font-size: .8125rem; }

/* Le theme-toggle est un composant PARTAGÉ qui porte les jetons de l'app
   (hsl(var(--card))…, qui jureraient sur le parchemin). On ne le modifie pas :
   on le repeint ici, sous .app2 seulement. Le déplacement du bouton reste
   piloté par `.light .theme-toggle .knob`. */
.app2 .theme-toggle { background: var(--block); border: 1px solid var(--hairline); }
.app2 .theme-toggle .knob { background: var(--accent-app2); color: var(--accent-ink2); box-shadow: none; }
.app2 .theme-toggle:focus-visible { outline: 2px solid var(--accent-app2); outline-offset: 3px; }
```

- [ ] **Step 2: Créer la barre latérale**

Créer `src/components/layout/SidebarV2.tsx`. Elle reprend **la logique exacte** de `Sidebar.tsx` (mêmes hooks, même `navModel`, même repli, même pied) et ne change que le balisage et les classes. Points obligatoires : `--sidebar2-w` publié sur `<html>` comme la V1 publie `--sidebar-w` ; logo `public/icon.png` **sans border-radius, sans recadrage** ; classes toutes préfixées `sd2-`.

```tsx
import { useState, useEffect } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { CalendarDays, CalendarClock, Compass, User, Settings, Heart, LayoutDashboard, Store, Users, Shield, Lock, Sparkles, PanelLeftClose, PanelLeft, Map, type LucideIcon } from 'lucide-react'
import { navItemsFor, entryState, planForActor, vitrineHref, NAV_DEFS } from '@/lib/navModel'
import { useMyParticipations } from '@/hooks/use-participations'
import { useAdminPendingReportsCount } from '@/hooks/use-content-reports'
import { useCommunityBadge } from '@/hooks/use-community-badge'
import { EntitySwitcher } from './EntitySwitcher'
import { ThemeToggle } from '@/components/theme-toggle'
import './SidebarV2.css'

const ICONS: Record<string, LucideIcon> = { Compass, CalendarClock, Heart, LayoutDashboard, CalendarDays, Users, Store, User, Settings, Map }

export function SidebarV2() {
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar2-w', collapsed ? '76px' : '232px')
  }, [collapsed])

  const { currentActor, currentActorRow, person, isAdmin } = useAuth()
  const navigate = useNavigate()
  const plan = planForActor(currentActor, currentActorRow)
  const keys = navItemsFor(currentActor)
  const accountName = person?.display_name ?? 'Mon compte'

  const { participations } = useMyParticipations()
  const myDatesCount = participations.filter(p => {
    if (p.status === 'refuse') return false
    const start = p.events?.start_date
    return start != null && new Date(start) >= new Date(new Date().toDateString())
  }).length

  const communityBadge = useCommunityBadge()
  const { count: pendingReportsCount } = useAdminPendingReportsCount()
  const personalAvatar = person?.avatar_url ?? null
  const personalInitial = (accountName !== 'Mon compte' ? accountName : 'M')[0]?.toUpperCase() ?? 'M'

  return (
    <aside className={`sd2 ${collapsed ? 'sd2-collapsed' : ''}`}>
      <div className="sd2-head">
        <Link to="/explorer" className="sd2-brand">
          {/* Pictogramme SEUL, affiché entier : hauteur fixée, largeur libre.
              Jamais de cadre, jamais de recadrage, JAMAIS de border-radius. */}
          <img className="sd2-mark" src="/icon.png" alt="" />
          {!collapsed && <span className="sd2-name">Fellowship<span className="sd2-dot">.</span></span>}
        </Link>
        <button className="sd2-fold" onClick={() => setCollapsed(c => !c)} aria-label={collapsed ? 'Déplier' : 'Replier'}>
          {collapsed ? <PanelLeft strokeWidth={1.5} /> : <PanelLeftClose strokeWidth={1.5} />}
        </button>
      </div>

      <EntitySwitcher collapsed={collapsed} />

      <nav className="sd2-nav">
        {keys.map(key => {
          const def = NAV_DEFS[key]
          const Icon = ICONS[def.icon] ?? Compass
          const state = entryState(key, plan)
          const to = key === 'vitrine' ? vitrineHref((currentActorRow as { public_slug?: string | null })?.public_slug) : def.to
          if (state === 'active') {
            const showCount = key === 'calendrier' && myDatesCount > 0
            const showCommBadge = key === 'communaute' && communityBadge > 0
            return (
              <NavLink key={key} to={to} title={collapsed ? def.label : undefined}
                className={({ isActive }) => `sd2-link${isActive ? ' sd2-on' : ''}`}>
                <Icon strokeWidth={2} />
                <span className="sd2-lab">{def.label}</span>
                {showCount && <span className="sd2-count">{myDatesCount}</span>}
                {showCommBadge && <span className="sd2-badge">{communityBadge > 9 ? '9+' : communityBadge}</span>}
              </NavLink>
            )
          }
          const Badge = state === 'lock-pro' ? Lock : Sparkles
          return (
            <button key={key} className="sd2-link sd2-locked" onClick={() => navigate(to)} title={collapsed ? def.label : undefined}>
              <Icon strokeWidth={2} />
              <span className="sd2-lab">{def.label}</span>
              <span className="sd2-lock"><Badge strokeWidth={2} /></span>
            </button>
          )
        })}
        {isAdmin && (
          <NavLink to="/admin" title={collapsed ? 'Admin' : undefined}
            className={({ isActive }) => `sd2-link${isActive ? ' sd2-on' : ''}`}>
            <Shield strokeWidth={2} />
            <span className="sd2-lab">Admin</span>
            {pendingReportsCount > 0 && <span className="sd2-badge">{pendingReportsCount}</span>}
          </NavLink>
        )}
      </nav>

      <div className="sd2-foot">
        <Link to="/reglages" className="sd2-av" aria-label="Mon compte">
          {personalAvatar ? <img src={personalAvatar} alt="" /> : <span>{personalInitial}</span>}
        </Link>
        {!collapsed && (
          <Link to="/reglages" className="sd2-who">
            <b>{accountName}</b>
            <span>Mon compte</span>
          </Link>
        )}
        <ThemeToggle />
      </div>
    </aside>
  )
}
```

Créer `src/components/layout/SidebarV2.css` :

```css
/* src/components/layout/SidebarV2.css — tout est préfixé sd2- : les .css de ce
   projet sont globaux, une classe nue fuirait dans les autres composants. */
.sd2 {
  width: var(--sidebar2-w, 232px); flex: none;
  position: fixed; inset: 0 auto 0 0; z-index: 30;
  height: 100dvh;
  border-right: 1px solid var(--hairline-2);
  background: var(--rail-bg);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  padding: 22px 14px 20px;
  display: flex; flex-direction: column; gap: 22px;
  transition: width .18s ease;
}
@media (max-width: 767px) { .sd2 { display: none; } }

.sd2-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 8px; }
.sd2-brand { display: flex; align-items: center; gap: 10px; font-weight: 600; letter-spacing: -.02em; font-size: 1rem; color: var(--ink); text-decoration: none; }
/* Hauteur fixée, largeur libre, jamais de border-radius. */
.sd2-mark { height: 28px; width: auto; display: block; flex: none; }
.sd2-dot { color: var(--accent-app2); }
.sd2-fold { background: none; border: 0; color: var(--ink-faint); cursor: pointer; padding: 4px; display: grid; place-items: center; }
.sd2-fold svg { width: 18px; height: 18px; }
.sd2-fold:hover { color: var(--ink); }

.sd2-nav { display: flex; flex-direction: column; gap: 2px; }
.sd2-link {
  display: flex; align-items: center; gap: 11px;
  padding: 10px 12px; border-radius: 11px;
  color: var(--ink-soft); text-decoration: none;
  font-size: .9375rem; cursor: pointer;
  background: none; border: 1px solid transparent; font: inherit; width: 100%; text-align: left;
}
.sd2-link svg { width: 18px; height: 18px; }
.sd2-link:hover { background: var(--shade); color: var(--ink); }
/* Actif = un simple fond plus clair. Ni bordure, ni liseré de lumière : sur
   fond sombre le liseré blanc se voyait comme un trait. */
.sd2-on { background: var(--nav-on); color: var(--ink); font-weight: 600; box-shadow: none; }
.sd2-on svg { color: var(--accent-app2); }
.sd2-collapsed .sd2-lab, .sd2-collapsed .sd2-name, .sd2-collapsed .sd2-who { display: none; }
.sd2-count, .sd2-badge { margin-left: auto; font-size: .6875rem; font-weight: 700; padding: 2px 7px; border-radius: 999px; background: var(--accent-wash2); color: var(--accent-app2); }
.sd2-lock { margin-left: auto; color: var(--accent-app2); display: grid; place-items: center; }
.sd2-lock svg { width: 14px; height: 14px; }

.sd2-foot { margin-top: auto; display: flex; align-items: center; gap: 10px; padding: 12px 8px 0; border-top: 1px solid var(--hairline-2); }
.sd2-av { width: 30px; height: 30px; border-radius: 999px; overflow: hidden; background: var(--surf-2); border: 1px solid var(--hairline-2); display: grid; place-items: center; font-size: .6875rem; font-weight: 700; color: var(--ink-soft); text-decoration: none; flex: none; }
.sd2-av img { width: 100%; height: 100%; object-fit: cover; display: block; }
.sd2-who { display: flex; flex-direction: column; line-height: 1.25; min-width: 0; text-decoration: none; color: inherit; }
.sd2-who b { font-size: .8125rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sd2-who span { font-size: .6875rem; color: var(--ink-faint); }
```

- [ ] **Step 3: Créer la barre du haut et la barre du bas**

Créer `src/components/layout/TopbarV2.tsx` — la barre haute de l'app V2 : logo en mobile, recherche, cloche, bouton « Ajouter un événement ». Elle réutilise `SearchBar` telle quelle **non** : `SearchBar` porte les jetons V1. On expose ici une barre minimale, et l'ajout d'événement rouvre la même modale que la V1 via la prop `onCreateEvent`.

```tsx
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { NotifBell } from './NotifBell'
import './TopbarV2.css'

interface Props {
  onCreateEvent: () => void
}

export function TopbarV2({ onCreateEvent }: Props) {
  return (
    <header className="tb2">
      <Link to="/explorer" className="tb2-brand">
        <img className="tb2-mark" src="/icon.png" alt="" />
        <span className="tb2-name">Fellowship<span className="tb2-dot">.</span></span>
      </Link>
      <div className="tb2-right">
        <NotifBell />
        <button className="tb2-cta" onClick={onCreateEvent}>
          <Plus strokeWidth={2.2} />
          <span>Ajouter un événement</span>
        </button>
      </div>
    </header>
  )
}
```

```css
/* src/components/layout/TopbarV2.css */
.tb2 { display: flex; align-items: center; justify-content: space-between; gap: 16px; height: 68px; padding: 0 var(--page-padding, 24px); position: sticky; top: 0; z-index: 20; background: var(--parchment); }
.tb2-brand { display: none; align-items: center; gap: 9px; color: var(--ink); text-decoration: none; font-weight: 600; letter-spacing: -.02em; }
@media (max-width: 767px) { .tb2-brand { display: inline-flex; } }
.tb2-mark { height: 24px; width: auto; display: block; }
.tb2-dot { color: var(--accent-app2); }
.tb2-right { display: flex; align-items: center; gap: 12px; margin-left: auto; }
.tb2-cta { display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 999px; border: 0; cursor: pointer; font: inherit; font-size: .875rem; font-weight: 600; background: var(--accent-app2); color: var(--accent-ink2); }
.tb2-cta svg { width: 16px; height: 16px; }
@media (max-width: 767px) { .tb2-cta span { display: none; } .tb2-cta { padding: 9px; } }
```

Créer `src/components/layout/BottomBarV2.tsx` :

```tsx
import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { CalendarDays, CalendarClock, Compass, User, Heart, LayoutDashboard, Store, Users, type LucideIcon } from 'lucide-react'
import { mobilePrimaryFor, entryState, planForActor, NAV_DEFS } from '@/lib/navModel'
import { AccountSheet } from './AccountSheet'
import './BottomBarV2.css'

const ICONS: Record<string, LucideIcon> = { Compass, CalendarClock, Heart, LayoutDashboard, CalendarDays, Users, Store, User }

function initials(label: string): string {
  return label.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?'
}

export function BottomBarV2() {
  const { currentActor, currentActorRow, person } = useAuth()
  const navigate = useNavigate()
  const [sheetOpen, setSheetOpen] = useState(false)
  const plan = planForActor(currentActor, currentActorRow)
  const keys = mobilePrimaryFor(currentActor)   // 3 liens principaux
  const acctLabel = currentActor?.label ?? person?.display_name ?? 'Moi'
  const acctAvatar = (currentActorRow as { avatar_url?: string | null } | null)?.avatar_url ?? null

  return (
    <>
      <nav className="bb2">
        {keys.map(key => {
          const def = NAV_DEFS[key]
          const Icon = ICONS[def.icon] ?? Compass
          const state = entryState(key, plan)
          const label = def.shortLabel ?? def.label
          if (state === 'active') {
            return (
              <NavLink key={key} to={def.to} className={({ isActive }) => `bb2-link${isActive ? ' bb2-on' : ''}`}>
                <Icon strokeWidth={1.5} />
                <span>{label}</span>
              </NavLink>
            )
          }
          return (
            <button key={key} onClick={() => navigate(def.to)} className="bb2-link bb2-muted">
              <Icon strokeWidth={1.5} />
              <span>{label}</span>
            </button>
          )
        })}
        <button
          className={`bb2-link bb2-account${sheetOpen ? ' bb2-on' : ''}`}
          onClick={() => setSheetOpen(true)}
          aria-label="Compte et options"
        >
          <span className="bb2-av">
            {acctAvatar ? <img src={acctAvatar} alt="" /> : initials(acctLabel)}
          </span>
          <span>Compte</span>
        </button>
      </nav>
      {/* AccountSheet est un composant PARTAGÉ qui porte les jetons de l'app.
          On ne le modifie pas ; s'il jure sur le parchemin, on le repeint sous
          .app2 dans app2.css, comme le theme-toggle. */}
      <AccountSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  )
}
```

```css
/* src/components/layout/BottomBarV2.css */
.bb2 { display: none; }
@media (max-width: 767px) {
  .bb2 {
    display: flex; align-items: stretch; justify-content: space-around;
    position: fixed; inset: auto 0 0 0; z-index: 40;
    padding-bottom: env(safe-area-inset-bottom);
    background: var(--rail-bg);
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    border-top: 1px solid var(--hairline-2);
  }
}
.bb2-link { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; padding: 10px 4px; background: none; border: 0; font: inherit; cursor: pointer; color: var(--ink-soft); text-decoration: none; font-size: .625rem; letter-spacing: .01em; }
.bb2-link svg { width: 21px; height: 21px; }
.bb2-on { color: var(--accent-app2); }
.bb2-muted { opacity: .62; }
.bb2-av { width: 22px; height: 22px; border-radius: 999px; overflow: hidden; display: grid; place-items: center; background: var(--accent-wash2); color: var(--accent-app2); font-size: .5625rem; font-weight: 700; }
.bb2-av img { width: 100%; height: 100%; object-fit: cover; display: block; }
```

- [ ] **Step 4: Créer la coque**

Créer `src/components/layout/AppLayoutV2.tsx` :

```tsx
import { useState, useEffect, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { SidebarV2 } from './SidebarV2'
import { TopbarV2 } from './TopbarV2'
import { BottomBarV2 } from './BottomBarV2'
import { EventForm } from '@/components/events/EventForm'
import { useAuth } from '@/lib/auth'
import { isRouteValidFor } from '@/lib/navModel'
import '@/styles/app2.css'
import './AppLayoutV2.css'

export function AppLayoutV2({ children }: { children: ReactNode }) {
  const [showCreate, setShowCreate] = useState(false)
  const { currentActor } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // Garde de route reprise telle quelle de AppLayout : un acteur qui n'a pas
  // accès à la route courante est renvoyé sur l'Explorer.
  useEffect(() => {
    if (currentActor && !isRouteValidFor(location.pathname, currentActor)) {
      navigate('/explorer', { replace: true })
    }
  }, [currentActor, location.pathname, navigate])

  return (
    <div className="app2">
      <div className="app2-halos" aria-hidden="true">
        <i className="app2-h1" /><i className="app2-h2" /><i className="app2-h3" /><i className="app2-h4" />
      </div>
      <SidebarV2 />
      <div className="app2-stage">
        <TopbarV2 onCreateEvent={() => setShowCreate(true)} />
        <main className="app2-main">{children}</main>
      </div>
      <BottomBarV2 />

      {showCreate && (
        <div className="app2-modal-scrim">
          <div className="app2-modal" onClick={e => e.stopPropagation()}>
            <div className="app2-modal-head">
              <h2>Nouvel événement</h2>
              <button onClick={() => setShowCreate(false)} aria-label="Fermer"><X strokeWidth={2} /></button>
            </div>
            <EventForm onClose={() => setShowCreate(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
```

```css
/* src/components/layout/AppLayoutV2.css */
.app2 { min-height: 100dvh; }
.app2-stage { margin-left: var(--sidebar2-w, 232px); display: flex; flex-direction: column; min-height: 100dvh; }
@media (max-width: 767px) { .app2-stage { margin-left: 0; padding-bottom: calc(5rem + env(safe-area-inset-bottom)); } }
.app2-main { padding: 20px var(--page-padding, 24px) 120px; }
@media (min-width: 1024px) { .app2-main { padding: 24px 46px 120px; } }

.app2-modal-scrim { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(23,20,20,.42); }
.app2-modal { width: 100%; max-width: 32rem; max-height: 85vh; overflow-y: auto; border-radius: 20px; background: var(--surf); padding: 24px; }
.app2-modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.app2-modal-head h2 { font-size: 1.25rem; font-weight: 500; letter-spacing: -.024em; margin: 0; }
.app2-modal-head button { background: none; border: 0; color: var(--ink-soft); cursor: pointer; padding: 8px; border-radius: 999px; }
.app2-modal-head button:hover { background: var(--shade); color: var(--ink); }
```

- [ ] **Step 5: Brancher la route**

Dans `src/App.tsx`, ajouter l'import `import { AppLayoutV2 } from '@/components/layout/AppLayoutV2'` et `import { readV2Switch, APP_V2_PARAM, APP_V2_STORAGE_KEY } from '@/lib/v2-switch'`, puis remplacer la fonction `AuthenticatedApp` (lignes 65-73) par :

```tsx
function AuthenticatedApp({ children }: { children: ReactNode }) {
  // Lu une seule fois au montage : l'interrupteur ne change pas en cours de visite.
  const [v2] = useState(() => readV2Switch(APP_V2_PARAM, APP_V2_STORAGE_KEY))
  const Layout = v2 ? AppLayoutV2 : AppLayout
  return (
    <ProtectedRoute>
      <OnboardingGuard>
        <Layout>{children}</Layout>
      </OnboardingGuard>
    </ProtectedRoute>
  )
}
```

Ajouter `type ReactNode` à l'import de `react` en tête de fichier s'il n'y est pas.

- [ ] **Step 6: Vérifier**

Run: `pnpm lint && pnpm exec vitest run && pnpm build`
Expected: PASS, 0 erreur.

Run: `grep "hsl(#\|hsl(hsl(" dist/assets/*.css`
Expected: **aucune sortie**. C'est la garde anti-régression du format des jetons.

Run: `git diff --stat`
Expected: un seul fichier existant modifié — `src/App.tsx`.

Puis dans le navigateur (`pnpm dev`), connecté :
1. `/tableau-de-bord` → contour V1 intact, thème nuit.
2. `/tableau-de-bord?app2=1` → contour parchemin clair, rail crème, halos. Le Cockpit à l'intérieur est encore la V1 : **c'est attendu à ce stade.**
3. Replier / déplier la barre latérale, vérifier que le contenu se décale.
4. Basculer jour/nuit : le rail, les halos et le `theme-toggle` suivent, aucun trait blanc n'apparaît en nuit.
5. En mobile (largeur < 768 px) : barre latérale masquée, barre du bas visible, rien ne déborde horizontalement.
6. `/tableau-de-bord?app2=0` → retour au contour V1.

- [ ] **Step 7: Commit**

```bash
git add src/styles/app2.css src/components/layout/AppLayoutV2.tsx src/components/layout/AppLayoutV2.css src/components/layout/SidebarV2.tsx src/components/layout/SidebarV2.css src/components/layout/TopbarV2.tsx src/components/layout/TopbarV2.css src/components/layout/BottomBarV2.tsx src/components/layout/BottomBarV2.css src/App.tsx
git commit -m "feat(app2): contour V2 parchemin derriere ?app2=1"
```

---

### Task 4: La frise de saison, en pur

**Files:**
- Create: `src/lib/cockpit-v2.ts`
- Create: `src/lib/cockpit-v2.test.ts`
- Test: `src/lib/cockpit-v2.test.ts`

**Interfaces:**
- Consumes: `SeasonMonth` de `@/lib/cockpit` — `{ year: number; month: number /* 0-11 */; count: number; filled: boolean }`, produit par `aggregateSeason(parts, now)` sur **12 mois glissants à partir du mois courant**.
- Produces:
  - `interface FriseBar { year: number; month: number; count: number; level: 0 | 1 | 2 | 3; isNow: boolean; initial: string }`
  - `friseBars(season: SeasonMonth[]): FriseBar[]`
  - `busiestMonthLabel(season: SeasonMonth[]): string | null`

**Pourquoi une fonction pure :** la frise V2 n'est plus une grille de compteurs mais un histogramme à quatre hauteurs avec un mois « courant » marqué et une phrase « ton mois le plus chargé ». C'est de la logique, et ce projet **ne peut pas tester du JSX** — la convention maison est d'extraire et de tester la fonction.

- [ ] **Step 1: Write the failing test**

Créer `src/lib/cockpit-v2.test.ts` :

```ts
// src/lib/cockpit-v2.test.ts
import { describe, it, expect } from 'vitest'
import { friseBars, busiestMonthLabel } from './cockpit-v2'
import type { SeasonMonth } from './cockpit'

/** 12 mois glissants à partir de `startMonth`, avec les compteurs donnés. */
function season(startYear: number, startMonth: number, counts: number[]): SeasonMonth[] {
  return counts.map((count, i) => {
    const abs = startMonth + i
    return { year: startYear + Math.floor(abs / 12), month: abs % 12, count, filled: count > 0 }
  })
}

describe('friseBars', () => {
  it('rend une barre par mois, dans l\'ordre reçu', () => {
    const bars = friseBars(season(2026, 3, [0,0,1,2,3,0,0,1,1,0,1,2]))
    expect(bars).toHaveLength(12)
    expect(bars[0].month).toBe(3)
    expect(bars[11].month).toBe(2)
    expect(bars[11].year).toBe(2027)
  })

  it('un mois vide a le niveau 0', () => {
    expect(friseBars(season(2026, 0, [0,0,0,0,0,0,0,0,0,0,0,0]))[0].level).toBe(0)
  })

  it('les niveaux montent avec le nombre de dates et plafonnent à 3', () => {
    const bars = friseBars(season(2026, 0, [1,2,3,9,0,0,0,0,0,0,0,0]))
    expect(bars[0].level).toBe(1)
    expect(bars[1].level).toBe(2)
    expect(bars[2].level).toBe(3)
    expect(bars[3].level).toBe(3)
  })

  it('le premier mois de la fenêtre est le mois courant', () => {
    const bars = friseBars(season(2026, 7, [1,0,0,0,0,0,0,0,0,0,0,0]))
    expect(bars[0].isNow).toBe(true)
    expect(bars.slice(1).every(b => !b.isNow)).toBe(true)
  })

  it('porte l\'initiale française du mois', () => {
    const bars = friseBars(season(2026, 0, [0,0,0,0,0,0,0,0,0,0,0,0]))
    expect(bars.map(b => b.initial)).toEqual(['J','F','M','A','M','J','J','A','S','O','N','D'])
  })

  it('une entrée vide en donne une par mois reçu, jamais plus', () => {
    expect(friseBars([])).toHaveLength(0)
    expect(friseBars(season(2026, 0, [0,0,0,0,0,0,0,0,0,0,0,0]))).toHaveLength(12)
  })
})

describe('busiestMonthLabel', () => {
  it('nomme le mois le plus chargé et son nombre de dates', () => {
    expect(busiestMonthLabel(season(2026, 0, [1,0,3,0,0,0,0,0,0,0,0,0])))
      .toBe('Ton mois le plus chargé : mars, 3 dates.')
  })
  it('accorde au singulier', () => {
    expect(busiestMonthLabel(season(2026, 0, [1,0,0,0,0,0,0,0,0,0,0,0])))
      .toBe('Ton mois le plus chargé : janvier, 1 date.')
  })
  it('en cas d\'égalité, le premier mois de la fenêtre gagne', () => {
    expect(busiestMonthLabel(season(2026, 0, [2,0,2,0,0,0,0,0,0,0,0,0])))
      .toBe('Ton mois le plus chargé : janvier, 2 dates.')
  })
  it('saison vide → null (l\'appelant affiche une invitation à la place)', () => {
    expect(busiestMonthLabel(season(2026, 0, [0,0,0,0,0,0,0,0,0,0,0,0]))).toBeNull()
    expect(busiestMonthLabel([])).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/cockpit-v2.test.ts`
Expected: FAIL — `Failed to resolve import "./cockpit-v2"`.

- [ ] **Step 3: Write minimal implementation**

Créer `src/lib/cockpit-v2.ts` :

```ts
// src/lib/cockpit-v2.ts
// Logique de présentation du Cockpit V2. Elle vit ici, en fonctions pures, parce
// que ce projet ne peut pas tester du JSX (React 19 + RTL 16 ne flushent pas les
// rendus concurrents en synchrone). Le composant n'est qu'une coquille.
import type { SeasonMonth } from './cockpit'

/** Initiale française du mois, index 0-11. Deux J, deux M, deux A : c'est voulu,
 *  la frise porte l'initiale seule comme dans la maquette. */
const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const MONTH_NAMES = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

export interface FriseBar {
  year: number
  month: number
  count: number
  /** Hauteur de la barre : 0 = socle (mois vide), 3 = plafond. */
  level: 0 | 1 | 2 | 3
  /** Le mois courant — toujours le premier de la fenêtre glissante. */
  isNow: boolean
  initial: string
}

function levelFor(count: number): 0 | 1 | 2 | 3 {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  return 3
}

export function friseBars(season: SeasonMonth[]): FriseBar[] {
  return season.map((m, i) => ({
    year: m.year,
    month: m.month,
    count: m.count,
    level: levelFor(m.count),
    isNow: i === 0,
    initial: MONTH_INITIALS[m.month],
  }))
}

/** La phrase sous la frise. `null` quand la saison est vide : l'appelant affiche
 *  alors une invitation à trouver des dates plutôt qu'un superlatif sur zéro. */
export function busiestMonthLabel(season: SeasonMonth[]): string | null {
  let best: SeasonMonth | null = null
  for (const m of season) {
    if (m.count > 0 && (best === null || m.count > best.count)) best = m
  }
  if (!best) return null
  const plural = best.count > 1 ? 's' : ''
  return `Ton mois le plus chargé : ${MONTH_NAMES[best.month]}, ${best.count} date${plural}.`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/cockpit-v2.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/cockpit-v2.ts src/lib/cockpit-v2.test.ts
git commit -m "feat(cockpit2): frise de saison et mois le plus charge, en pur"
```

---

### Task 5: Le Cockpit V2 — le haut de page

**Files:**
- Create: `src/pages/CockpitV2.tsx`
- Create: `src/pages/CockpitV2.css`
- Create: `src/components/cockpit-v2/ProchainFestivalV2.tsx`
- Create: `src/components/cockpit-v2/SaisonFriseV2.tsx`
- Modify: `src/App.tsx` (route `/tableau-de-bord`)

**Interfaces:**
- Consumes: `friseBars`, `busiestMonthLabel` (Task 4) ; `useMyParticipations`, `useMyReports`, `useMyLedger` ; `selectNextFestival`, `aggregateSeason` de `@/lib/cockpit` ; `participationChip` de `@/lib/explorer` ; `eventPath` de `@/lib/event-link` ; `ParticipationWithEvent` de `@/types/database` (le champ affiche est `events.image_url`).
- Produces: `<CockpitV2Page />`, `<ProchainFestivalV2 participation={…} />`, `<SaisonFriseV2 season={…} />`.

**L'affiche :** `ProchainFestival` V1 affiche déjà `ev.image_url` avec un repli. La maquette `v2-app-clair.html` avait régressé vers des illustrations SVG dessinées, procédé rejeté le même soir sur la vitrine. **On garde l'affiche réelle**, repli = aplat dégradé `--photo-a` → `--photo-b`.

- [ ] **Step 1: Écrire la page et ses deux blocs du haut**

Créer `src/components/cockpit-v2/ProchainFestivalV2.tsx` :

```tsx
import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { participationChip } from '@/lib/explorer'
import { eventPath } from '@/lib/event-link'
import type { ParticipationWithEvent } from '@/types/database'

interface Props {
  participation: ParticipationWithEvent | null
}

function daysUntil(start: Date, now: Date): number {
  const ms = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
    - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round(ms / 86_400_000)
}

export function ProchainFestivalV2({ participation }: Props) {
  const now = new Date()

  if (!participation) {
    return (
      <div className="ck2-block ck2-next-empty">
        <span className="app2-label">Prochain festival</span>
        <p className="app2-muted">Aucun festival confirmé à venir.</p>
        <Link to="/explorer" className="ck2-btn"><Compass strokeWidth={2} /> Explorer les festivals</Link>
      </div>
    )
  }

  const ev = participation.events
  const start = new Date(ev.start_date)
  const dleft = daysUntil(start, now)
  const chip = participationChip(participation.status, participation.payment_status, 'entity')
  const dateLabel = start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  const when = dleft > 0 ? `Dans ${dleft} jour${dleft > 1 ? 's' : ''}` : dleft === 0 ? 'Jour J' : 'En cours'

  return (
    <Link to={eventPath(ev)} className="ck2-block ck2-next">
      {/* Seul objet de la page à porter un rayon et une ombre : c'est une image. */}
      <div className="ck2-poster">
        {ev.image_url
          ? <img src={ev.image_url} alt={ev.name} />
          : <div className="ck2-poster-fallback" aria-hidden="true" />}
      </div>
      <div className="ck2-next-in">
        <span className="app2-label">Prochain festival</span>
        <span className="ck2-next-name">{ev.name}</span>
        <span className="app2-muted">
          {dateLabel} · {ev.city}{ev.department ? `, ${ev.department}` : ''}
        </span>
        <span className="ck2-badge">{when}</span>
        {chip?.label && <span className="app2-faint">{chip.label.replace(/^[\W]+/, '').trim()}</span>}
      </div>
    </Link>
  )
}
```

Créer `src/components/cockpit-v2/SaisonFriseV2.tsx` :

```tsx
import { Link } from 'react-router-dom'
import { friseBars, busiestMonthLabel } from '@/lib/cockpit-v2'
import type { SeasonMonth } from '@/lib/cockpit'

interface Props {
  season: SeasonMonth[]
}

export function SaisonFriseV2({ season }: Props) {
  const bars = friseBars(season)
  const busiest = busiestMonthLabel(season)
  const total = season.reduce((s, m) => s + m.count, 0)
  const months = season.length // fenêtre glissante, 12 mois par construction (cf. aggregateSeason)

  return (
    <div className="ck2-block ck2-frise">
      <div className="ck2-block-head">
        <span className="app2-label">Ta saison</span>
        <span className="app2-faint">{total} date{total > 1 ? 's' : ''} sur {months} mois</span>
      </div>
      <div className="ck2-frise-track">
        {bars.map(b => (
          <i
            key={`${b.year}-${b.month}`}
            className={`ck2-bar ck2-lv${b.level}${b.isNow ? ' ck2-now' : ''}`}
            title={`${b.count} date${b.count > 1 ? 's' : ''}`}
          />
        ))}
      </div>
      <div className="ck2-frise-months">
        {bars.map(b => <span key={`${b.year}-${b.month}-l`}>{b.initial}</span>)}
      </div>
      {busiest
        ? <p className="app2-faint">{busiest}</p>
        : <p className="app2-faint">Ta saison est à construire. <Link to="/explorer">Trouve des dates →</Link></p>}
    </div>
  )
}
```

Créer `src/pages/CockpitV2.tsx` :

```tsx
import { useMemo } from 'react'
import { useAuth } from '@/lib/auth'
import { useMyParticipations } from '@/hooks/use-participations'
import { selectNextFestival, aggregateSeason } from '@/lib/cockpit'
import { ProchainFestivalV2 } from '@/components/cockpit-v2/ProchainFestivalV2'
import { SaisonFriseV2 } from '@/components/cockpit-v2/SaisonFriseV2'
import './CockpitV2.css'

function initials(label: string): string {
  return label.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?'
}

export function CockpitV2Page() {
  const { currentActor, currentActorRow } = useAuth()
  const { participations, loading } = useMyParticipations()

  const now = useMemo(() => new Date(), [])
  const nextFestival = useMemo(() => selectNextFestival(participations, now), [participations, now])
  const season = useMemo(() => aggregateSeason(participations, now), [participations, now])

  const name = currentActor?.label ?? ''
  const avatarUrl = currentActorRow?.avatar_url ?? null

  return (
    <div className="ck2">
      <div className="ck2-top">
        <span className="ck2-av">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{initials(name)}</span>}
        </span>
        <div>
          <h1 className="app2-title">Bonjour {name}</h1>
          <p className="app2-sub">Ta prochaine action</p>
        </div>
      </div>

      {loading ? (
        <div className="ck2-grid-2">
          <div className="ck2-block ck2-skel" /><div className="ck2-block ck2-skel" />
        </div>
      ) : (
        <div className="ck2-grid-2">
          <ProchainFestivalV2 participation={nextFestival} />
          <SaisonFriseV2 season={season} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Écrire le CSS de la page**

Créer `src/pages/CockpitV2.css` :

```css
/* src/pages/CockpitV2.css — préfixe ck2- obligatoire (CSS globaux). */
.ck2 { display: flex; flex-direction: column; gap: 44px; max-width: 1080px; }

.ck2-top { display: flex; align-items: center; gap: 16px; }
.ck2-av { width: 52px; height: 52px; border-radius: 999px; flex: none; overflow: hidden; background: var(--accent-wash2); color: var(--accent-app2); display: grid; place-items: center; font-weight: 700; font-size: 1rem; }
.ck2-av img { width: 100%; height: 100%; object-fit: cover; display: block; }

/* Un bloc : un fond à peine décalé du parchemin. Ni bordure, ni ombre. */
.ck2-block { border: 0; border-radius: 20px; background: var(--block); box-shadow: none; padding: 24px 26px 26px; display: flex; flex-direction: column; gap: 14px; }
.ck2-block-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }

.ck2-grid-2 { display: grid; grid-template-columns: 1.3fr 1fr; gap: 22px; }
@media (max-width: 900px) { .ck2-grid-2 { grid-template-columns: 1fr; } }

.ck2-next { display: grid; grid-template-columns: 190px 1fr; gap: 24px; align-items: center; text-decoration: none; color: inherit; }
@media (max-width: 600px) { .ck2-next { grid-template-columns: 120px 1fr; gap: 16px; } }
/* Seules les images ont un rayon et une ombre. */
.ck2-poster { overflow: hidden; border-radius: 18px; aspect-ratio: 4 / 3.4; box-shadow: var(--lift); }
.ck2-poster img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ck2-poster-fallback { width: 100%; height: 100%; background: linear-gradient(160deg, var(--photo-a), var(--photo-b)); }
.ck2-next-in { display: flex; flex-direction: column; gap: 9px; min-width: 0; }
.ck2-next-name { font-size: 1.375rem; font-weight: 500; letter-spacing: -.028em; line-height: 1.15; }
.ck2-next-empty { align-items: flex-start; }

.ck2-badge { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; padding: 6px 14px; border-radius: 999px; font-size: .75rem; font-weight: 600; background: var(--accent-app2); color: var(--accent-ink2); }
.ck2-btn { display: inline-flex; align-items: center; gap: 8px; align-self: flex-start; padding: 9px 16px; border-radius: 999px; background: var(--accent-app2); color: var(--accent-ink2); text-decoration: none; font-size: .875rem; font-weight: 600; }
.ck2-btn svg { width: 16px; height: 16px; }

.ck2-frise-track { display: flex; align-items: flex-end; gap: 5px; height: 78px; }
.ck2-bar { flex: 1; border-radius: 5px 5px 3px 3px; display: block; background: var(--surf-2); border: 1px solid var(--hairline-2); height: 14px; }
.ck2-lv1, .ck2-lv2, .ck2-lv3 { background: var(--accent-wash2); border-color: transparent; }
.ck2-lv1 { height: 46px; } .ck2-lv2 { height: 62px; } .ck2-lv3 { height: 78px; }
.ck2-now { background: var(--accent-app2); border-color: transparent; }
.ck2-frise-months { display: flex; gap: 5px; }
.ck2-frise-months span { flex: 1; text-align: center; font-size: .625rem; color: var(--ink-faint); text-transform: uppercase; letter-spacing: .06em; }

.ck2-skel { min-height: 200px; background: var(--block-2); }
```

- [ ] **Step 3: Brancher la route**

Dans `src/App.tsx`, ajouter `import { CockpitV2Page } from '@/pages/CockpitV2'` et remplacer la ligne 146 par :

```tsx
          <Route path="/tableau-de-bord" element={<AuthenticatedApp><ProGate title="Cockpit"><CockpitRoute /></ProGate></AuthenticatedApp>} />
```

et ajouter, à côté de `LandingRoute` :

```tsx
function CockpitRoute() {
  const [v2] = useState(() => readV2Switch(APP_V2_PARAM, APP_V2_STORAGE_KEY))
  return v2 ? <CockpitV2Page /> : <CockpitPage />
}
```

- [ ] **Step 4: Vérifier**

Run: `pnpm lint && pnpm exec vitest run && pnpm build && grep "hsl(#\|hsl(hsl(" dist/assets/*.css`
Expected: PASS, et **aucune sortie** du grep.

Run: `git diff --stat`
Expected: un seul fichier existant modifié — `src/App.tsx`.

Dans le navigateur, `/tableau-de-bord?app2=1` : la carte « Prochain festival » montre la vraie affiche (ou l'aplat teinté si l'événement n'en a pas), la frise a douze barres dont la première est en accent plein, la phrase « ton mois le plus chargé » est juste. Vérifier aussi un acteur **sans aucune date** : la carte affiche « Aucun festival confirmé à venir » et la frise son invitation, sans rien casser.

- [ ] **Step 5: Commit**

```bash
git add src/pages/CockpitV2.tsx src/pages/CockpitV2.css src/components/cockpit-v2/ProchainFestivalV2.tsx src/components/cockpit-v2/SaisonFriseV2.tsx src/App.tsx
git commit -m "feat(cockpit2): haut de page — prochain festival et frise de saison"
```

---

### Task 6: Le Cockpit V2 — les trois colonnes

**Files:**
- Create: `src/components/cockpit-v2/AReglerV2.tsx`
- Create: `src/components/cockpit-v2/CompagnonsV2.tsx`
- Create: `src/components/cockpit-v2/MesBilansV2.tsx`
- Modify: `src/pages/CockpitV2.tsx`
- Modify: `src/pages/CockpitV2.css`

**Interfaces:**
- Consumes: `selectAReglerItems(participations, now)` ; `useMyLedger(): { entriesByEvent: Map<string, LedgerEntry[]> }` ; `useMyReports(): { reportsByEvent }` ; `useCommunityFeed(): { convergences, loading }` ; `participationChip` de `@/lib/explorer` ; `avatarColor` de `@/lib/community` ; `eventPath`, `eventShareUrl` de `@/lib/event-link`.
- Produces: `<AReglerV2 participations entriesByEvent />`, `<CompagnonsV2 />`, `<MesBilansV2 participations entriesByEvent onSaved />`.

**⚠️ Deux pièges relevés en revue du plan — la maquette ment sur ces deux blocs :**

1. **Les montants sont en EUROS, pas en centimes.** `LedgerEntry.amount` est un nombre d'euros. Et « à régler » n'est **pas** une somme de lignes : c'est **la** ligne emplacement, celle qui a `source === 'stepper'` **et** `direction === 'out'`, et seulement si elle est `> 0`. Une somme de toutes les lignes afficherait un montant faux.
2. **« Compagnons de route » n'est pas « Marie · 4 dates avec toi ».** C'est ce que montre la maquette, et ça n'existe pas dans le code. Le vrai bloc affiche des **convergences** : « Vous serez 5 réunis » + le nom de l'événement + une pile d'avatars, filtrées sur les seuls festivals où l'acteur est **engagé** (tout sauf `interesse`, `refuse`, `en_cours`). On garde le modèle réel — inventer celui de la maquette demanderait une requête qui n'existe pas.

- [ ] **Step 1: Écrire le bloc « À régler »**

Créer `src/components/cockpit-v2/AReglerV2.tsx`. La logique de montant et le plafond à 5 lignes sont **repris à l'identique** de `src/components/cockpit/AReglerFinaliser.tsx` ; seuls le balisage et les classes changent.

```tsx
import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { eventPath } from '@/lib/event-link'
import { participationChip } from '@/lib/explorer'
import type { ParticipationWithEvent, LedgerEntry } from '@/types/database'

interface Props {
  participations: ParticipationWithEvent[]
  entriesByEvent: Map<string, LedgerEntry[]>
}

/** Montant à régler = LA ligne « emplacement » (stepper + out) si elle est renseignée.
 *  Jamais une somme : les autres lignes du grand livre sont des recettes et des frais.
 *  `amount` est en EUROS. Repris tel quel de AReglerFinaliser.tsx. */
function dueAmount(entries: LedgerEntry[] | undefined): number | null {
  if (!entries) return null
  const empl = entries.find(e => e.source === 'stepper' && e.direction === 'out')
  return empl && empl.amount > 0 ? empl.amount : null
}

export function AReglerV2({ participations, entriesByEvent }: Props) {
  const visible = participations.slice(0, 5)
  const extra = participations.length - visible.length

  return (
    <div className="ck2-block">
      <div className="ck2-block-head">
        <h3 className="ck2-h3">À régler</h3>
        {participations.length > 0 && (
          <Link to="/calendrier" className="app2-faint">{extra > 0 ? `${participations.length} ›` : 'tout ›'}</Link>
        )}
      </div>

      {participations.length === 0 ? (
        <p className="app2-muted ck2-allset"><CheckCircle2 strokeWidth={1.8} /> Tout est à jour</p>
      ) : (
        <div className="ck2-list">
          {visible.map(p => {
            const ev = p.events
            const chip = participationChip(p.status, p.payment_status, 'entity')
            const due = dueAmount(entriesByEvent.get(ev.id))
            // Bille : ambre tant que ce n'est pas réglé, vert quand ça l'est.
            const settled = chip?.variant === 'inscrit' || chip?.variant === 'accepte'
            return (
              <Link key={p.id} to={eventPath(ev)} className="ck2-li">
                <span className={`ck2-dot ${settled ? 'ck2-ok' : 'ck2-wait'}`} aria-hidden="true" />
                <span className="ck2-txt">
                  <span className="ck2-t">{ev.name}</span>
                  <span className="ck2-s">
                    {ev.city} · {new Date(ev.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                </span>
                {due != null && <span className="ck2-amount">{due.toLocaleString('fr-FR')} €</span>}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Écrire le bloc « Compagnons »**

Créer `src/components/cockpit-v2/CompagnonsV2.tsx`. Le filtre sur les festivals engagés et le plafond à 5 sont **repris à l'identique** de `src/components/cockpit/CompagnonsDeRoute.tsx`. Le bouton de partage et sa `ShareModal` ne sont **pas** portés : 0007 bannit les gélules décoratives et une action secondaire par ligne alourdit le bloc — le partage reste disponible sur la fiche de l'événement.

```tsx
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCommunityFeed } from '@/hooks/use-community'
import { useMyParticipations } from '@/hooks/use-participations'
import { avatarColor } from '@/lib/community'
import { eventPath } from '@/lib/event-link'

export function CompagnonsV2() {
  const { convergences, loading } = useCommunityFeed()
  const { participations } = useMyParticipations()

  // Ne garder que les convergences sur MES festivals engagés (inscrit / accepté /
  // en attente de paiement), pas les simplement repérés ni dossier en cours.
  const engagedEventIds = useMemo(
    () => new Set(
      participations
        .filter(p => !['interesse', 'refuse', 'en_cours'].includes(p.status as string))
        .map(p => p.event_id),
    ),
    [participations],
  )
  const filtered = useMemo(
    () => convergences.filter(c => engagedEventIds.has(c.event.id)),
    [convergences, engagedEventIds],
  )
  const visible = filtered.slice(0, 5)
  const extra = filtered.length - visible.length

  return (
    <div className="ck2-block">
      <div className="ck2-block-head">
        <h3 className="ck2-h3">Compagnons</h3>
        {filtered.length > 0 && (
          <Link to="/communaute" className="app2-faint">{extra > 0 ? `${filtered.length} ›` : 'tout ›'}</Link>
        )}
      </div>

      {loading ? (
        <p className="app2-muted">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="app2-muted">Suis des compagnons pour voir où ils exposent. <Link to="/communaute">Suggestions →</Link></p>
      ) : (
        <div className="ck2-list">
          {visible.map(c => (
            <Link key={c.event.id} to={eventPath(c.event)} className="ck2-li">
              <span className="ck2-faces">
                {c.sample.slice(0, 3).map((a, i) => (
                  <span key={a.actorId} className="ck2-face"
                    style={{ background: a.avatarUrl ? 'transparent' : avatarColor(a.label), zIndex: 3 - i }}>
                    {a.avatarUrl ? <img src={a.avatarUrl} alt="" /> : a.label[0]?.toUpperCase()}
                  </span>
                ))}
              </span>
              <span className="ck2-txt">
                <span className="ck2-t">Vous serez {c.count} réunis</span>
                <span className="ck2-s">{c.event.name}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Écrire le bloc « Mes bilans »**

Créer `src/components/cockpit-v2/MesBilansV2.tsx`. Avant d'écrire, lire `src/components/cockpit/MesBilans.tsx` et **reprendre son calcul de net et son ouverture de `BilanModal` à l'identique** — comme pour « À régler », le montant est un piège : ne rien recalculer de mémoire. Rendu : `.ck2-block` + `.ck2-list`, une ligne par bilan (nom, mois et durée en `.ck2-s`, net en `.ck2-amount` avec `.ck2-pos` quand il est positif), et une dernière ligne « Total net » sur le même modèle.

- [ ] **Step 4: Ajouter le CSS des listes**

Ajouter à la fin de `src/pages/CockpitV2.css` :

```css
.ck2-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
@media (max-width: 1100px) { .ck2-grid-3 { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 700px) { .ck2-grid-3 { grid-template-columns: 1fr; } }

.ck2-h3 { font-size: .9375rem; font-weight: 600; letter-spacing: -.012em; margin: 0; }
.ck2-list { display: flex; flex-direction: column; }
.ck2-li { display: flex; align-items: center; gap: 13px; padding: 15px 0; border-top: 1px solid var(--hairline-2); text-decoration: none; color: inherit; }
.ck2-li:first-of-type { border-top: 0; }
.ck2-li:hover .ck2-t { color: var(--accent-app2); }
.ck2-txt { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.ck2-t { font-size: .9375rem; font-weight: 600; letter-spacing: -.012em; }
.ck2-s { font-size: .8125rem; color: var(--ink-soft); }
.ck2-amount { font-size: .875rem; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
.ck2-pos { color: var(--ok); }

/* Les billes de statut : la couleur revient, elle dit l'état plus vite qu'une
   forme. Halo doux autour, jamais de bordure. */
.ck2-dot { width: 10px; height: 10px; border-radius: 999px; display: inline-block; flex: none; }
.ck2-ok { background: var(--ok); box-shadow: 0 0 0 4px var(--ok-wash); }
.ck2-wait { background: var(--wait); box-shadow: 0 0 0 4px var(--wait-wash); }

/* Pile d'avatars : les visages se chevauchent, sans anneau de contour (0007
   bannit les bordures). La superposition suffit à les séparer. */
.ck2-faces { display: inline-flex; flex: none; }
.ck2-faces .ck2-face + .ck2-face { margin-left: -10px; }
.ck2-face { width: 30px; height: 30px; border-radius: 999px; overflow: hidden; flex: none; display: grid; place-items: center; background: var(--accent-wash2); color: var(--accent-ink2); font-size: .75rem; font-weight: 700; position: relative; }
.ck2-face img { width: 100%; height: 100%; object-fit: cover; display: block; }

.ck2-allset { display: flex; align-items: center; gap: 8px; color: var(--ok); }
.ck2-allset svg { width: 16px; height: 16px; }
```

- [ ] **Step 5: Brancher les trois blocs dans la page**

Dans `src/pages/CockpitV2.tsx`, ajouter les hooks `useMyReports` / `useMyLedger` et le sélecteur `selectAReglerItems` (mêmes appels que `Cockpit.tsx` lignes 27-29 et 56), puis sous la grille du haut :

```tsx
        <div className="ck2-grid-3">
          <AReglerV2 participations={aRegler} entriesByEvent={entriesByEvent} />
          <CompagnonsV2 />
          <MesBilansV2 participations={participations} entriesByEvent={entriesByEvent} onSaved={() => { refetchReports(); refetchLedger() }} />
        </div>
```

- [ ] **Step 6: Vérifier**

Run: `pnpm lint && pnpm exec vitest run && pnpm build && grep "hsl(#\|hsl(hsl(" dist/assets/*.css`
Expected: PASS, aucune sortie du grep.

Dans le navigateur : les trois colonnes s'affichent, les billes ambre/vert sont lisibles **dans les deux thèmes**, les montants sont alignés (chiffres tabulaires), et la grille retombe en 2 puis 1 colonne en rétrécissant sans jamais provoquer de défilement horizontal.

**Vérification du montant, en dur :** prendre un festival dont le tarif d'emplacement est connu et vérifier que « À régler » affiche **ce tarif**, pas un total. Un montant divisé par 100 ou multiplié par le nombre de lignes du grand livre = le piège décrit plus haut, à corriger avant de commiter.

- [ ] **Step 7: Commit**

```bash
git add src/components/cockpit-v2 src/pages/CockpitV2.tsx src/pages/CockpitV2.css
git commit -m "feat(cockpit2): les trois colonnes — a regler, compagnons, bilans"
```

---

### Task 7: Les trois blocs remis au régime

**Files:**
- Create: `src/components/cockpit-v2/BilanLigneV2.tsx`
- Create: `src/components/cockpit-v2/AVenirV2.tsx`
- Create: `src/components/cockpit-v2/DossiersRefusesV2.tsx`
- Modify: `src/pages/CockpitV2.tsx`
- Modify: `src/pages/CockpitV2.css`

**Interfaces:**
- Consumes: `detectBilanPrompt`, `selectUpcomingFestivals`, `selectRefusedDossiers` de `@/lib/cockpit` ; `todayKey`, `snoozedSetForDay`, `addSnooze`, `readSnoozeMap`, `writeSnoozeMap` de `@/lib/bilan-snooze` ; `BilanModal` de `@/components/reports/BilanModal` ; `updateParticipation` de `@/hooks/use-participations`.
- Produces: `<BilanLigneV2 prompt onSaved onSnooze />`, `<AVenirV2 participations />`, `<DossiersRefusesV2 participations onUpdated />`.

**La décision d'Uriel :** les trois sont **gardés**, mais remis au régime. Le bandeau bilan devient une ligne calme au lieu d'un bandeau coloré à trois boutons ; « À VENIR » devient une liste sobre et **perd sa classe `grain`** (0007 bannit les trames — elles produisaient un effet grillagé) ; les dossiers refusés sont **repliés par défaut** et ne s'ouvrent qu'à la demande.

- [ ] **Step 1: La ligne bilan**

`BilanLigneV2` reprend la logique de `BilanBanner.tsx` (mêmes props, même `BilanModal`, même snooze) et rend :

```tsx
    <div className="ck2-bilan">
      <span className="ck2-dot ck2-wait" aria-hidden="true" />
      <span className="ck2-bilan-txt">
        Comment s'est passé <b>{p.events.name}</b> ?
        {prompt.extraCount > 0 && <span className="app2-faint"> +{prompt.extraCount} en attente</span>}
      </span>
      <button className="ck2-bilan-go" onClick={() => setOpen(true)}>Remplir mon bilan</button>
      <button className="ck2-bilan-later" onClick={() => onSnooze(p.event_id)} aria-label="Plus tard">Plus tard</button>
    </div>
```

Une seule action visible, « plus tard » en lien discret, plus de croix séparée (elle faisait double emploi avec « plus tard », qui produit déjà le même effet).

- [ ] **Step 2: La liste « À venir »**

`AVenirV2` reprend `ProchainsFestivals.tsx` — **y compris son `chipToStatusVar`**, mais en le remappant sur les jetons du calque : les statuts confirmés prennent `var(--ok)`, les statuts en attente `var(--wait)`. Rendu : un `.ck2-block` avec le libellé « À venir » et une `.ck2-list` de quatre lignes maximum, plus « +N autres » en pied. **Ne pas reporter la classe `grain`.**

- [ ] **Step 3: Les dossiers refusés, repliés**

`DossiersRefusesV2` reprend `DossiersRefuses.tsx` (même `updateParticipation`, même sauvegarde de la note au `onBlur`) mais dans un `<details>` fermé par défaut :

```tsx
    <details className="ck2-refus">
      <summary>
        <span className="app2-label">Dossiers refusés</span>
        <span className="app2-faint">{participations.length}</span>
      </summary>
      <div className="ck2-list">{/* … les lignes, identiques à la V1 … */}</div>
    </details>
```

CSS : `.ck2-refus summary { cursor: pointer; list-style: none; display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }` et `.ck2-refus summary::-webkit-details-marker { display: none; }`.

- [ ] **Step 4: Brancher dans la page**

La ligne bilan se place **juste sous le bandeau « Bonjour »**, avant la grille du haut. « À venir » se place entre la grille du haut et les trois colonnes. Les dossiers refusés ferment la page. Reprendre de `Cockpit.tsx` l'état de snooze (lignes 46-52) et les sélecteurs (lignes 55-62) tels quels.

- [ ] **Step 5: Vérifier**

Run: `pnpm lint && pnpm exec vitest run && pnpm build && grep "hsl(#\|hsl(hsl(" dist/assets/*.css`
Expected: PASS, aucune sortie du grep.

Run: `grep -rn "grain" src/components/cockpit-v2/ src/pages/CockpitV2.css`
Expected: **aucune sortie** — la trame est bannie par 0007.

Dans le navigateur : avec un événement terminé et sans bilan, la ligne apparaît ; « Plus tard » la fait disparaître et elle **ne revient pas** après rechargement le même jour ; le bloc des dossiers refusés est fermé au chargement et la note se sauvegarde bien à la perte de focus une fois ouvert.

- [ ] **Step 6: Commit**

```bash
git add src/components/cockpit-v2 src/pages/CockpitV2.tsx src/pages/CockpitV2.css
git commit -m "feat(cockpit2): ligne bilan, a venir et dossiers refuses au regime"
```

---

### Task 8: Recette et livraison

**Files:**
- Create: `docs/decisions/assets/v2-app-cockpit-jour.png`
- Create: `docs/decisions/assets/v2-app-cockpit-nuit.png`
- Create: `docs/decisions/assets/v2-app-cockpit-mobile.png`
- Modify: `xo-status.md`

- [ ] **Step 1: La garde anti-régression complète**

```bash
pnpm lint
pnpm exec vitest run
pnpm build
grep "hsl(#\|hsl(hsl(" dist/assets/*.css
```

Expected: lint 0 erreur, tous les tests verts, build OK, grep **sans aucune sortie**.

- [ ] **Step 2: Prouver que la V1 est intacte**

```bash
git diff --stat main@{u} -- src/ index.html
```

Expected: les seuls fichiers **existants** modifiés sont `src/App.tsx`, `src/lib/theme.ts`, `src/lib/theme.test.ts`, `src/lib/landing-v2.ts`, `src/hooks/use-theme.tsx`, `index.html`. Aucun `*.css` existant, aucun composant existant, aucune page existante. Si un autre fichier apparaît, c'est une régression : l'annuler avant d'aller plus loin.

- [ ] **Step 3: Captures jour / nuit / mobile**

Prendre trois captures de `/tableau-de-bord?app2=1` (connecté, sur un compte qui a des dates) : thème clair en 1440 px, thème sombre en 1440 px, thème clair en 390 px. Les déposer dans `docs/decisions/assets/` aux noms ci-dessus.

Vérifier sur les captures : aucun trait blanc en sombre, aucune icône noire, aucun débordement horizontal, le logo sans coin arrondi, les billes de statut lisibles dans les deux thèmes.

- [ ] **Step 4: Passer les cas limites**

1. **Compte sans aucune date** — l'état n'a jamais été maquetté (ouvert dans la spec) : la page ne doit montrer que le bandeau « Bonjour », la carte vide et l'invitation de la frise. Rien ne doit être cassé ni vide-avec-cadre.
2. **Événement sans affiche** → aplat teinté, jamais de cadre vide.
3. **`?app2=0`** → retour complet à la V1, et `localStorage.flwsh-app-v2` effacé.
4. **Navigation privée** (aucun `localStorage`) → V1 par défaut, en nuit.

- [ ] **Step 5: Mettre le statut à jour**

Dans `xo-status.md` : `updated` à la date du jour, `summary` et `next_step` en français clair, **entre guillemets droits**, sans jargon ni chemin de fichier. Ajouter en mémoire de travail ce qui a été livré et ce qui reste ouvert (l'état « Cockpit vide », la bascule par défaut, les huit écrans encore en « Nuit de Festival »).

- [ ] **Step 6: Commit et pousser**

```bash
git add docs/decisions/assets/v2-app-cockpit-*.png xo-status.md
git commit -m "chore(xo): Cockpit V2 parchemin livre derriere ?app2=1"
git push origin main
```

- [ ] **Step 7: Le verdict**

Envoyer à Uriel le lien `https://flw.sh/tableau-de-bord?app2=1` et lui demander de trancher sur ordinateur **et** sur téléphone. C'est le seul verdict qui compte : rien n'est « fait » avant qu'il ait regardé.
