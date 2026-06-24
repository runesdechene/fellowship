# App shell → scroll document (scrollbar native) — Design

> Convertir le shell de l'app d'un **scroll de conteneur interne** vers le **scroll du document** (vraie scrollbar navigateur) sur toutes les pages qui scrollent, en gardant les pages immersives (Carte, Explorer slideshow) épinglées plein écran. Chantier d'archi global et transverse.

## Goal

Aujourd'hui `AppLayout` = `<div className="flex h-screen">` (racine figée à 100vh, le document ne scrolle pas) → `<div className="flex-1 … overflow-y-auto">` possède le scroll. **La scrollbar appartient à ce div interne, pas au navigateur.** Conséquences : tout élément `position:fixed` (ex. l'affiche floutée de l'EventPage) se cale sur le bord du viewport et **recouvre la scrollbar interne** ; et ça contredit la préférence « scroll de page unique, scrollbar native » d'Uriel. On bascule l'app en **scroll document** : `<body>` scrolle, sidebar/navbar sortent du flux, le contenu est décalé par leurs tailles.

## Global Constraints

- **Périmètre = archi de scroll uniquement.** Pas de re-skin DA, pas de changement de contenu/fonction des pages. On touche le **shell** (`AppLayout.tsx`, `Sidebar`, `SearchBar`, `BottomBar`) et les **ancrages de hauteur/scroll** des pages immersives (Carte, Explorer).
- **Cibles** : (a) vraie scrollbar **navigateur** sur les pages qui scrollent ; (b) pages immersives (Carte, Explorer slideshow) restent **plein écran sans scroll** ; (c) **zéro régression** visuelle/fonctionnelle sur les autres pages (navbar collante, sidebar repli, BottomBar mobile, fonds `--app-bg` continus, safe-area iPhone).
- **`background-attachment: fixed`** (body `--page-backdrop`, `.cockpit-stage`, `.ck-page`, `.calendar-page`, `.event-page`, `.event-ambient`) : ces fonds peignent relativement au **viewport** → restent corrects en scroll document. ⚠️ Vérifier qu'aucun **ancêtre transformé/filtré** ne re-roote un fond `fixed` (un `transform`/`filter` sur un ancêtre redéfinit le « containing block » des descendants `fixed`).
- **Garde-fous** : ne pas casser les overlays déjà `fixed` (Bgfx `index.css:386`, BottomBar `BottomBar.css:3`, FloatingActions, modales) — ils restent inchangés. Ne pas toucher la DA (tokens, couleurs). Ne pas rouvrir le travail Calendrier/Fondation (mais le `.cockpit-stage` doit continuer de fournir le fond continu — cf. §C).
- **Mobile** : sidebar masquée < 768px ; BottomBar fixe ; la réserve de place pour la BottomBar (`pb-[calc(5rem+env(safe-area-inset-bottom))]`, bug #5 Réglages) doit être **conservée** (relocalisée). Insets safe-area préservés.
- Vérif : `pnpm build` + `pnpm lint` verts. **Recette de régression manuelle (Uriel) sur CHAQUE route**, desktop + mobile, jour + nuit (cf. §Recette).
- Commits fréquents, conventional commits, `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

## A. Restructure du shell (AppLayout)

- Retirer `flex h-screen` sur la racine (`AppLayout.tsx:45`) et `overflow-y-auto` sur le div de contenu (`:49`). Le `<body>`/document scrolle nativement.
- Nouvelle structure cible :
  - `<Sidebar/>` → `position:fixed` (cf. §B).
  - Un **wrapper de contenu** (ex. l'actuel div `:49`, sans `overflow-y-auto`) décalé : `margin-left: var(--sidebar-w)` en desktop, `0` en mobile. Contient `<SearchBar/>` (sticky) + `<main>{children}</main>`.
  - `<BottomBar/>`, `<FloatingActions/>`, modales : inchangés (déjà `fixed`).
- `<main className="flex-1 min-h-0 …">` : retirer `min-h-0` (n'a de sens qu'à l'intérieur d'une colonne flex bornée par `h-screen`). `<main>` devient un simple conteneur en flux.

## B. Sidebar fixed + offset par variable CSS (risque #1)

- `Sidebar` → `position:fixed; left:0; top:0; height:100dvh; z-index:10` (elle déclare déjà `height:100vh` → passer en `100dvh` pour le mobile/safe-area).
- Le **repli (262px ↔ 76px) est du state React** (`Sidebar.tsx:17`), pas du CSS → impossible de figer l'offset en CSS statique. Solution : exposer une **variable CSS `--sidebar-w`** mise à jour selon `collapsed` (ex. `document.documentElement.style.setProperty('--sidebar-w', collapsed ? '76px' : '262px')` dans un `useEffect` du Sidebar, ou via un style inline sur le wrapper de layout). Valeur par défaut `262px` ; `0px` quand la sidebar est masquée (< 768px) via media query : `@media (max-width:767px){ :root{ --sidebar-w:0px } }`.
- Le wrapper de contenu : `margin-left: var(--sidebar-w, 262px)`.

## C. Navbar sticky + fond continu rebranché (risque #5)

- `.search-bar-wrapper` reste `position:sticky; top:0; z-index:40`. En scroll document, sticky fonctionne contre le document tant que la SearchBar est un **enfant en flux du wrapper qui scrolle** (le wrapper de contenu, désormais en flux document). Vérifier le pinning.
- **Fond continu `--app-bg`** : aujourd'hui `.cockpit-stage` (classe posée sur le div scrollable pour Cockpit/Calendrier) porte `background:var(--app-bg); background-attachment:fixed`, donnant un fond continu navbar→page. Comme le div scrollable disparaît, **rebrancher `cockpit-stage` sur le wrapper de contenu** (qui reçoit toujours la classe selon `isDashboard||isCalendar`). Le fond restant `background-attachment:fixed` (viewport), la continuité tient. Vérifier qu'il n'y a pas de réapparition de bande sous la navbar (la bande brune `::before` est déjà tuée globalement).

## D. Pages immersives épinglées (risque #2)

- **Carte** (`noScroll = isCarte`) et **Explorer slideshow** (`.explorer { height:100%; overflow:hidden }`) bornaient leur hauteur grâce à l'ancêtre `h-screen`. Sans lui, `height:100%` s'effondre. → Leur donner une hauteur viewport explicite : `height:100dvh` (SearchBar masquée sur ces pages, donc pas d'offset navbar) **et** rester hors du scroll document (`overflow:hidden`, ou wrapper `position:fixed; inset:0` avec offset sidebar). Piloté par les flags existants `isCarte`/`hideSearchBar`/`noScroll`.
- **Explorer mode grille** (`.explorer.is-grid { height:auto; min-height:100%; overflow:visible }`) : doit **scroller au niveau document** comme les autres pages — vérifier que `min-height:100%` → `min-height:100dvh` (moins navbar) si besoin pour le plein-bleed.
- `.calendar-page`/`.ck-page`/`.event-page` (`min-height:100%`) : sous scroll document, `100%` se résout contre le parent ; leur donner `min-height: calc(100dvh - var(--navbar-h, 0px))` si un état vide perd le plein-bleed (sinon laisser `100%` si le rendu tient).

## E. Réserve BottomBar relocalisée (risque #3)

- Le `pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0` (`AppLayout.tsx:49`, empêche la BottomBar fixe mobile de recouvrir la dernière section — bug #5 Réglages) doit **migrer** du div scrollable vers l'élément dont l'utilisateur atteint la fin en scroll document : le **wrapper de contenu** (ou `<main>`). Conserver `md:pb-0` (BottomBar masquée ≥ 768px).

## F. Vérif `background-attachment: fixed` (risque #4)

- Confirmer que `.event-ambient img` (`filter:blur()` + `transform:scale()`) ne casse pas les autres fonds fixes : le blur/transform est **interne** à `.event-ambient`, pas un ancêtre des autres `.X-page` → OK. Mais après aplatissement du shell, re-vérifier visuellement que `--app-bg` (cockpit-stage/calendar/event) ne « saute » pas au scroll (symptôme = containing-block re-rooté).

## Per-page : qui scrolle, qui est épinglé

**Scroll document (scrollbar native) :** `/calendrier`, `/tableau-de-bord`, `/evenement/:id` & `/e/:slug`, `/reglages`, `/communaute`, `/abonnement`, `/boutique`, vitrine `/:slug`, `/explorer` **mode grille**.

**Plein écran, SANS scroll (épinglé 100dvh) :** `/carte`, `/explorer` **mode slideshow**.

## Risques (récap, traités)

1. **Offset sidebar dynamique** → variable CSS `--sidebar-w` (§B).
2. **Pages immersives perdent leur ancêtre borné** → `100dvh` + `overflow:hidden`/`fixed` (§D).
3. **Réserve BottomBar** → relocalisée sur le wrapper de contenu (§E).
4. **Fond fixe + ancêtre transformé** → vérif visuelle anti-saut (§F).
5. **Navbar sticky** → reste enfant en flux du contenu document ; pinning vérifié + cockpit-stage rebranché (§C).

## Recette (Uriel, manuelle — indispensable, chantier global)

Pour CHAQUE route, desktop + mobile, jour + nuit :
- Scrollbar = **navigateur** (bord droit du viewport, pas un div interne) ; aucun élément `fixed` ne la recouvre.
- Navbar reste collante en haut ; sidebar fixe ne scrolle pas ; repli sidebar décale bien le contenu.
- BottomBar mobile ne recouvre pas la dernière section (Réglages → bloc contact atteignable).
- Carte & Explorer slideshow = plein écran sans scroll ; Explorer grille scrolle.
- Fonds `--app-bg` (Cockpit/Calendrier/EventPage) continus, sans bande ni saut au scroll.
- EventPage : l'affiche floutée ne recouvre plus la scrollbar (la cause originelle).

## Non-goals

- Re-skin DA / contenu des pages (l'EventPage reprendra son re-skin APRÈS ce chantier).
- Refonte de la Sidebar/SearchBar au-delà du repositionnement.
- Scroll « custom » / scrollbar stylée : on veut la **native**, point.
