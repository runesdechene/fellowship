# App shell → scroll document — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir le shell de l'app du scroll d'un conteneur interne (`AppLayout` `flex h-screen` + `overflow-y-auto`) vers le **scroll du document** (vraie scrollbar navigateur), sidebar/navbar hors flux, pages immersives (Carte, Explorer slideshow) épinglées plein écran.

**Architecture:** On prépare d'abord les pièces sans rien casser (variable CSS `--sidebar-w` pour l'offset dynamique de la sidebar repliable ; hauteur viewport explicite `100dvh` sur les pages immersives pour qu'elles ne dépendent plus de l'ancêtre `h-screen`). PUIS on bascule le shell en une tâche atomique (retrait `h-screen`/`overflow-y-auto`, sidebar `fixed`, contenu décalé par `--sidebar-w`, navbar `sticky`, réserve BottomBar relocalisée, `cockpit-stage` rebranché). PUIS on corrige les coutures (fonds, min-height). Spec : `docs/superpowers/specs/2026-06-24-app-document-scroll-design.md`.

**Tech Stack:** React 19 + TypeScript, Tailwind v4 (classes utilitaires + arbitrary values `ml-[var(--sidebar-w)]`), CSS bespoke (`Sidebar.css`, `SearchBar.css`, `index.css`, `Explorer.css`, pages). Pas de Vitest (archi layout). Vérif = build + lint + recette manuelle.

## Global Constraints

