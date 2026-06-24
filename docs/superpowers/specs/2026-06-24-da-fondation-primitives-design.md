# DA « Sci-fi chaud » — Fondation : fix token + primitives réutilisables

**Date :** 2026-06-24
**Statut :** Design validé. Prêt pour le plan d'implémentation.
**Parent :** `2026-06-24-da-sci-fi-chaud-design.md` (langage visuel validé sur le Cockpit).

## Intention

Sous-projet 0 de la propagation de la DA « sci-fi chaud » à toutes les pages de
l'app de travail. Avant de refondre 9 pages, poser un **socle propre** :

1. **Réparer la collision de token `--accent`** introduite par l'implémentation
   cockpit (bug subtil déjà en prod).
2. **Extraire les primitives DA** (aujourd'hui enfermées dans `Cockpit.css` sous
   forme de classes `ck-*`) en une **source unique de vérité réutilisable**, pour
   que chaque refonte de page suivante réutilise au lieu de réinventer.

Hors périmètre : aucune refonte de page produit ici. La 1ʳᵉ refonte (Calendrier)
fera l'objet de son propre spec.

## Problème 1 — Collision `--accent`

`src/index.css` définit `--accent` **deux fois dans le même `:root`** :
- l.18 : `--accent: 9 18% 12%` — sens historique = **canaux HSL** (surface de survol
  neutre), consommé via `hsl(var(--accent))`.
- l.62 : `--accent: #d6896a` — sens DA = **hex plat terracotta**. La 2ᵉ écrase la 1ʳᵉ.

Idem en `.light` (l.84 `36 33% 88%` puis l.107 `#b65f3f`).

Conséquence : `@theme inline { --color-accent: hsl(var(--accent)); }` (l.130) et tout
`hsl(var(--accent))` résolvent en `hsl(#d6896a)` = **CSS invalide**, qui échoue
silencieusement. Usages réels cassés (états de survol / texte accent, donc passés
inaperçus) :
- CSS : `Calendar.css:410-411`, `FollowButton.css:48-49`, `SearchBar.css:384`.
- Tailwind `bg-accent` / `text-accent` / `hover:bg-accent` (via `--color-accent`) :
  `NotificationItem.tsx`, `MonthCell.tsx`, `AddressAutocomplete.tsx`,
  `QRCodeModal.tsx`, `toast.tsx`, `LocationField.tsx` (7 occurrences).

Le spec parent (lignes 118-123) recommandait déjà un **token d'accent app distinct** ;
l'implémentation a fait l'inverse en écrasant `--accent`.

### Solution

- **Supprimer** les redéfinitions `--accent: #d6896a` (nuit) et `--accent: #b65f3f`
  (jour). `--accent` retrouve son sens HSL → les ~13 usages cassés re-fonctionnent
  automatiquement, sans les toucher.
- **Introduire** la famille DA nommée :
  - `--accent-app` : `#d6896a` (nuit) / `#b65f3f` (jour).
  - `--accent-app-ink` : `#fff` (nuit et jour) — renommage de l'actuel `--accent-ink`.
- **Migrer les consommateurs hex DA** selon la règle :
  - `hsl(var(--accent))` → **inchangé** (ancien sens, survol neutre).
  - `var(--accent)` **nu** (non enveloppé de `hsl()`) → `var(--accent-app)`.
  - `var(--accent-ink)` → `var(--accent-app-ink)`.
- Fichiers concernés par la migration : `Cockpit.css`, `Sidebar.css`, et dans
  `SearchBar.css` **uniquement** le bouton Ajouter (`.search-bar-add-btn`), le
  `:focus-within` (border `color-mix(... var(--accent) ...)`) et le badge cloche
  (`.notif-bell-badge`). Le `hsl(var(--accent))` de `.search-result-icon.profile`
  (l.384) **reste**.
- Audit obligatoire avant migration : grep `var(--accent)` (nu vs `hsl(`) et
  `var(--accent-ink)` sur tout `src/`, pour ne migrer que les bons.

### Vérification

- Aucune occurrence de `hsl(#` ne doit subsister (grep). Les survols neutres
  (Calendar/FollowButton/SearchBar + 7 composants Tailwind) doivent réafficher leur
  fond/texte. Cockpit, Sidebar, bouton Ajouter, badge cloche : terracotta inchangé
  jour ET nuit (vérif visuelle).

## Problème 2 — Primitives non réutilisables

