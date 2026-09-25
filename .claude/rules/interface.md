---
paths:
  - "**/*.css"
  - "**/*.tsx"
  - "**/*.jsx"
---

# Interface — direction artistique, CSS, composants

> La DA a été propagée page par page. Ces règles sont ce qui a cassé en route.
> Regroupé le 25/09/2026 depuis la mémoire locale, pour que ce savoir voyage avec le dépôt.

## reference_da_css_tokens

Les **maquettes HTML** dans `docs/decisions/assets/*.html` définissent leurs PROPRES tokens dans un `:root` local (`--bg`, `--surface`, `--surface2`, `--cop`, `--cop-d`, `--green`, `--line`, `--text`…). **Ces noms N'EXISTENT PAS dans l'app.** Porter le CSS d'une maquette en gardant ces noms → fonds/bordures transparents → « page à plat, pas de cadre » (bug réel sur le Cockpit v0.7.205, corrigé v0.7.206).

**Vrais tokens de l'app** (définis dans `src/index.css`, thèmes nuit défaut + `.light`), à utiliser via `hsl(var(--x))` sauf indication :
- Surfaces : `hsl(var(--card))` (carte), `hsl(var(--secondary))` ou `hsl(var(--muted))` (surface secondaire/survol), `hsl(var(--background))` (page).
- Texte : `hsl(var(--foreground))`, `hsl(var(--muted-foreground))` (texte atténué).
- Bordure : `hsl(var(--border))`.
- Primaire : `hsl(var(--primary))` / `hsl(var(--primary-foreground))` ; dégradés prêts : `var(--gradient-primary)`, `var(--gradient-pro)`.
- Marque (déjà en `hsl(...)`, pas de wrapper) : `var(--copper)`, `var(--copper-d)`, `var(--forest)` (vert), `var(--lime)`/`var(--lime-d)`, `var(--amber)`.
- Statuts participation (texte/accent) : `var(--status-repere|dossier|accepte|apayer|acompte|inscrit|refuse)`.

**Pattern badge de statut** (cf. `MesDates.css`) : poser `--chip: var(--status-xxx)` sur la variante, puis `background: color-mix(in srgb, var(--chip) 18%, transparent); color: var(--chip); border: 1px solid color-mix(in srgb, var(--chip) 35%, transparent)`. Les variantes matchent les retours de `participationChip` (cf. [[reference_tags_slug_coupling]] pour une logique de couplage similaire).

**Règle :** avant de porter une maquette, ouvrir `src/index.css` + une page CSS existante (`MesDates.css`, `Calendar.css`) et mapper sur ces tokens. Cohérent avec [[feedback_css_token_audit]] et [[reference_da_daynight_gotchas]].

## reference_theming_knobs

**Tout le thème de l'app connectée se pilote depuis `src/index.css`**, défini 2 fois :
bloc `:root` = **nuit**, bloc `.light` = **jour**. Changer une valeur dans les deux
blocs → tout le site suit (refonte DA terminée v0.7.325, tout standardisé sur ces tokens).

Knobs :
- **`--accent-app`** (+ `--accent-app-ink` = encre sur accent plein) → teinte d'accent
  terracotta : boutons (variante par défaut de `<Button>`), états actifs, liens, chips, survols.
- **`--accent-grad`** → dégradé glossy *dans la famille terracotta* (gloss de `--accent-app`),
  réservé au **seul CTA n°1 « Ajouter un événement »** (SearchBar). Le reste de l'app = flat.
  ⚠️ NE PAS y mettre l'orange festif de la Landing (`#ee8a52→#c4592e`) : ça jure avec les boutons
  plats terracotta. Décision « deux mondes » (2026-06-25) : **Landing = festive (dégradés,
  `--la-grad`) pour séduire ; App = sobre flat terracotta** sauf ce vernis n°1.
