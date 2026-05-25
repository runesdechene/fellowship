# DA « Nuit de Festival » — Socle design system — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser le socle visuel « Nuit de Festival » (tokens, thème dual nuit/jour persisté & global, calque d'ambiance `bgfx`, toggle, primitives recolorées) dont toutes les pages hériteront — sans encore refondre page par page.

**Architecture :** L'app n'utilise presque que les tokens sémantiques Tailwind (`bg-background`, `bg-card`, `text-foreground`, `border-border`, `bg-primary`…) — seulement **4 occurrences de `dark:`** dans tout le code. On recolore donc toute l'app en **remappant les tokens dans `src/index.css`** : **nuit = `:root` par défaut**, **jour = override `.light`** (exactement comme la maquette `body.light`). On bascule les tokens de couleur de triplets-HSL vers **valeurs de couleur brutes** (hex/rgba/hsl) pour coller verbatim aux valeurs de la maquette (dont la bordure translucide). Le thème est appliqué **globalement + persisté** (nuit par défaut), avec un script anti-flash inline. On ajoute un calque `bgfx` fixe (halos) et on recolore les primitives `Button`/`Card`. Référence visuelle officielle : `docs/decisions/assets/landing-founding-theme.html` (décision 0001 §9).

**Tech Stack :** React 19, TypeScript, Tailwind CSS v4 (config CSS-first dans `src/index.css`, `@theme inline`), Vitest, lucide-react.

**Hors périmètre (plans aval) :** intégration des 13 maquettes page par page (landing, onboarding, explorer, dashboard, calendrier, communauté, mes-dates, mes-créateurs, vitrine, festival, boutique-pricing, groupes, festivalier-mesdates) ; asset logo Jakarta ; imagerie produit ; désaturation fine de la DA (point ouvert décision 0001 §10).

---

## File Structure

- **Create** `src/lib/theme.ts` — logique pure du thème (`Theme`, `THEME_STORAGE_KEY`, `getInitialTheme`, `applyTheme`). Testable sans DOM render.
- **Create** `src/lib/theme.test.ts` — tests Vitest de la logique pure.
- **Modify** `src/hooks/use-theme.ts` — réécrit pour consommer `theme.ts` (nuit par défaut, `night|day`, persisté).
- **Modify** `src/components/theme-toggle.tsx` — toggle « lune↔soleil » à curseur glissant (mécanique maquette).
- **Create** `src/components/layout/Bgfx.tsx` — calque fixe plein écran (halos) monté une fois.
- **Modify** `src/index.css` — remap complet des tokens (nuit `:root` / jour `.light`), tokens de marque, `@theme inline` en valeurs brutes, styles `.bgfx` + navbar verre dépoli + toggle, FAB sur token gradient.
- **Modify** `index.html` — script anti-flash inline (applique `.light` avant paint), `theme-color` nuit.
- **Modify** `src/main.tsx` — monte le provider de thème + `Bgfx` globalement (app **et** pages publiques).
- **Modify** `src/components/ui/button.tsx` — `default` = dégradé copper, `ghost`/`outline` ajustés.
- **Modify** `src/App.tsx` / `src/components/layout/AppLayout.tsx` — laisser passer le `bgfx` (conteneur transparent).
- **Modify** 3 fichiers à `dark:` (`src/pages/EventPage.tsx`, `src/components/ui/toast.tsx`, `src/components/theme-toggle.tsx`) — neutraliser les `dark:` orphelins (nuit n'a plus de classe `.dark`).

---

## Task 1: Logique pure du thème (`src/lib/theme.ts`)

**Files:**
- Create: `src/lib/theme.ts`
- Test: `src/lib/theme.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
// src/lib/theme.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { getInitialTheme, applyTheme, THEME_STORAGE_KEY } from './theme'

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('défaut = night quand rien en storage', () => {
    expect(getInitialTheme()).toBe('night')
  })

  it('lit le thème persisté', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'day')
    expect(getInitialTheme()).toBe('day')
  })

  it('ignore une valeur storage invalide et retombe sur night', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'banana')
    expect(getInitialTheme()).toBe('night')
  })

  it('applyTheme("day") ajoute la classe light et persiste', () => {
    applyTheme('day')
    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('day')
  })

  it('applyTheme("night") retire la classe light et persiste', () => {
    document.documentElement.classList.add('light')
    applyTheme('night')
    expect(document.documentElement.classList.contains('light')).toBe(false)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('night')
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm vitest run src/lib/theme.test.ts`
Expected: FAIL — `Failed to resolve import './theme'` / `getInitialTheme is not a function`.

- [ ] **Step 3: Implémenter le module**

```ts
// src/lib/theme.ts
export type Theme = 'night' | 'day'

export const THEME_STORAGE_KEY = 'flwsh-theme'

/** Nuit par défaut (DA « Nuit de Festival »). Lit le choix persisté s'il est valide. */
export function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'night'
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return stored === 'day' || stored === 'night' ? stored : 'night'
}

/** Applique le thème : jour = classe `.light` sur <html> ; nuit = aucune classe (défaut). Persiste. */
export function applyTheme(theme: Theme): void {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('light', theme === 'day')
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `pnpm vitest run src/lib/theme.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme.ts src/lib/theme.test.ts
git commit -m "feat(da): pure theme logic (night default, day=.light, persisted)"
```

---

## Task 2: Réécriture du hook `useTheme`

**Files:**
- Modify: `src/hooks/use-theme.ts`

- [ ] **Step 1: Réécrire le hook sur la logique pure**

Remplacer **tout** le contenu de `src/hooks/use-theme.ts` par :

```ts
import { useCallback, useEffect, useState } from 'react'
import { type Theme, getInitialTheme, applyTheme } from '@/lib/theme'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const toggleTheme = useCallback(
    () => setThemeState((t) => (t === 'night' ? 'day' : 'night')),
    [],
  )

  return { theme, setTheme, toggleTheme }
}
```

- [ ] **Step 2: Vérifier la compilation des types**

Run: `pnpm exec tsc --noEmit`
Expected: aucune erreur dans `use-theme.ts` (les erreurs sur `theme-toggle.tsx` sont attendues, corrigées en Task 6).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-theme.ts
git commit -m "feat(da): useTheme on pure theme module (night|day, toggleTheme)"
```