Les primitives DA (carte verre, grain, boutons, eyebrow/num, statut point+label)
n'existent que comme classes `ck-*` dans `Cockpit.css`. Toute refonte de page devrait
sinon les recopier → duplication + dérive visuelle.

### Solution — `src/styles/da.css`

Nouveau fichier importé une fois (depuis `src/index.css` ou l'entrée app), classes
préfixées `da-*`, **source unique de vérité** des primitives. Valeurs reprises
telles quelles du langage visuel validé (spec parent, section « Matière & surfaces »
et « Typographie & signaux ») :

- **`.da-card`** — carte verre : `border-radius:18px`, `backdrop-filter:blur(16px)`,
  fond `var(--glass)`, hairline 1px `var(--hair)`, `inset 0 1px 0` top-highlight.
  Ombre nuit `0 18px 44px rgba(0,0,0,.32)` ; ombre jour douce
  `0 4px 14px rgba(120,90,60,.06)` + `inset 0 1px 0 rgba(255,255,255,.55)` (via `.light`).
- **`.da-grain`** — overlay grain en `::before` : SVG `feTurbulence fractalNoise
  baseFrequency=0.9 numOctaves=2` en data-URI. Nuit `opacity:.18; mix-blend-mode:overlay`,
  jour `opacity:.05; mix-blend-mode:multiply`.
  ⚠️ Le hook sécurité `PreToolUse` bloque l'écriture brute du data-URI SVG (pattern
  type injection). Isoler cette déclaration sur sa propre ligne et éditer autour
  (cf. mémoire « Security hook bloque innerHTML »).
- **`.da-btn`** + variantes **`.da-btn-flat`** (CTA : fond `var(--accent-app)`, texte
  `var(--accent-app-ink)`), **`.da-btn-ghost`** (bord + texte `var(--accent-app)`),
  **`.da-btn-2`** (neutre : `var(--field)` + hairline `var(--hair)`). Zéro dégradé.
  Halo doux en jour sur `.da-btn-flat`.
- **`.da-eyebrow`** / **`.da-num`** — consolider l'existant (`.eyebrow`/`.num` déjà
  globaux). Eyebrow : mono 10px, weight 600, letter-spacing .2em, uppercase, couleur
  `var(--faint)`. Num : mono + `tabular-nums`.
- **Statut point + label** : `.da-status` (flex align-center gap) + `.da-dot`
  (rond couleur `var(--status-*)`, `box-shadow` glow + animation `pulse` 2.6s, glow
  atténué en jour) + label en mono neutre. **Pas d'aplats colorés.**
  - Composant **`<StatusDot>`** (`src/components/ui/StatusDot.tsx`) si la logique
    statut→(couleur, label) se révèle dupliquée (Cockpit, Calendrier, EventPage) :
    map du statut vers le token `--status-*` et le libellé, rendu `.da-dot` + label.
    Sinon, classes CSS seules. Décision à trancher dans le plan après inventaire des
    points d'usage.

### Migration du Cockpit (test de non-régression)

Le Cockpit migre pour **consommer** les primitives (`ck-*` → `da-*` dans le TSX et/ou
réécriture des règles `ck-*` en compositions de `da-*`). C'est à la fois la
déduplication et la preuve : si le Cockpit reste **visuellement identique** jour et
nuit après migration, les primitives sont correctes.

Tweaks spécifiques au cockpit qui ne généralisent pas (ex. tailles/gaps propres au
héros) restent en classes `ck-*` posées **par-dessus** les primitives, pas dupliquées.

### Vérification

- Build (`pnpm build`) + lint passent.
- Screenshots Cockpit **avant/après** migration, jour ET nuit : aucune différence
  perceptible (carte, grain, boutons, statuts, eyebrow). Méthode capture headless
  via Edge si besoin (cf. mémoire « Capture headless via Edge »).
- `src/styles/da.css` est l'unique endroit définissant ces primitives ; plus de
  duplication des valeurs verre/grain/boutons dans `Cockpit.css`.

## Ordre d'exécution (pour le plan)

1. Fix collision `--accent` (shippable seul, répare le bug). Vérifier d'abord.
2. Créer `src/styles/da.css` avec les primitives.
3. Migrer le Cockpit pour consommer les primitives + vérif non-régression visuelle.

## Hors scope / YAGNI

- Aucune refonte de page produit (Calendrier etc. = specs séparés).
- Pas de nouveau composant au-delà de `<StatusDot>` (et seulement s'il est justifié).
- Ne pas toucher `--copper`/`--primary`/`--page-backdrop` (Landing/vitrine festives).
- Pas de changement de polices.