- **Périmètre = archi de scroll seule.** On touche le shell (`AppLayout.tsx`, `Sidebar`, `SearchBar`, `BottomBar`) + les ancrages de hauteur des pages immersives (Carte, Explorer). Aucun re-skin DA, aucun changement de contenu/fonction.
- **Cibles** : (a) scrollbar **navigateur** sur les pages qui scrollent ; (b) Carte + Explorer slideshow restent **plein écran sans scroll** ; (c) **zéro régression** (navbar collante, repli sidebar, BottomBar mobile + bug #5 Réglages, fonds `--app-bg` continus, safe-area iPhone).
- **`background-attachment: fixed`** (body `--page-backdrop`, `.cockpit-stage`, `.ck-page`, `.calendar-page`, `.event-page`, `.event-ambient`) peint relativement au viewport → reste correct en scroll document ; vérifier aucun ancêtre transformé/filtré ne re-roote un fond `fixed`.
- **Overlays déjà `fixed`** (Bgfx `index.css:386`, BottomBar `BottomBar.css:3`, FloatingActions, modales `AppLayout.tsx:64`) : **inchangés**.
- **Mobile** : sidebar masquée < 768px (`--sidebar-w`→0 via override de marge) ; BottomBar fixe + sa réserve `pb-[calc(5rem+env(safe-area-inset-bottom))]` conservée ; insets safe-area préservés.
- **Pages qui scrollent** : `/calendrier`, `/tableau-de-bord`, `/evenement/:id` & `/e/:slug`, `/reglages`, `/communaute`, `/abonnement`, `/boutique`, vitrine `/:slug`, `/explorer` **grille**. **Plein écran sans scroll** : `/carte`, `/explorer` **slideshow**.
- Vérif par tâche = `pnpm build` + `pnpm lint` verts. Recette de régression manuelle (Uriel) sur chaque route, desktop+mobile, jour+nuit, en fin de chantier.
- Commits fréquents, conventional commits. `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Pas de bump/push par les implémenteurs.

---

### Task 1: Variable CSS `--sidebar-w` (offset dynamique de la sidebar)

Exposer la largeur courante de la sidebar (262px déployée / 76px repliée) en variable CSS, pour que le contenu puisse s'en décaler une fois la sidebar passée en `fixed`. Aucun changement visuel à cette étape (la sidebar est encore en flux).

**Files:**
- Modify: `src/components/layout/Sidebar.tsx` (state `collapsed` ~`:17`)

**Interfaces:**
- Consumes: l'état `collapsed` existant de `Sidebar`.
- Produces: variable CSS globale **`--sidebar-w`** sur `document.documentElement` = `'262px'` (déployée) / `'76px'` (repliée). Consommée par Task 3.

- [ ] **Step 1: Lire le state collapsed**

Run: `rg -n "collapsed" src/components/layout/Sidebar.tsx | head`
Repérer la déclaration `const [collapsed, setCollapsed] = useState(...)` et la largeur appliquée (classe/inline).

- [ ] **Step 2: Publier `--sidebar-w` selon `collapsed`**

Dans `Sidebar.tsx`, ajouter un effet qui synchronise la variable :
```tsx
import { useEffect } from 'react' // si pas déjà importé
// ... dans le composant, après le state collapsed :
useEffect(() => {
  document.documentElement.style.setProperty('--sidebar-w', collapsed ? '76px' : '262px')
}, [collapsed])
```

- [ ] **Step 3: Build + lint**

Run: `pnpm build` → succès ; `pnpm lint` → pas de nouvelle erreur (effet avec dépendance `[collapsed]` correcte).

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(layout): expose --sidebar-w (largeur sidebar repliable) en variable CSS"
```

---

### Task 2: Pages immersives auto-portantes en hauteur (`100dvh`)

Donner à Carte et au slideshow Explorer une hauteur viewport explicite, pour qu'ils ne dépendent plus de l'ancêtre `h-screen` (qui disparaît en Task 3). Sûr sous le modèle actuel (`100dvh` ≈ la hauteur du conteneur `h-screen` aujourd'hui).

**Files:**
- Modify: `src/pages/Explorer.css` (`.explorer` `:16-20`, `.explorer.is-grid` `:1384`)
- Modify: `src/pages/Carte.tsx` (`:63`, root `relative flex flex-col flex-1 min-h-0`)

**Interfaces:**
- Consumes: rien (changement CSS/markup local).
- Produces: Carte + Explorer slideshow épinglés `100dvh` indépendamment du shell.

- [ ] **Step 1: Explorer slideshow → `100dvh`**

Dans `Explorer.css`, `.explorer` : `height: 100%` → `height: 100dvh`. Garder `overflow: hidden`. Vérifier `.explorer.is-grid` (`:1384`) : il doit **scroller au document** → `height: auto; min-height: 100dvh; overflow: visible` (remplacer un éventuel `min-height: 100%`).

- [ ] **Step 2: Carte → hauteur viewport explicite**

Dans `Carte.tsx:63`, le root de la Carte : remplacer la dépendance `flex-1 min-h-0` (qui exigeait l'ancêtre borné) par une hauteur viewport propre, ex. ajouter `h-dvh` (et garder `relative flex flex-col`). La Carte est en `hideSearchBar` (pas d'offset navbar). Conserver `overflow-hidden` interne.

- [ ] **Step 3: Build + lint + vérif visuelle inchangée**

Run: `pnpm build` → succès ; `pnpm lint` → pas de nouvelle erreur. Sous le modèle ACTUEL (encore `h-screen`), Carte et Explorer slideshow doivent rester identiques (plein écran). Explorer grille scrolle déjà.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Explorer.css src/pages/Carte.tsx
git commit -m "refactor(layout): Carte + Explorer slideshow en 100dvh (indépendants du shell h-screen)"
```

---

### Task 3: Bascule du shell en scroll document (tâche atomique)

Le cœur. Retirer `flex h-screen` + `overflow-y-auto`, passer la sidebar en `fixed`, décaler le contenu par `--sidebar-w`, garder la navbar `sticky`, relocaliser la réserve BottomBar, rebrancher `cockpit-stage`. Après cette tâche, le document scrolle (scrollbar native).

**Files:**
- Modify: `src/components/layout/AppLayout.tsx` (`:44-54` : racine + wrapper contenu + main)
- Modify: `src/components/layout/Sidebar.css` (`.sidebar` `:2-7` : position/height)

**Interfaces:**
- Consumes: `--sidebar-w` (Task 1) ; pages immersives `100dvh` (Task 2) ; `.cockpit-stage` (Cockpit.css, inchangé).
- Produces: app en scroll document. Aucune tâche suivante n'introduit d'interface ; Task 4 corrige les coutures.

- [ ] **Step 1: Sidebar → `fixed`**

Dans `Sidebar.css` (`.sidebar`, `:2-7`) : `position: relative` → `position: fixed; top: 0; left: 0;` et `height: 100vh` → `height: 100dvh`. Garder `z-index: 10`, `width`, et la règle de repli (76px) + la media query de masquage < 768px.

- [ ] **Step 2: Restructure d'AppLayout**

Remplacer le `return` (`AppLayout.tsx:44-54`) :
```tsx
  return (
    <div>
      <Sidebar />
      {/* Contenu décalé par la sidebar fixe ; le DOCUMENT scrolle (scrollbar native).
          La réserve basse empêche la BottomBar fixe (mobile) de masquer la dernière
          section (#5 contact Réglages). En mode noScroll (Carte) : hauteur viewport figée. */}
      <div
        className={`flex flex-col ml-[var(--sidebar-w,262px)] max-md:ml-0 ${noScroll ? 'h-dvh overflow-hidden' : 'min-h-dvh'} ${isDashboard || isCalendar ? 'cockpit-stage' : ''} pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0`}
      >
        {!hideSearchBar && <SearchBar onCreateEvent={() => setShowCreate(true)} />}
        <main className={`${isCarte ? 'flex flex-col flex-1 min-h-0' : ''}`}>
          {children}
        </main>
      </div>
      <BottomBar />

      {hideSearchBar && <FloatingActions onCreateEvent={() => setShowCreate(true)} />}

      <ChangelogModal />

      {showCreate && (
        /* … bloc modale inchangé … */
      )}
    </div>
  )
```
(Conserver le bloc `{showCreate && (…)}` tel quel `:64-84`.) Changements clés : racine `<div className="flex h-screen">` → `<div>` ; le div de contenu perd `flex-1`/`overflow-y-auto`, gagne `ml-[var(--sidebar-w,262px)] max-md:ml-0` + `min-h-dvh` (ou `h-dvh overflow-hidden` si `noScroll`) ; `<main>` perd `flex-1 min-h-0` sauf en `isCarte`.

- [ ] **Step 3: Vérifier que body/html scrollent**

Run: `rg -n "overflow|height|h-screen|100vh" src/index.css | grep -iE "html|body|^\s*(overflow|height)" | head`
S'assurer qu'aucune règle `html`/`body` ne met `overflow:hidden`/`height:100vh` qui bloquerait le scroll document. Si présent, le retirer (documenter). Sinon, RAS.

- [ ] **Step 4: Build + lint + vérif scroll**

Run: `pnpm build` → succès ; `pnpm lint` → pas de nouvelle erreur. Vérif : la **scrollbar native** apparaît au bord droit du viewport ; la navbar reste collante ; la sidebar fixe ne scrolle pas ; le repli sidebar décale le contenu.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/AppLayout.tsx src/components/layout/Sidebar.css
git commit -m "feat(layout): app en scroll document (sidebar fixed + contenu décalé, scrollbar native)"
```

---

### Task 4: Coutures fonds & hauteurs + recette

Corriger les fonds `--app-bg`/`min-height` des pages app sous le nouveau modèle, vérifier l'absence de saut de fond fixe, et dérouler la recette de régression.

**Files:**
- Modify (si nécessaire): `src/pages/Calendar.css` (`.calendar-page` `:914`), `src/pages/Cockpit.css` (`.ck-page` `:5`), `src/pages/EventPage.css` (`.event-page` `:10-12`)

**Interfaces:**
- Consumes: shell en scroll document (Task 3).
- Produces: rendu sans couture ; chantier prêt pour recette.

- [ ] **Step 1: `min-height` des pages app**

Sous scroll document, `min-height: 100%` se résout contre le parent (wrapper de contenu, déjà `min-h-dvh`) → généralement OK. Vérifier visuellement Cockpit/Calendrier/EventPage avec peu de contenu : si le fond `--app-bg` ne remplit pas le viewport, passer `min-height: 100%` → `min-height: 100dvh` sur `.ck-page`/`.calendar-page`/`.event-page`. Sinon, laisser.

- [ ] **Step 2: Anti-saut de fond fixe**

Vérifier au scroll que `--app-bg` (cockpit-stage/calendar/event) et l'`.event-ambient` ne « sautent » pas (symptôme = ancêtre transformé re-rootant un fond `fixed`). Si saut : isoler l'ancêtre fautif (retirer un `transform`/`filter` parasite, ou re-poser le fond sur le bon conteneur). Documenter le correctif.

- [ ] **Step 3: Build + lint final**

Run: `pnpm build` → succès ; `pnpm lint` → 0 nouvelle erreur.

- [ ] **Step 4: Recette de régression (checklist pour Uriel)**

Pour CHAQUE route, desktop + mobile, jour + nuit :
- [ ] Scrollbar = **navigateur** (bord viewport), aucun élément `fixed` ne la recouvre.
- [ ] Navbar collante OK ; sidebar fixe ne scrolle pas ; repli sidebar décale le contenu.
- [ ] BottomBar mobile ne masque pas la dernière section (Réglages → bloc contact atteignable).
- [ ] `/carte` & `/explorer` slideshow = plein écran sans scroll ; `/explorer` grille scrolle.
- [ ] Fonds `--app-bg` (Cockpit/Calendrier/EventPage) continus, sans bande ni saut.
- [ ] EventPage : l'affiche floutée ne recouvre **plus** la scrollbar.

- [ ] **Step 5: Commit (si corrections en Steps 1-2)**

```bash
git add -A
git commit -m "fix(layout): coutures fonds/hauteurs post-scroll-document"
```

---

## Self-Review

**Couverture spec :**
- §A Restructure shell (retrait h-screen/overflow, wrapper décalé) → Task 3 ✓.
- §B Sidebar fixed + `--sidebar-w` → Task 1 (var) + Task 3 (fixed + `ml-[var(--sidebar-w)]` + `max-md:ml-0`) ✓.
- §C Navbar sticky + cockpit-stage rebranché → Task 3 (sticky conservé, `cockpit-stage` sur le wrapper) ✓.
- §D Pages immersives épinglées `100dvh` → Task 2 ✓.
- §E Réserve BottomBar relocalisée → Task 3 (`pb-…` sur le wrapper de contenu) ✓.
- §F Vérif `background-attachment` → Task 4 ✓.
- §Per-page (scroll vs épinglé) → Task 2 (immersives) + Task 3 (`noScroll` → `h-dvh overflow-hidden`) ✓.
- §Recette → Task 4 Step 4 ✓.
- §Non-goals (pas de re-skin, pas de scrollbar custom) → respecté ✓.

**Placeholder scan :** aucun TBD. Les seules conditions « si nécessaire » (Task 4 min-height/saut de fond) sont des vérifs avec correctif explicite indiqué — pas des placeholders d'implémentation. Pas de test inventé (archi layout — vérif = build/lint/visuel, annoncé).

**Cohérence :** `--sidebar-w` produit en Task 1 (`262px`/`76px`) consommé identiquement en Task 3 (`ml-[var(--sidebar-w,262px)]`). `noScroll`/`isCarte`/`isDashboard`/`isCalendar`/`hideSearchBar` = flags existants d'AppLayout, réutilisés sans changement de sémantique. `100dvh` cohérent Task 2/3/4.