---

## Task 3: Remap complet des tokens dans `src/index.css`

**Files:**
- Modify: `src/index.css:1-97` (bloc `:root`, `.dark`, `@theme inline`)
- Modify: `src/index.css:189-211` (FAB hardcodé → token gradient)

> **Référence des valeurs :** maquette `docs/decisions/assets/landing-founding-theme.html` (`:root` lignes 9-14, `body.light` ligne 133). Nuit = défaut ; jour = `.light`.

- [ ] **Step 1: Remplacer le bloc `:root` (lignes 5-45) par la palette NUIT + tokens de marque**

```css
:root {
  /* Fellowship — DA « Nuit de Festival » (nuit = défaut) */
  --background: #170f0e;
  --foreground: #fbf3e8;
  --card: #241917;
  --card-foreground: #fbf3e8;
  --popover: #241917;
  --popover-foreground: #fbf3e8;
  --secondary: #1e1513;
  --secondary-foreground: #fbf3e8;
  --muted: #1e1513;
  --muted-foreground: #b3a293;
  --accent: #241917;            /* surface de survol neutre ; le vert de marque = --forest */
  --accent-foreground: #fbf3e8;
  --destructive: hsl(0 65% 55%);
  --destructive-foreground: #ffffff;
  --border: rgba(255, 240, 225, 0.10);
  --input: rgba(255, 240, 225, 0.14);
  --primary: hsl(25 78% 52%);
  --primary-foreground: #ffffff;
  --ring: hsl(25 78% 52%);
  --radius: 0.75rem;

  /* Tokens de marque (DA) */
  --copper: hsl(24 85% 56%);
  --copper-d: hsl(16 80% 48%);
  --forest: hsl(152 42% 52%);
  --lime: hsl(86 44% 64%);
  --lime-d: hsl(92 40% 46%);
  --amber: #ffce85;
  --gradient-primary: linear-gradient(135deg, hsl(25 78% 52%), hsl(16 70% 40%));
  --gradient-pro: linear-gradient(155deg, hsl(25 78% 52%), hsl(18 72% 41%) 62%, hsl(12 64% 32%));
  --page-backdrop: radial-gradient(120% 70% at 50% 0%, #2e1e1a, #170f0e 60%);

  /* Layout tokens */
  --page-padding: 24px;

  /* Font tokens */
  --font-heading: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
```

