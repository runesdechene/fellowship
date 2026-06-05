# Embed calendrier — formats adaptatifs + thèmes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre au client d'intégrer son calendrier d'escales en deux formats (vignette / pleine page), bien dimensionnés via un `embed.js` hébergé, avec thème clair / sombre / auto (détection du fond du site).

**Architecture:** Front-end only, zéro backend. La page iframe isolée (`Embed.tsx` + `EmbedPage.css`) gagne un param `?view=mini|full` et un thème `auto`, et reporte sa hauteur au parent par `postMessage`. Un nouveau script vanilla `public/embed.js`, chargé sur le site du client, ajuste la hauteur de l'iframe et détecte le thème du site. La modale `EmbedModal.tsx` génère les deux snippets via une fonction pure testée.

**Tech Stack:** React 19 + TypeScript, Vite, Vitest, CSS isolé (pas de Tailwind dans l'embed), vanilla JS pour `embed.js`.

**Spec de référence :** `docs/superpowers/specs/2026-06-05-embed-calendar-formats-themes-design.md`

---

## File structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `src/lib/embed-params.ts` | Create | Parsing pur des params d'URL de l'embed (`view`/`theme`/`max`/`accent`) |
| `src/lib/embed-params.test.ts` | Create | Tests unitaires du parsing |
| `src/lib/embed-snippet.ts` | Create | Construction pure du snippet HTML livré au client |
| `src/lib/embed-snippet.test.ts` | Create | Tests unitaires du snippet |
| `src/pages/Embed.tsx` | Modify | Branche le rendu sur `view`, thème `auto`, report de hauteur |
| `src/pages/EmbedPage.css` | Modify | Styles `.embed-mini` (lignes compactes) + ajustements `data-view` |
| `public/embed.js` | Create | Loader vanilla : auto-resize iframe + détection thème du site |
| `public/embed-test.html` | Create | Page-hôte locale de test manuel (non liée au build SPA) |
| `src/components/profile/EmbedModal.tsx` | Modify | Onglets Vignette/Pleine page + sélecteur thème + snippets |
| `netlify.toml` | Modify | Override cache court sur `/embed.js` |

---

## Task 1 : `embed-params.ts` — parsing pur (TDD)

**Files:**
- Create: `src/lib/embed-params.ts`
- Test: `src/lib/embed-params.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/embed-params.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseEmbedParams } from './embed-params'

const P = (qs: string) => new URLSearchParams(qs)

describe('parseEmbedParams', () => {
  it('défauts (aucun param) → full, light, max 10, accent cuivre', () => {
    expect(parseEmbedParams(P(''))).toEqual({
      view: 'full', theme: 'light', max: 10, accent: '#c87941',
    })
  })

  it('view=mini → max par défaut 4', () => {
    const r = parseEmbedParams(P('view=mini'))
    expect(r.view).toBe('mini')
    expect(r.max).toBe(4)
  })

  it('view inconnu → full', () => {
    expect(parseEmbedParams(P('view=banana')).view).toBe('full')
  })

  it('theme dark / auto / inconnu', () => {
    expect(parseEmbedParams(P('theme=dark')).theme).toBe('dark')
    expect(parseEmbedParams(P('theme=auto')).theme).toBe('auto')
    expect(parseEmbedParams(P('theme=neon')).theme).toBe('light')
  })

  it('max explicite est clampé [1,50]', () => {
    expect(parseEmbedParams(P('max=2')).max).toBe(2)
    expect(parseEmbedParams(P('max=999')).max).toBe(50)
    expect(parseEmbedParams(P('max=0')).max).toBe(1)
    expect(parseEmbedParams(P('view=mini&max=abc')).max).toBe(4)
  })

  it('accent hex valide accepté, sinon défaut', () => {
    expect(parseEmbedParams(P('accent=e74c3c')).accent).toBe('#e74c3c')
    expect(parseEmbedParams(P('accent=zzz')).accent).toBe('#c87941')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/embed-params.test.ts`
Expected: FAIL — `parseEmbedParams` introuvable (module manquant).

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/embed-params.ts`:

```ts
export type EmbedView = 'mini' | 'full'
export type EmbedTheme = 'light' | 'dark' | 'auto'

export interface EmbedParams {
  view: EmbedView
  theme: EmbedTheme
  max: number
  accent: string
}

const DEFAULT_MAX: Record<EmbedView, number> = { mini: 4, full: 10 }

export function parseEmbedParams(params: URLSearchParams): EmbedParams {
  const view: EmbedView = params.get('view') === 'mini' ? 'mini' : 'full'

  const themeRaw = params.get('theme')
  const theme: EmbedTheme =
    themeRaw === 'dark' ? 'dark' : themeRaw === 'auto' ? 'auto' : 'light'

  const maxRaw = parseInt(params.get('max') ?? '', 10)
  const max = Number.isFinite(maxRaw)
    ? Math.min(Math.max(maxRaw, 1), 50)
    : DEFAULT_MAX[view]

  const accentRaw = params.get('accent') ?? ''
  const accent = /^[0-9a-fA-F]{3,8}$/.test(accentRaw) ? `#${accentRaw}` : '#c87941'

  return { view, theme, max, accent }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/embed-params.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/embed-params.ts src/lib/embed-params.test.ts
git commit -m "feat(embed): parseEmbedParams — parsing pur des params (view/theme/max/accent)"
```

---

## Task 2 : `embed-snippet.ts` — construction du snippet (TDD)

**Files:**
- Create: `src/lib/embed-snippet.ts`
- Test: `src/lib/embed-snippet.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/embed-snippet.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildEmbedSnippet } from './embed-snippet'

describe('buildEmbedSnippet', () => {
  it('vignette auto → src mini+auto, hauteur de repli 360, script embed.js', () => {
    const s = buildEmbedSnippet({ slug: 'rune-de-chene', view: 'mini', theme: 'auto' })
    expect(s).toContain('https://flw.sh/@rune-de-chene/embed?view=mini&theme=auto')
    expect(s).toContain('height:360px')
    expect(s).toContain('data-flwsh-embed')
    expect(s).toContain('<script src="https://flw.sh/embed.js" async></script>')
  })

  it('pleine page light → src full+light, hauteur de repli 600', () => {
    const s = buildEmbedSnippet({ slug: 'rune-de-chene', view: 'full', theme: 'light' })
    expect(s).toContain('view=full&theme=light')
    expect(s).toContain('height:600px')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/embed-snippet.test.ts`
Expected: FAIL — `buildEmbedSnippet` introuvable.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/embed-snippet.ts`:

```ts
import type { EmbedView, EmbedTheme } from './embed-params'

const EMBED_ORIGIN = 'https://flw.sh'
const FALLBACK_HEIGHT: Record<EmbedView, number> = { mini: 360, full: 600 }

export interface SnippetOpts {
  slug: string
  view: EmbedView
  theme: EmbedTheme
}

export function buildEmbedSnippet({ slug, view, theme }: SnippetOpts): string {
  const src = `${EMBED_ORIGIN}/@${slug}/embed?view=${view}&theme=${theme}`
  const height = FALLBACK_HEIGHT[view]
  return [
    `<iframe src="${src}"`,
    `        data-flwsh-embed style="width:100%;border:0;height:${height}px"`,
    `        loading="lazy" title="Calendrier ${slug}"></iframe>`,
    `<script src="${EMBED_ORIGIN}/embed.js" async></script>`,
  ].join('\n')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/embed-snippet.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/embed-snippet.ts src/lib/embed-snippet.test.ts
git commit -m "feat(embed): buildEmbedSnippet — génère le snippet iframe + script"
```

---

## Task 3 : `EmbedPage.css` — styles vignette `.embed-mini`

**Files:**
- Modify: `src/pages/EmbedPage.css` (append à la fin, avant la section Responsive)

- [ ] **Step 1: Add mini styles**

Ajouter ce bloc dans `src/pages/EmbedPage.css`, **juste avant** `/* ── Responsive ── */` (ligne ~350) :

```css
/* ── Vignette (view=mini) ── */

.embed-page[data-view="mini"] .embed-page-container {
  max-width: 360px;
}

.embed-page[data-view="mini"] .embed-header {
  padding-bottom: 12px;
}

.embed-page[data-view="mini"] .embed-header-name {
  font-size: 15px;
}

.embed-mini-list {
  display: flex;
  flex-direction: column;
}

.embed-mini-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 4px;
  border-top: 1px solid rgba(0,0,0,0.06);
  text-decoration: none;
  color: inherit;
  transition: opacity 0.2s;
}

.embed-mini-row:hover { opacity: 0.7; }

.embed-page[data-theme="dark"] .embed-mini-row {
  border-top-color: rgba(255,255,255,0.08);
}

.embed-mini-date {
  width: 40px;
  flex-shrink: 0;
  text-align: center;
  line-height: 1;
}

.embed-mini-day {
  display: block;
  font-size: 18px;
  font-weight: 800;
}

.embed-mini-month {
  display: block;
  margin-top: 2px;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #999;
}

.embed-mini-info {
  flex: 1;
  min-width: 0;
}

.embed-mini-name {
  display: block;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.embed-page[data-theme="dark"] .embed-mini-name { color: #f0f0f0; }

.embed-mini-loc {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: #999;
}
```

> Note : la couleur du jour (`.embed-mini-day`) est laissée à l'accent via style inline dans le TSX (Task 5), pour rester cohérent avec le param `accent`.

- [ ] **Step 2: Commit**

```bash
git add src/pages/EmbedPage.css
git commit -m "style(embed): styles vignette (.embed-mini) isolés, light + dark"
```

---

## Task 4 : `Embed.tsx` — brancher `parseEmbedParams`

**Files:**
- Modify: `src/pages/Embed.tsx:1-55`

- [ ] **Step 1: Remplacer l'import et le parsing inline**

Dans `src/pages/Embed.tsx`, remplacer les imports du haut (ajouter l'import du parseur) et le bloc de parsing manuel (lignes ~49-55) :

Ancien bloc (à supprimer) :
```tsx
  const theme = searchParams.get('theme') === 'dark' ? 'dark' : 'light'
  const max = Math.min(Math.max(parseInt(searchParams.get('max') ?? '10', 10) || 10, 1), 50)
  const accent = /^[0-9a-fA-F]{3,8}$/.test(searchParams.get('accent') ?? '')
    ? `#${searchParams.get('accent')}`
    : '#c87941'
```

Nouveau :
```tsx
  const { view, theme: themeParam, max, accent } = useMemo(
    () => parseEmbedParams(searchParams),
    [searchParams],
  )
```

Et ajouter l'import en haut du fichier (après les imports existants) :
```tsx
import { parseEmbedParams } from '@/lib/embed-params'
```

> `useMemo` est déjà importé depuis `react` (ligne 1). `themeParam` vaut `'light' | 'dark' | 'auto'` ; la résolution effective (`resolvedTheme`) arrive en Task 6. En attendant cette task, remplace temporairement l'usage de `theme` dans le JSX par `themeParam` pour que ça compile — ce sera corrigé en Task 6.

- [ ] **Step 2: Compiler**

Run: `pnpm build`
Expected: succès (TS check OK). Le rendu reste identique (view full par défaut, `themeParam` = ancien `theme` tant que ≠ auto).

- [ ] **Step 3: Commit**

```bash
git add src/pages/Embed.tsx
git commit -m "refactor(embed): Embed.tsx consomme parseEmbedParams"
```

---

## Task 5 : `Embed.tsx` — rendu vignette (`view=mini`)

**Files:**
- Modify: `src/pages/Embed.tsx`

- [ ] **Step 1: Ajouter le helper de date jour/mois**

Dans `Embed.tsx`, à côté de `formatDate` (≈ ligne 96), ajouter :

```tsx
  const formatDayMonth = (start: string) => {
    const d = new Date(start)
    return {
      day: d.toLocaleDateString('fr-FR', { day: '2-digit' }),
      month: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
    }
  }
```

- [ ] **Step 2: Poser `data-view` sur la page**

Sur l'élément racine `<div className="embed-page" data-theme={...}>` (rendus loading, notFound et principal), ajouter `data-view={view}`. Exemple sur le rendu principal (≈ ligne 130) :

```tsx
    <div className="embed-page" data-theme={themeParam} data-view={view}>
```

(Idem sur le `<div className="embed-page" ...>` du rendu `loading` ≈ ligne 105.)

- [ ] **Step 3: Brancher le rendu mini sur la liste d'événements**

Remplacer le bloc qui rend `events` (le `{events.length === 0 ? (...) : (<div className="embed-cards">...)}`, ≈ lignes 148-196) par une bascule sur `view`. Garder le bloc vide (`embed-empty`) tel quel ; n'ajouter que la branche mini :

```tsx
      {events.length === 0 ? (
        <div className="embed-empty">
          <Calendar className="embed-empty-icon" strokeWidth={1.5} />
          <p className="embed-empty-text">Aucun événement à venir</p>
        </div>
      ) : view === 'mini' ? (
        <div className="embed-mini-list">
          {events.map((ev) => {
            const { day, month } = formatDayMonth(ev.start_date)
            return (
              <a
                key={ev.id}
                href={eventShareUrl(ev, 'https://flw.sh')}
                target="_blank"
                rel="noopener noreferrer"
                className="embed-mini-row"
              >
                <div className="embed-mini-date">
                  <span className="embed-mini-day" style={{ color: accent }}>{day}</span>
                  <span className="embed-mini-month">{month}</span>
                </div>
                <div className="embed-mini-info">
                  <span className="embed-mini-name">{ev.name}</span>
                  <span className="embed-mini-loc">📍 {ev.city}{ev.department ? ` (${ev.department})` : ''}</span>
                </div>
              </a>
            )
          })}
        </div>
      ) : (
        <div className="embed-cards">
          {/* ...bloc des cartes full existant, inchangé... */}
        </div>
      )}
```

> Conserver tel quel le contenu interne de `<div className="embed-cards">` (la `.map` des cartes featured). On n'ajoute qu'une branche `view === 'mini'` avant le `: (`.

- [ ] **Step 4: Compiler + vérifier visuellement**

Run: `pnpm build` (attendu : succès)
Puis `pnpm dev` et ouvrir :
- `http://localhost:5173/@rune-de-chene/embed?view=mini` → lignes compactes (date colorée + titre + ville)
- `http://localhost:5173/@rune-de-chene/embed?view=full` → cartes inchangées
- `http://localhost:5173/@rune-de-chene/embed?view=mini&max=2` → 2 lignes

> Si le slug `rune-de-chene` n'a pas d'événements à venir en local, utiliser un slug peuplé de la base de dev.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Embed.tsx
git commit -m "feat(embed): rendu vignette (view=mini) en lignes compactes"
```

---

## Task 6 : `Embed.tsx` — thème résolu + auto + report de hauteur

**Files:**
- Modify: `src/pages/Embed.tsx`

- [ ] **Step 1: État `resolvedTheme` (gère `auto`)**

Ajouter, après le parsing des params (Task 4) :

```tsx
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (themeParam === 'dark') return 'dark'
    if (themeParam === 'light') return 'light'
    // auto → suit le navigateur du visiteur en attendant le verdict du parent
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
```

`useState` est déjà importé (ligne 1).

- [ ] **Step 2: Effet thème auto (matchMedia + message parent)**

Ajouter un `useEffect` (après les hooks existants) :

```tsx
  useEffect(() => {
    if (themeParam !== 'auto') return

    // 1) suivre le mode clair/sombre du visiteur (filet si pas de embed.js)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onMq = (e: MediaQueryListEvent) => setResolvedTheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', onMq)

    // 2) écouter le verdict du site hôte (envoyé par embed.js)
    //    ⚠️ l'émetteur est le site client → on NE valide PAS l'origine (impossible),
    //    seulement la forme du message. Donnée non sensible.
    const onMsg = (e: MessageEvent) => {
      const d = e.data
      if (d && d.source === 'flwsh-embed' && d.type === 'theme'
          && (d.theme === 'light' || d.theme === 'dark')) {
        setResolvedTheme(d.theme)
      }
    }
    window.addEventListener('message', onMsg)

    // 3) annoncer qu'on est prêt à recevoir le thème
    window.parent.postMessage({ source: 'flwsh-embed', type: 'ready' }, '*')

    return () => {
      mq.removeEventListener('change', onMq)
      window.removeEventListener('message', onMsg)
    }
  }, [themeParam])
```

- [ ] **Step 3: Effet report de hauteur (iframe → parent)**

Ajouter un `useEffect` :

```tsx
  useEffect(() => {
    const postHeight = () => {
      const h = document.documentElement.scrollHeight
      window.parent.postMessage({ source: 'flwsh-embed', type: 'resize', height: h }, '*')
    }
    postHeight()
    const ro = new ResizeObserver(postHeight)
    ro.observe(document.body)
    window.addEventListener('load', postHeight)
    return () => {
      ro.disconnect()
      window.removeEventListener('load', postHeight)
    }
  }, [events.length, loading])
```

- [ ] **Step 4: Utiliser `resolvedTheme` dans le JSX**

Remplacer **tous** les `data-theme={themeParam}` (rendus loading, notFound, principal) par `data-theme={resolvedTheme}`.

- [ ] **Step 5: Compiler + vérifier**

Run: `pnpm build` (attendu : succès)
Vérifier en dev :
- `?theme=dark` → fond sombre ; `?theme=light` → fond clair.
- `?theme=auto` → suit le mode OS (basculer le dark mode système pour voir le changement).

- [ ] **Step 6: Commit**

```bash
git add src/pages/Embed.tsx
git commit -m "feat(embed): thème auto (prefers-color-scheme + message parent) + report de hauteur"
```

---

## Task 7 : `public/embed.js` — loader auto-resize + détection thème

**Files:**
- Create: `public/embed.js`

- [ ] **Step 1: Écrire le loader**

Create `public/embed.js` :

```js
/* Fellowship — embed loader. Auto-resize des iframes + détection du thème du site.
   Chargé sur le site du client : <script src="https://flw.sh/embed.js" async></script> */
(function () {
  var ORIGIN = 'https://flw.sh'

  function iframes() {
    return Array.prototype.slice.call(document.querySelectorAll('iframe[data-flwsh-embed]'))
  }

  /* Remonte les ancêtres jusqu'à un fond opaque → 'light' | 'dark' | null */
  function hostThemeFor(iframe) {
    try {
      var el = iframe.parentElement
      while (el) {
        var bg = getComputedStyle(el).backgroundColor
        var m = bg && bg.match(/\d+(\.\d+)?/g)
        if (m && (m.length < 4 || parseFloat(m[3]) > 0)) {
          var r = +m[0], g = +m[1], b = +m[2]
          var lum = 0.299 * r + 0.587 * g + 0.114 * b
          return lum < 128 ? 'dark' : 'light'
        }
        el = el.parentElement
      }
    } catch (e) { /* ignore */ }
    return null
  }

  function sendTheme(iframe) {
    if (!/theme=auto/.test(iframe.src)) return
    var theme = hostThemeFor(iframe)
    if (!theme || !iframe.contentWindow) return
    iframe.contentWindow.postMessage({ source: 'flwsh-embed', type: 'theme', theme: theme }, ORIGIN)
  }

  /* iframe → parent : on ne fait confiance qu'aux messages venant de flw.sh */
  window.addEventListener('message', function (e) {
    if (e.origin !== ORIGIN) return
    var d = e.data
    if (!d || d.source !== 'flwsh-embed') return

    if (d.type === 'resize' && typeof d.height === 'number') {
      iframes().forEach(function (f) {
        if (f.contentWindow === e.source) f.style.height = Math.ceil(d.height) + 'px'
      })
    } else if (d.type === 'ready') {
      iframes().forEach(function (f) {
        if (f.contentWindow === e.source) sendTheme(f)
      })
    }
  })

  /* Proactif : couvre le cas où embed.js charge APRÈS le 'ready' de l'iframe */
  function init() { iframes().forEach(sendTheme) }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
```

- [ ] **Step 2: Vérifier la syntaxe**

Run: `node --check public/embed.js`
Expected: aucune sortie (syntaxe valide).

- [ ] **Step 3: Commit**

```bash
git add public/embed.js
git commit -m "feat(embed): public/embed.js — auto-resize iframe + détection thème du site"
```

---

## Task 8 : `public/embed-test.html` — page-hôte de test manuel

**Files:**
- Create: `public/embed-test.html`

- [ ] **Step 1: Écrire la page de test**

Create `public/embed-test.html` (sert à tester l'auto-resize et la détection de thème en local ; non référencée par l'app) :

```html
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Test embed Fellowship</title></head>
<body style="margin:0;font-family:system-ui">
  <!-- Bloc clair -->
  <section style="background:#ffffff;padding:24px">
    <h2 style="color:#222">Site CLAIR — vignette auto</h2>
    <div style="max-width:320px">
      <iframe src="http://localhost:5173/@rune-de-chene/embed?view=mini&theme=auto"
              data-flwsh-embed style="width:100%;border:0;height:360px" loading="lazy"></iframe>
    </div>
  </section>

  <!-- Bloc sombre -->
  <section style="background:#141414;padding:24px">
    <h2 style="color:#eee">Site SOMBRE — pleine page auto</h2>
    <iframe src="http://localhost:5173/@rune-de-chene/embed?view=full&theme=auto"
            data-flwsh-embed style="width:100%;border:0;height:600px" loading="lazy"></iframe>
  </section>

  <!-- embed.js local -->
  <script src="http://localhost:5173/embed.js" async></script>
</body>
</html>
```

- [ ] **Step 2: Test manuel**

Avec `pnpm dev` lancé, ouvrir `http://localhost:5173/embed-test.html`. Vérifier :
- La vignette sur fond blanc s'affiche en **clair**, la pleine page sur fond noir en **sombre** (détection du fond du site).
- Les iframes s'**ajustent en hauteur** sans scroll interne ni bandeau vide.
- Deux iframes sur la page → chacune dimensionnée indépendamment.

- [ ] **Step 3: Commit**

```bash
git add public/embed-test.html
git commit -m "test(embed): page-hôte locale pour valider auto-resize + détection thème"
```

---

## Task 9 : `EmbedModal.tsx` — onglets + sélecteur thème + snippets

**Files:**
- Modify: `src/components/profile/EmbedModal.tsx`

- [ ] **Step 1: Réécrire la modale**

Remplacer **tout** le contenu de `src/components/profile/EmbedModal.tsx` par :

```tsx
import { useState, useEffect } from 'react'
import { X, Copy, Check, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buildEmbedSnippet } from '@/lib/embed-snippet'
import type { EmbedView, EmbedTheme } from '@/lib/embed-params'

interface EmbedModalProps {
  slug: string
  onClose: () => void
}

const VIEW_TABS: { id: EmbedView; label: string }[] = [
  { id: 'mini', label: 'Vignette' },
  { id: 'full', label: 'Pleine page' },
]

const THEME_TABS: { id: EmbedTheme; label: string }[] = [
  { id: 'light', label: 'Clair' },
  { id: 'dark', label: 'Sombre' },
  { id: 'auto', label: 'Auto' },
]

export function EmbedModal({ slug, onClose }: EmbedModalProps) {
  const [copied, setCopied] = useState(false)
  const [view, setView] = useState<EmbedView>('mini')
  const [theme, setTheme] = useState<EmbedTheme>('auto')

  const snippet = buildEmbedSnippet({ slug, view, theme })

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const segBtn = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '7px 10px',
    fontSize: 13,
    fontFamily: 'var(--font-body)',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    background: active ? 'var(--copper, #c87941)' : 'transparent',
    color: active ? '#fff' : 'rgba(61,48,40,0.6)',
    fontWeight: active ? 700 : 500,
    transition: 'all 0.15s',
  })

  return (
    <div className="profile-qr-backdrop">
      <div className="profile-qr-overlay" onClick={onClose} />
      <div className="profile-qr-modal">
        <button onClick={onClose} className="profile-qr-close">
          <X strokeWidth={1.5} />
        </button>
        <h2 className="profile-qr-title">Intégrer mon calendrier</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(61,48,40,0.5)', marginBottom: 16, textAlign: 'center' }}>
          Choisissez le format, copiez le code, collez-le sur votre site.
        </p>

        {/* Onglets format */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(61,48,40,0.05)', borderRadius: 10, padding: 4, marginBottom: 8 }}>
          {VIEW_TABS.map(t => (
            <button key={t.id} style={segBtn(view === t.id)} onClick={() => setView(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* Sélecteur thème */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(61,48,40,0.05)', borderRadius: 10, padding: 4, marginBottom: 16 }}>
          {THEME_TABS.map(t => (
            <button key={t.id} style={segBtn(theme === t.id)} onClick={() => setTheme(t.id)}>{t.label}</button>
          ))}
        </div>

        <pre style={{
          background: 'rgba(61,48,40,0.04)',
          borderRadius: 12,
          padding: '14px 16px',
          fontSize: 12,
          fontFamily: 'monospace',
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          lineHeight: 1.5,
          color: 'rgba(61,48,40,0.7)',
          marginBottom: 16,
        }}>
          {snippet}
        </pre>

        <div className="profile-qr-actions" style={{ flexDirection: 'column', gap: 8 }}>
          <Button variant="outline" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4 text-accent" />
                Copié !
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copier le code
              </>
            )}
          </Button>
          <Button variant="outline" asChild>
            <a href={`/@${slug}/embed?view=${view}&theme=${theme}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
              <ExternalLink className="mr-2 h-4 w-4" style={{ flexShrink: 0 }} />
              Voir en vrai
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Compiler**

Run: `pnpm build`
Expected: succès TS.

- [ ] **Step 3: Vérifier en dev**

Ouvrir la Vitrine du propriétaire (`PublicProfile`), cliquer « Intégrer mon calendrier » :
- Bascule Vignette/Pleine page → le snippet change (`view=` + `height:`).
- Bascule Clair/Sombre/Auto → le snippet change (`theme=`).
- « Copier le code » copie bien. « Voir en vrai » ouvre `/@slug/embed?view=…&theme=…`.

- [ ] **Step 4: Commit**

```bash
git add src/components/profile/EmbedModal.tsx
git commit -m "feat(embed): modale 2 onglets (vignette/pleine page) + sélecteur thème"
```

---

## Task 10 : `netlify.toml` — cache court sur `/embed.js`

**Files:**
- Modify: `netlify.toml`

- [ ] **Step 1: Ajouter l'override**

Dans `netlify.toml`, ajouter ce bloc **avant** la règle `for = "/*.js"` (≈ ligne 40) :

```toml
# Embed loader — cache court pour propager les améliorations sans re-collage client
[[headers]]
  for = "/embed.js"
  [headers.values]
    Cache-Control = "public, max-age=3600"
```

- [ ] **Step 2: Commit**

```bash
git add netlify.toml
git commit -m "chore(embed): cache court (1h) sur /embed.js"
```

---

## Task 11 : Vérification finale + bump version + push

- [ ] **Step 1: Suite de tests complète**

Run: `pnpm vitest run`
Expected: tous les tests passent, incluant `embed-params` (6) et `embed-snippet` (2).

- [ ] **Step 2: Lint + build**

Run: `pnpm lint` puis `pnpm build`
Expected: 0 erreur, build OK.

- [ ] **Step 3: Bump de version**

Bumper `APP_VERSION` (patch) selon le mécanisme du projet (le build injecte `__APP_VERSION__` ; vérifier `vite.config.ts` / `package.json` pour la source réelle de la version et l'incrémenter d'un patch).

- [ ] **Step 4: Commit + push**

```bash
git add -A
git commit -m "chore: bump version (embed calendrier — formats + thèmes)"
git push
```

---

## Self-review (auteur)

- **Couverture spec :** `view` mini/full (Tasks 3-5) ✓ ; mécanisme iframe+embed.js auto-resize (Tasks 6-7) ✓ ; thème clair/sombre/auto + détection fond (Tasks 6-7) ✓ ; repli sans script via hauteur inline + prefers-color-scheme (Tasks 2,6) ✓ ; modale 2 onglets + thème (Task 9) ✓ ; cache embed.js (Task 10) ✓ ; tests purs (Tasks 1-2) ✓ ; harness manuel (Task 8) ✓.
- **Sécurité :** validation `origin === flw.sh` côté embed.js (hauteur, sens iframe→parent) ; côté iframe, thème validé par forme uniquement (origine impossible, donnée non sensible) — cohérent avec la spec corrigée.
- **Cohérence des types :** `EmbedView`/`EmbedTheme` définis en Task 1, réutilisés en Tasks 2 et 9. `parseEmbedParams` (Task 1) consommé en Task 4. `buildEmbedSnippet` (Task 2) consommé en Task 9. Contrat postMessage `{source:'flwsh-embed', type:'resize'|'ready'|'theme'}` identique entre Task 6 (iframe) et Task 7 (embed.js).
- **Pas de placeholder** dans les steps de code.