- **`--app-bg`** → fond global (radial). Le `body` le porte (purifié, cf. [[project_bg_purify_landing_only]]).
- **`--surface`** / **`--surface-2`** → surfaces neutres OPAQUES (popovers, dropdowns notif/recherche,
  pilule SearchBar, cartes Explorer `--egrid-surf`, fausse affiche, chips/toggles Carte, bulle +X).
  ⚠️ Introduits le 2026-06-25 pour sortir 18 hex en dur (`#2a2725`/`#faf6ef`/`#34302d`/`#ece4d6`) —
  car TOUS les tokens shadcn (`--card/--popover/--background/--secondary/--muted`) sont bruns.
- **`--glass`** → verre des cartes (Cockpit/Communauté/Vitrine/Réglages/Admin/Abonnement/Prix).
  ⚠️ `color-mix(..., var(--glass))` est INVALIDE (--glass est un dégradé).
- **`--hair`** (filets), **`--field`** (cellules), **`--name`**/**`--faint`** (textes), **`--status-*`** (statuts).

⚠️ **NE PAS toucher** : `--copper` / `--primary` / `--page-backdrop` → réservés à la **Landing publique
festive** (volontairement chaude, indépendante du DA app).

## reference_da_daynight_gotchas

Pièges jour/nuit appris en intégrant landing + onboarding (2026-05-25). **À vérifier sur CHAQUE page DA** (les 9 restantes) et les primitives, sinon on les re-découvre une par une.

1. **Icônes SVG noires (port de maquette)** — toujours poser une règle de base scopée : `<scope> svg { fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round }`. Sans elle, les SVG prennent `fill:black` → blobs noirs (dans les deux thèmes). La couleur de l'icône vient du `color` du parent. (Bug vécu : Onboarding.css avait oublié cette règle ; la landing l'avait via `.landing svg`.)

2. **Texte clair codé en dur → invisible en jour** — ne JAMAIS mettre `color:#fff` (ou clair) en dur pour du texte sur surface. Utiliser `hsl(var(--foreground))` (theme-aware). Le `#fff` en dur n'est valable QUE sur fond **fixe coloré** : bouton dégradé copper (`.btn-p`), avatar à fond gradient fixe (`.eav`). Les maquettes sont nuit-only → elles codent `#fff` partout → à convertir au port.

3. **Ombres trop dures en jour** — les ombres nuit (noires/copper-foncé fortes : `rgba(0,0,0,.55)`, `hsl(20 65% 32% / .45)`) sont dégueu sur fond clair. Ajouter un override `.light` avec une ombre **chaude, très basse opacité** : cartes ≈ `0 10px 30px rgba(60,45,35,.07)` ; boutons copper ≈ `0 6px 16px hsl(24 70% 50% / .20)`. La nuit garde son ombre profonde.

4. **Tokens** — garder le format triplet-HSL + `hsl(var())` (voir [[feedback_css_token_audit]]). Vérif sortie : `grep "hsl(#\|hsl(hsl(" dist/assets/*.css` doit être vide.

5. **Outils dispo** — le variant Tailwind `light:` existe (custom variant ajouté au socle) pour les overrides jour ponctuels côté composant ; côté `.css` on écrit `.light <scope> …`.

6. **Dette connue non encore corrigée** : la même ombre copper dense est sur le bouton primaire global (`src/components/ui/button.tsx`) et les CTA landing (`Landing.css .btn-primary`) → à adoucir en jour en une passe. Voir [[project_da_socle]].

## reference_css_global_class_collisions

Les fichiers `*.css` importés par composant (ex. `Sidebar.css`, `AccountSheet.css`) sont **globaux** (pas des CSS modules), bundlés ensemble. Les noms de classe **génériques** fuient d'un composant à l'autre.

Cas réel (v0.7.271) : l'avatar entité de `AccountSheet` avait `class="sheet-av entity"`. La classe globale `.entity` de `Sidebar.css` (sélecteur d'acteur desktop) lui injectait `margin-bottom:16px` + `padding:10px` + `border:1px` → avatar décalé vers le haut (sous `align-items:center`) et rétréci sur mobile. L'avatar `.person` (pas de collision) restait correct → symptôme côté entité seulement.

**Règle** : préfixer les classes par composant (`sheet-av`, `sav-entity`, `sav-person`…), jamais de modificateur nu générique (`entity`, `person`, `av`, `card`…) qui risque de matcher un sélecteur global d'un autre fichier.

**Debug visuel** : pour reproduire fidèlement un bug de rendu, linker le **CSS compilé** (`dist/assets/index-*.css` après `pnpm build`) dans un repro — il contient le preflight Tailwind + toutes les règles bundlées, donc les collisions. Un repro avec du CSS recopié à la main rate ces fuites. Cf. [[reference_headless_screenshot]].

## reference-blur-css-cout-couche

`filter: blur()` se paie sur la taille **affichée** de la couche, jamais sur
la taille de la source. Un flou de 16 px sur un `<img>` de 737 × 1291 px se
recalcule à chaque repaint : sur Fellowship ça a suffi à figer le moteur de
rendu de Chrome — les captures d'écran CDP expiraient à 30 s alors que le DOM
était parfaitement sain (élément présent, visible, image chargée).

**Le symptôme trompe** : on cherche pourquoi l'élément « ne s'affiche pas »
alors qu'il s'affiche très bien et que c'est la capture qui n'aboutit pas.

## La sortie

Redessiner l'image dans un canevas minuscule (~40 px de large), en sortir un
`toDataURL()`, et afficher CE data: URI en `object-fit: cover` **sans aucun
filtre**. Le lissage du ré-agrandissement (×15 à ×20) FAIT le flou,
gratuitement — zéro coût de composition. L'aperçu pèse ~1 Ko.

Monter la largeur du canevas rend le résultat plus net ; c'est la seule
molette.

**Bonus du même canevas** : `getImageData()` donne les dominantes de l'image.
Sur Fellowship, trois bandes horizontales teintent le voile du mur d'affiche —
une affiche nocturne donne un mur sombre, un marché de printemps un mur clair,
sans une seule couleur écrite en dur.

**Piège CORS** : poser `image.crossOrigin = 'anonymous'` **AVANT** `src`,
sinon la requête part sans en-tête et le canevas est teint quoi qu'il arrive
ensuite. Vérifié le 19 août 2026 : le stockage Supabase envoie bien les
en-têtes, le canevas peut lire les affiches. Prévoir quand même le repli (un
`try/catch` autour de `getImageData` et `toDataURL`).

## reference_overlay_seam_debug

Quand Uriel signale un **fond/voile/couture** qu'on ne trouve pas dans le CSS (ex. « une bande sombre 0.1 d'opacité sous la navbar ») :

- **`document.elementsFromPoint(x,y)` ne retourne PAS les pseudo-éléments** (`::before`/`::after`). Un overlay en pseudo passe donc inaperçu → ne JAMAIS conclure « rien trouvé » avec cette seule méthode.
- Méthode fiable : énumérer **tous** les éléments dont le rect croise la zone, et lire `getComputedStyle(el, '::before')` + `'::after'` (fonds sombres, opacity, mix-blend-mode, position, top/height). Script type dans le scratchpad : `hunt.cjs` (playwright-core + channel msedge sur `vite preview`).
- Capturer en **headless Edge** sur `node_modules/.bin/vite preview` (NODE_PATH pointant sur le node_modules du projet si le script vit hors repo). Cf. [[reference_headless_screenshot]].

**Deux pièges concrets trouvés sur la Landing (v0.7.348/349)** :
1. **Bande plus CLAIRE en haut** = centre d'un radial `--app-bg` posé `at 30% 0%` (le point clair tombe sur le bord haut). Fix : descendre le centre (`at 30% 22%`), scoped.
2. **Couture SOMBRE sous un sous-bloc** = un `grain` (`::after`, opacity .14, `mix-blend-mode:overlay`) scopé à `.hero` au lieu de toute la page → arête pile au bord haut du hero. Fix : porter le grain par le calque PLEINE PAGE (`.hero-halos::after`, z-index:-1), pas par la section.

Règle générale : un overlay décoratif (grain, voile) doit couvrir le **même périmètre** que le fond, sinon son arête se lit comme une couture. Cf. [[reference_theming_knobs]].

## tags-slug-coupling

Le système de tags Fellowship a une **coupling cachée** entre la DB (table `tags`) et le frontend :

- DB stocke `slug, name, bg_color, text_color` (saisis manuellement dans `/admin/tags`)
- Frontend `src/components/ui/TagBadge.tsx` a 2 maps hardcodées par slug :
  - `TAG_EMOJIS` → emoji affiché (chips Explorer, badges)
  - `TAG_LANDING_COLORS` → couleur hex chaude (chips Explorer, accent)

**Gotcha** : `bg_color`/`text_color` de la DB ne sont quasi PAS utilisés en pratique. Les Explorer chips s'appuient sur `getTagLandingColor(slug)` (= map hardcodée), pas sur les colonnes DB. La DB a juste été conservée pour compat / Calendar tag badges peut-être.

**Quand on ajoute un tag** :
1. Créer la ligne en admin avec un slug kebab-case stable (ex: `marche-noel`)
2. **OBLIGATOIRE** : ajouter ce même slug dans les 2 maps de `TagBadge.tsx` avec emoji + hex choisis
3. Sinon → chip Explorer tombe sur `'🎉'` + `'#e8a06a'` (fallbacks dans `getTagEmoji` / `getTagLandingColor`)

**Set actuel** (après v0.7.190) :
- 9 slugs seed (`fete-medievale`, `fantastique`, `geek`, `festival-musique`, `foire`, `marche`, `salon`, `litteraire`, `historique`)
- 10 pré-câblés mais PAS encore en DB (à créer en admin) : `exposition`, `marche-noel`, `marche-createurs`, `brocante`, `culturel`, `terroir`, `cinema`, `biker`, `outdoor`, `gastronomique`

**Refacto possible (un jour)** : ajouter colonnes `emoji` + `hex_color` à la table `tags` + migrer les maps frontend. Ça centraliserait tout et l'admin pourrait piloter l'emoji depuis l'UI. Pas urgent — la dette actuelle est gérable tant que [[TAG_EMOJIS]] et [[TAG_LANDING_COLORS]] sont maintenues à jour.

## applayout-has-a-route-validity-guard

`AppLayout.tsx` contient un `useEffect` qui surveille `location.pathname` et
appelle `isRouteValidFor(path, currentActor)` (lib/navModel.ts). Si la route
n'est dans **aucune nav** de l'acteur actif ni dans `SHARED_PREFIXES`, il
fait `navigate('/explorer', { replace: true })`.

**Conséquence :** toute route qui a sa propre garde (`AdminRoute`, etc.) DOIT
être listée dans `SHARED_PREFIXES` ou exemptée dans `isRouteValidFor` —
sinon AppLayout vire l'utilisateur en concurrence du gate, même légitime.

**Cas connu (2026-05-29) :** `/admin` virait MÊME un admin sur `/explorer`
parce qu'il n'était dans aucune nav. Fix : `if (path.startsWith('/admin')) return true`
dans `isRouteValidFor` ; la véritable garde de rôle reste portée par
`AdminRoute` côté React.

**Anti-pattern à éviter :** quand un redirect inattendu se produit, ne pas se
précipiter sur la race condition profile/person. Vérifier d'abord :
- l'useEffect d'AppLayout (route validity)
- les Navigate dans les composants intermédiaires (gates)
- ProtectedRoute / AdminRoute / autres gates explicites

Le coupable est souvent un gate concurrent, pas un timing async.

## reference_animations_invisibles_onglet_pilote

L'onglet piloté par claude-in-chrome est en **arrière-plan** :
`document.visibilityState === "hidden"`. Conséquences mesurées (2026-08-20) :

- **Chrome saute entièrement les view transitions** sur un document caché.
  Même un `::view-transition-old(main-panel)` en place depuis des jours ne se
  déclenche pas. Rien à en conclure sur le code.
- **L'horloge des animations CSS est gelée** : `animation.currentTime` reste à
  `0` après 1,1 s sur une animation de 480 ms, et `animationend` ne part pas.
- **`getComputedStyle` rend la valeur d'AVANT** pendant une transition (pas de
  recalcul de style sans frame). Sur un survol, seule la **capture d'écran**
  fait foi — CDP force un rendu.

**Donc** : je peux vérifier la LOGIQUE d'une animation (classes appliquées,
montage/démontage, `animationend` filtré par nom — testable en dispatchant un
`new AnimationEvent('animationend', {animationName, bubbles: true})`), mais
**jamais les pixels en mouvement**. Une animation se maquette et se fait
valider par Uriel avant d'être codée — voir [[feedback_maquette_avant_code]].
Le contournement de [[reference_headless_screenshot]] ne règle pas ce cas :
il donne un rendu figé, pas un mouvement.

Corollaire React noté au passage : quand une page se démonte dans un
`flushSync` (rappel de `startViewTransition`), l'état reposé par le nettoyage
de son effet n'est rendu qu'APRÈS la sortie du `flushSync` — `useLayoutEffect`
n'y change rien. Ne jamais compter sur l'instant où une page retire son décor.

## Composable CSS — one reusable component = one CSS file

Les CSS doivent être composables. Chaque composant réutilisable a son propre fichier CSS, importé par le composant lui-même.

**Why:** L'utilisateur travaille directement en CSS et veut pouvoir modifier le style d'un composant sans toucher aux autres. Les styles dans un parent CSS (comme Profile.css) ne sont pas réutilisables.

**How to apply:** Quand on crée un composant réutilisable (FollowButton, MonthPicker, etc.), créer un fichier CSS dédié à côté du .tsx. Ne pas mettre les styles dans le CSS d'une page parente. Ne pas utiliser de Tailwind inline sur les composants réutilisables.

## feedback_css_token_audit

Lors du socle DA, j'ai changé les design tokens de triplets-HSL (`24 12% 8%`) vers valeurs brutes (`#170f0e`) et basculé `@theme inline` en `var(--x)`. Le plan affirmait « l'app n'utilise presque que les tokens sémantiques Tailwind ». **Faux** : le projet a **~224 `hsl(var(--token))` écrits à la main dans 17 fichiers `.css`** (Sidebar.css, EventCard.css, Calendar.css, etc.). Avec des tokens en valeurs brutes, `hsl(var(--background))` devient `hsl(#170f0e)` = CSS invalide → couleurs cassées dans toute l'app. Rattrapé seulement par la revue finale de branche.

**Why :** un audit basé uniquement sur les classes utilitaires Tailwind (et `dark:`) rate la couche de CSS manuel. Le format des tokens est un contrat dont dépend tout `hsl(var())`.

**How to apply :** avant tout changement de format de tokens dans `index.css`, faire `grep -rn "hsl(var(" src/` (et inclure les `.tsx` pour les styles inline). Si des callsites consomment `hsl(var(--x))`, **garder le format triplet-HSL** et ne changer que les valeurs. Vérifier la sortie : `pnpm exec vite build` puis greper `hsl(#` / `hsl(hsl(` dans `dist/assets/*.css` (doit être vide). Lié à [[project_da_socle]] et au fait que la revue de code finale ([[feedback_never_regress_commits]]) attrape ce genre de régression.

## feedback-light-button-shadow

**Règle d'uniformisation (Uriel, 2026-05-27) : en mode JOUR (`.light`), tout bouton de couleur (primaire cuivre, CTA, save…) doit avoir une `box-shadow` ADOUCIE** — la forte ombre du mode nuit est trop appuyée sur fond clair et fait « cheap ».

**Pourquoi :** sur fond clair, une ombre forte/saturée jure ; en nuit elle donne du relief, en jour elle doit juste poser le bouton.

**Comment l'appliquer :** valeur de référence (du bouton global `src/components/ui/button.tsx`) :
- repos : `box-shadow: 0 6px 16px hsl(24 70% 50% / 0.20)`
- hover : `box-shadow: 0 8px 22px hsl(24 70% 50% / 0.28)`

Le bouton global (`button.tsx`, variant `light:shadow-[…]`) le fait déjà. **Mais les composants qui redéfinissent leur propre bouton coloré** (ex. `.v-btn-p`/`.v-save` dans `src/pages/Vitrine.css`) gardent l'ombre nuit forte par défaut → il faut **ajouter un override `.light .<classe> { box-shadow: … }`**. Vérifier ça sur chaque page qui a des boutons colorés custom (pas via `button.tsx`). Cf. [[da-socle-done-on-branch]] (dette d'ombre jour) et [[feedback_css_token_audit]].

## feedback_logo_no_border_radius

**Ne jamais mettre de `border-radius` sur le logo Fellowship** (`public/icon.png`, `pwa-192x192.png`). Le poser nu, sans arrondi ni cadre.

**Why:** Le logo a déjà sa forme ; l'arrondir le rogne et le rend « immonde » (mot d'Uriel). Il a dû le redemander **trois fois** dans une même session — c'est le retour qu'il a répété le plus souvent.

**How to apply:** Dans toute maquette ou tout composant qui affiche la marque, écrire `.logo img { width: …; height: …; display: block; }` — sans `border-radius`. Vérifier aussi les pastilles de marque en barre latérale. Voisins : [[project_da_v2_parchemin]].

## No borders on cards — use box-shadow only

Ne jamais mettre de `border border-border` sur les blocs/cards. Utiliser uniquement `shadow-[2px_0_40px_-10px_rgba(0,0,0,0.06)]` pour la profondeur.

**Why:** Les bordures font "vieillot" / 2010. Le design Fellowship utilise des box-shadows subtiles pour la profondeur.

**How to apply:** Sur tout nouveau composant card/bloc, utiliser `bg-card shadow-[2px_0_40px_-10px_rgba(0,0,0,0.06)] rounded-2xl` sans border.

## feedback-no-inner-scroll

**Règle UI : pas de conteneur à scroll interne (`overflow-y:auto` imbriqué) dans une page.** Le contenu doit défiler avec **le scroll de la page entière** ; on doit pouvoir scroller depuis n'importe où dans la zone de contenu.

**Why:** Uriel trouve les scrollbars imbriquées « absolument dégueulasses » (retour 2026-06-11 sur la vue grille Explorer, où j'avais mis un `.egrid-scroll` en `overflow-y:auto`).

**How to apply:** Une vue qui peut dépasser la hauteur du viewport laisse la **zone de contenu d'AppLayout** scroller (retirer la page de `noScroll`/`overflow-hidden`, mettre le root de la page en `height:auto; min-height:100%`). Ne pas créer de div scrollable interne. Exception assumée : les pages volontairement immersives plein-écran sans débordement (coverflow slideshow, Carte). Lié à [[project_design_refonte]].

## Avatar = photo de profil

Avatar = photo de profil réelle (avatar_url). Pas de cercle avec initiale.

**Why:** L'initiale dans un cercle coloré n'est pas un avatar, c'est un fallback. Le user attend de voir les vraies photos.

**How to apply:** Partout où on affiche un "avatar", fetcher et afficher `avatar_url` du profil. L'initiale ne sert que de fallback quand il n'y a pas de photo.