- [ ] **Step 2: Remplacer le bloc `.dark` (lignes 47-67) par l'override JOUR `.light`**

```css
/* Mode JOUR (inversé) — override sur la classe .light */
.light {
  --background: #f0ebe4;
  --foreground: #3d3028;
  --card: #f6f1e8;
  --card-foreground: #3d3028;
  --popover: #f6f1e8;
  --popover-foreground: #3d3028;
  --secondary: #ece4d6;
  --secondary-foreground: #3d3028;
  --muted: #ece4d6;
  --muted-foreground: #7c6f64;
  --accent: #ece4d6;
  --accent-foreground: #3d3028;
  --destructive: hsl(0 60% 48%);
  --destructive-foreground: #ffffff;
  --border: rgba(60, 45, 35, 0.13);
  --input: rgba(60, 45, 35, 0.16);

  --forest: hsl(152 40% 38%);
  --lime: hsl(88 50% 36%);
  --amber: hsl(36 82% 46%);
  --page-backdrop: radial-gradient(120% 70% at 50% 0%, #f8f2e8, #ece3d4 60%);
}
```

- [ ] **Step 3: Remplacer le bloc `@theme inline` (lignes 69-97) — valeurs brutes (plus de `hsl(var())`) + tokens de marque**

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-copper: var(--copper);
  --color-forest: var(--forest);
  --color-lime: var(--lime);
  --color-amber: var(--amber);
}
```

- [ ] **Step 4: Mettre le backdrop nuit sur `html/body` (modifier le bloc `body`, lignes 99-103)**

Remplacer :

```css
body {
  @apply bg-background text-foreground antialiased;
  font-family: var(--font-body);
  font-size: 15px;
}
```

par :

```css
html {
  background: var(--background);
}
body {
  @apply text-foreground antialiased;
  background: var(--page-backdrop);
  background-attachment: fixed;
  font-family: var(--font-body);
  font-size: 15px;
}
```

- [ ] **Step 5: Mettre le FAB sur le token gradient (lignes 200-204)**

Remplacer la règle `background:` de `.fab-button` :

```css
  background: linear-gradient(135deg, hsl(24 72% 48%), hsl(24 65% 38%));
```

par :

```css
  background: var(--gradient-primary);
```

- [ ] **Step 6: Vérifier que le build passe**

Run: `pnpm build`
Expected: build OK (TypeScript + Vite). Aucune erreur Tailwind sur les tokens.

- [ ] **Step 7: Commit**

```bash
git add src/index.css
git commit -m "feat(da): remap design tokens to Nuit de Festival (night default, day=.light, brand tokens)"
```

---

## Task 4: Neutraliser les 4 `dark:` orphelins

> Contexte : la nuit est désormais le défaut **sans** classe `.dark`. Les utilitaires `dark:` existants ne s'appliqueraient plus jamais ; les laisser donnerait du style mort/incohérent. Les 4 occurrences sont dans `src/pages/EventPage.tsx`, `src/components/ui/toast.tsx`, `src/components/theme-toggle.tsx` (ce dernier est réécrit en Task 6).

**Files:**
- Modify: `src/pages/EventPage.tsx`
- Modify: `src/components/ui/toast.tsx`

- [ ] **Step 1: Localiser les occurrences**

Run: `pnpm exec grep -rn "dark:" src/pages/EventPage.tsx src/components/ui/toast.tsx`
Expected : 1 occurrence dans chaque fichier.

- [ ] **Step 2: Réécrire chaque classe `dark:` en classe inconditionnelle basée sur les tokens**

Pour chaque occurrence, supprimer le préfixe `dark:` et fusionner l'intention dans la classe de base en utilisant les tokens sémantiques (`bg-card`, `text-foreground`, `bg-muted`, `text-muted-foreground`, `border-border`) — qui s'adaptent déjà nuit/jour. Exemple de transformation :

```diff
- <span className="text-zinc-600 dark:text-zinc-300">
+ <span className="text-muted-foreground">
```

(Appliquer l'équivalent token le plus proche selon le code réel de chaque fichier ; ne **pas** réintroduire de couleur en dur.)

- [ ] **Step 3: Vérifier qu'il ne reste aucun `dark:` hors theme-toggle**

Run: `pnpm exec grep -rn "dark:" src/pages src/components/ui`
Expected: aucun résultat.

- [ ] **Step 4: Build + lint**

Run: `pnpm build && pnpm lint`
Expected: vert.

- [ ] **Step 5: Commit**

```bash
git add src/pages/EventPage.tsx src/components/ui/toast.tsx
git commit -m "refactor(da): drop orphan dark: utilities (night is the default theme, token-driven)"
```

---

## Task 5: Script anti-flash + theme-color dans `index.html`

> Sans ça, au chargement en mode jour persisté, la page peint d'abord en nuit (`:root`) puis « saute » en jour quand React monte. Le script inline applique `.light` **avant le premier paint**.

**Files:**
- Modify: `index.html:14` (theme-color)
- Modify: `index.html:20-22` (script inline au tout début du `<body>`)

- [ ] **Step 1: Mettre le theme-color sur le fond nuit**

Remplacer la ligne 14 :

```html
    <meta name="theme-color" content="#faf5ef" />
```

par :

```html
    <meta name="theme-color" content="#170f0e" />
```

- [ ] **Step 2: Injecter le script anti-flash en première ligne du `<body>`**

Remplacer :

```html
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
```

par :

```html
  <body>
    <script>
      // Anti-flash : applique le thème persisté avant le premier paint. Nuit = défaut (aucune classe).
      try {
        if (localStorage.getItem('flwsh-theme') === 'day') {
          document.documentElement.classList.add('light');
        }
      } catch (e) {}
    </script>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
```

> **Note de cohérence :** la clé `'flwsh-theme'` et la valeur `'day'` doivent matcher `THEME_STORAGE_KEY` et `Theme` de `src/lib/theme.ts` (Task 1).

- [ ] **Step 3: Build**

Run: `pnpm build`
Expected: build OK.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(da): anti-flash inline theme script + night theme-color"
```

---

## Task 6: Toggle « lune↔soleil » à curseur glissant

> Reproduit la mécanique de la maquette (`.theme-toggle` lignes 123-130) : pastille copper qui glisse, lune en nuit / soleil en jour.

**Files:**
- Modify: `src/index.css` (ajouter les styles `.theme-toggle` à la fin du fichier)
- Modify: `src/components/theme-toggle.tsx` (réécriture complète)

- [ ] **Step 1: Ajouter les styles du toggle à la fin de `src/index.css`**

```css
/* ── Theme toggle (lune ↔ soleil) ─────────────────────────────────── */
.theme-toggle {
  position: relative;
  width: 58px;
  height: 30px;
  border-radius: 99px;
  background: var(--card);
  border: 1px solid var(--border);
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}
.theme-toggle .knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--gradient-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 7px rgba(0, 0, 0, 0.35);
}
.light .theme-toggle .knob {
  transform: translateX(28px);
}
```

- [ ] **Step 2: Réécrire `src/components/theme-toggle.tsx`**

Remplacer **tout** le contenu par :

```tsx
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/use-theme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label="Changer de thème"
    >
      <span className="knob">
        {theme === 'day' ? (
          <Sun className="h-[13px] w-[13px]" strokeWidth={2.2} />
        ) : (
          <Moon className="h-[13px] w-[13px]" strokeWidth={2.2} />
        )}
      </span>
    </button>
  )
}
```

- [ ] **Step 3: Build + lint**

Run: `pnpm build && pnpm lint`
Expected: vert (le `dark:` du fichier a disparu, plus d'erreur de type sur `setTheme`).

- [ ] **Step 4: Commit**

```bash
git add src/index.css src/components/theme-toggle.tsx
git commit -m "feat(da): sliding moon/sun theme toggle (maquette mechanic)"
```

---

## Task 7: Calque d'ambiance `bgfx` (halos)

> Calque fixe plein écran, `z-index:-1`, baignant tout le site (décision 0001 §9). En jour : `mix-blend-mode:multiply` + opacité réduite.

**Files:**
- Create: `src/components/layout/Bgfx.tsx`
- Modify: `src/index.css` (ajouter les styles `.bgfx` à la fin)

- [ ] **Step 1: Ajouter les styles `.bgfx` à la fin de `src/index.css`** (valeurs maquette lignes 18-24, 135-136)

```css
/* ── Calque d'ambiance « bgfx » (halos festival) ──────────────────── */
.bgfx {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}
.bgfx .b {
  position: absolute;
  border-radius: 50%;
  filter: blur(85px);
}
.bgfx .b1 { width: 480px; height: 480px; background: hsl(24 85% 50% / 0.38); left: -4%; top: -70px; }
.bgfx .b2 { width: 380px; height: 380px; background: hsl(330 60% 50% / 0.26); right: -2%; top: 5%; }
.bgfx .b3 { width: 440px; height: 440px; background: hsl(45 90% 55% / 0.15); left: 38%; top: 40%; }
.bgfx .b4 { width: 430px; height: 430px; background: hsl(152 50% 45% / 0.20); left: -8%; bottom: 8%; }
.bgfx .b5 { width: 360px; height: 360px; background: hsl(24 85% 50% / 0.24); right: -5%; bottom: -50px; }
.light .bgfx .b { opacity: 0.5; mix-blend-mode: multiply; }
```

- [ ] **Step 2: Créer le composant `src/components/layout/Bgfx.tsx`**

```tsx
/** Calque d'ambiance fixe (halos chauds) — DA « Nuit de Festival ». Monté une fois, derrière tout. */
export function Bgfx() {
  return (
    <div className="bgfx" aria-hidden="true">
      <span className="b b1" />
      <span className="b b2" />
      <span className="b b3" />
      <span className="b b4" />
      <span className="b b5" />
    </div>
  )
}
```

- [ ] **Step 3: Build**

Run: `pnpm build`
Expected: build OK.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Bgfx.tsx src/index.css
git commit -m "feat(da): bgfx ambient halo layer component + styles"
```

---

## Task 8: Montage global (thème + bgfx) et conteneurs transparents

> Le thème doit s'appliquer sur **toutes** les pages (app + publiques : landing/login/onboarding) — décision 0001 §9 « toggle accessible partout ». Le calque `bgfx` doit être visible : l'enveloppe `AppLayout` passe en fond transparent.

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/components/layout/AppLayout.tsx:24`

- [ ] **Step 1: Monter le thème + `Bgfx` au plus haut niveau dans `src/main.tsx`**

Ajouter l'import et un petit composant racine qui initialise le thème, puis monter `Bgfx`. Remplacer le contenu de `src/main.tsx` par :

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Bgfx } from '@/components/layout/Bgfx'
import { useTheme } from '@/hooks/use-theme'
import './index.css'
import App from './App.tsx'

function Root() {
  useTheme() // applique + persiste le thème globalement (nuit par défaut)
  return (
    <>
      <Bgfx />
      <App />
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
```

- [ ] **Step 2: Rendre l'enveloppe `AppLayout` transparente (le `bgfx` doit transparaître)**

Dans `src/components/layout/AppLayout.tsx:24`, remplacer :

```tsx
    <div className="flex h-screen bg-background">
```

par :

```tsx
    <div className="flex h-screen">
```

> Les surfaces opaques restent portées par les cartes (`bg-card`) et la sidebar ; le fond `body` (gradient nuit) + `bgfx` transparaissent dans les interstices.

- [ ] **Step 3: Build + lint + tests**

Run: `pnpm build && pnpm lint && pnpm vitest run`
Expected: tout vert.

- [ ] **Step 4: Commit**

```bash
git add src/main.tsx src/components/layout/AppLayout.tsx
git commit -m "feat(da): mount theme + bgfx globally, transparent app shell"
```

---

## Task 9: Recoloration des primitives `Button` (dégradé copper)

> Le bouton primaire doit utiliser le **dégradé copper** (CTA maquette), pas un aplat. `ghost`/`outline` ajustés pour fond translucide.

**Files:**
- Modify: `src/components/ui/button.tsx:9-20` (variants)

- [ ] **Step 1: Ajuster les variants**

Dans `buttonVariants`, remplacer le bloc `variant: { … }` (lignes 9-20) par :

```ts
      variant: {
        default:
          "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[0_6px_24px_hsl(20_65%_32%/0.45)] hover:-translate-y-px hover:shadow-[0_8px_30px_hsl(20_65%_34%/0.55)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/85",
        outline:
          "border border-border bg-card hover:bg-muted hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
```

- [ ] **Step 2: Build + lint**

Run: `pnpm build && pnpm lint`
Expected: vert. La classe arbitraire `bg-[image:var(--gradient-primary)]` est valide en Tailwind v4.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "feat(da): primary button uses copper gradient (CTA maquette)"
```

---

## Task 10: Vérification visuelle vs maquette + version bump

> Étape de vérification finale du socle — pas de test automatisé pour le rendu ; on compare à la maquette.

**Files:**
- Modify: `src/changelog.ts` / `version.ts` (bump patch, selon l'emplacement de `APP_VERSION`)

- [ ] **Step 1: Lancer l'app et comparer à la maquette**

Run: `pnpm dev` puis ouvrir `/` (landing), `/login`, et une page app (`/explorer`).
Ouvrir en parallèle `docs/decisions/assets/landing-founding-theme.html` dans le navigateur.
Vérifier :
- Fond nuit brun par défaut (`#170f0e`), halos `bgfx` visibles derrière le contenu.
- Le toggle bascule nuit↔jour, la pastille glisse, le choix **persiste** après reload (localStorage `flwsh-theme`).
- Aucun flash de thème au reload en mode jour.
- Boutons primaires en dégradé copper ; cartes (`bg-card`) lisibles dans les deux thèmes.
- Texte lisible (contraste) en nuit **et** en jour sur explorer/login.

- [ ] **Step 2: Bumper la version (patch)**

Localiser `APP_VERSION` :

Run: `pnpm exec grep -rn "APP_VERSION" src/`

Incrémenter le patch (ex. `0.7.8` → `0.7.9`) dans le fichier trouvé.

- [ ] **Step 3: Vérification finale**

Run: `pnpm build && pnpm lint && pnpm vitest run`
Expected: tout vert.

- [ ] **Step 4: Commit + push**

```bash
git add -A
git commit -m "chore(da): bump version after Nuit de Festival design-system socle"
git push
```

---

## Self-Review

**Couverture de la spec (décision 0001 §9) :**
- Thème nuit défaut + jour inversé → Tasks 1-3. ✓
- Toggle lune↔soleil accessible partout + persisté → Tasks 2, 6, 8 (montage global), 5 (anti-flash). ✓
- Palette (bg/surface/text/muted/border, copper, vert tilleul `--lime`, amber, forest) → Task 3. ✓
- Calque `bgfx` plein écran baignant tout le site, multiply en jour → Tasks 7-8. ✓
- Dégradé copper primaire + carte Pro (`--gradient-pro` exposé) → Tasks 3, 9. ✓
- Typo Jakarta + Inter → déjà chargées (`index.html` ligne 18) et câblées (`--font-heading/--font-body`) ; rien à faire. ✓
- Renommer `--indigo` → secondaire : exposé comme `--lime` (token de marque dédié), pas écrasement du `--secondary` shadcn (qui reste une surface neutre). ✓
- Note « app actuelle en clair → harmoniser » : le remap de tokens bascule toute l'app en nuit d'un coup. ✓

**Points laissés ouverts (décision 0001 §10, hors socle, à traiter en plans aval) :** asset logo Jakarta, imagerie produit, désaturation fine, marqueur de tags landing, split features exact. Notés hors périmètre.

**Cohérence des types/clés :** `THEME_STORAGE_KEY = 'flwsh-theme'` et `Theme = 'night'|'day'` (Task 1) sont réutilisés à l'identique par le script inline (Task 5) et `useTheme` (Task 2). `--gradient-primary` défini en Task 3, consommé en Tasks 6, 9 et FAB. `--page-backdrop` défini nuit+jour (Task 3) et consommé par `body`. `.bgfx`/`.light .bgfx` (Task 7) cohérents avec la classe `.light` posée par `applyTheme` (Task 1).

**Placeholders :** aucun — chaque step contient le code/les valeurs réels.
