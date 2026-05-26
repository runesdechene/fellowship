# Sidebar « exacte maquette » — Design

> **Statut :** validé (brainstorm 2026-05-26). Refonte de la sidebar de l'app pour coller **exactement** aux maquettes DA (référence la plus complète : `docs/decisions/assets/communaute-fil.html` ; variations : `mes-dates.html` pour les locks + upsell, `dashboard-exposant.html`). On ne garde de l'existant que la capacité **replier/déplier**.

## Contexte & problème

La sidebar actuelle (`src/components/layout/Sidebar.tsx`) est un patchwork : header custom (logo image), `EntitySwitcher` en Tailwind inline, `SidebarActivity` ad hoc, footer toggle bricolé en fin de session. Les maquettes définissent une sidebar nette et cohérente (`.logo` / `.entity` / `.nav` / `.side-activity` / `.side-foot`). On remplace le markup + CSS par celui de la maquette, dual nuit/jour, en **préservant les fonctionnalités** (switch d'acteur, fil de notifs, gating Pro, collapse).

## Structure cible (de haut en bas)

1. **Header / logo** — wordmark maquette `.logo` : carré dégradé (copper→ambre) avec `✦` + texte « Fellowship ». **+ bouton replier/déplier conservé** (seul élément gardé de l'actuel). Collapsed → logo réduit au carré, labels masqués.
2. **Carte entité** (`.entity`) — avatar (initiales sur dégradé), nom, sous-label « Exposant · toi » / « Exposant · gratuit » selon le plan. **= `EntitySwitcher` restylé** : garde le dropdown de switch (personne ↔ entités) au clic, apparence maquette. Festivalier pur (0 entité) : carte simple sans dropdown.
3. **Nav** (`.nav`) — liens `icône svg + label`, pilotés par `navModel` (`navItemsFor` + `entryState`) :
   - **actif** : fond `color-mix(copper 16%)`, texte ambre.
   - **`.navbadge`** : pastille rouge de compte (ex. Communauté = notifs non lues) — optionnelle par item.
   - **verrouillé** (`entryState === 'lock-pro'`) : item atténué + **cadenas** (`.lock`), clic → route (ProGate gère le teaser).
   - **« bientôt »** (`entryState === 'bientot'`) : marqueur discret (déjà géré).
4. **Carte upsell** (`.upsell`, « Passe en Pro ») — affichée **uniquement** quand l'acteur actif est une **entité au plan `free`** (via `planForActor`). Cachée si Pro ou si acteur = personne.
5. **Fil d'activité** (`.side-activity`) — en-tête « ● Activité du réseau » (point `live` vert), 3 dernières activités (`.sa-item` : avatar initiales + texte), lien « Tout voir → » vers `/notifications`. Poussé en bas (`margin-top:auto`). **= `SidebarActivity` restylé.** Collapsed → simple icône cloche (comme aujourd'hui).
6. **Pied** (`.side-foot`) — avatar compte + « <prénom> / Mon compte » (lien `/reglages`) + **toggle thème** lune↔soleil (`.tg`, le `ThemeToggle` existant). Collapsed → toggle centré.

## Architecture (composants)

On garde le découpage en composants, restylés (CSS dédié, classes maquette) :
- **`Sidebar.tsx`** — orchestre : logo+collapse, `<EntitySwitcher>`, `<nav>` (map `navModel`), `<SidebarUpsell>` (nouveau, conditionnel), `<SidebarActivity>`, `<SidebarFoot>` (compte + `<ThemeToggle>`).
- **`EntitySwitcher.tsx`** — réécrit en markup/CSS maquette `.entity` (+ dropdown). Plus de classes Tailwind inline → CSS `Sidebar.css`.
- **`SidebarActivity.tsx`** — réécrit en `.side-activity` (en-tête live, `.sa-item`, « Tout voir »).
- **Nouveau `SidebarUpsell.tsx`** (ou bloc inline) — carte `.upsell`, rendu si `planForActor(currentActor, currentActorRow) === 'free'` ET `currentActor?.kind === 'entity'`.
- **`SidebarFoot`** (bloc inline dans `Sidebar.tsx`) — `.side-foot`.
- **`Sidebar.css`** — réécrit avec les classes maquette (`.logo`, `.entity`, `.nav`, `.navbadge`, `.lock`, `.upsell`, `.side-activity`, `.sa-*`, `.side-foot`), tokens DA (`hsl(var(--token))` pour les triplets, `var(--copper/amber/forest)` pour la marque), dual nuit/jour. `SidebarActivity.css` fusionné ou aligné.

## Données / état

- Plan actif : `planForActor(currentActor, currentActorRow)` (déjà en place).
- Nav : `navItemsFor(currentActor)` + `entryState(key, plan)` (déjà en place ; `lock-pro` → cadenas).
- Entité courante : `currentActor` / `entities` / `switchActor` (auth).
- Activité : `useNotifications()` (déjà utilisé par `SidebarActivity`).
- `.navbadge` Communauté : nombre de notifs non lues (depuis `useNotifications`), si > 0.

## Comportement collapse

Conservé. `collapsed` (state local) : logo→carré, labels/sous-textes masqués, entité→avatar seul, nav→icônes seules (tooltip `title`), activité→cloche, footer→toggle centré. Largeur transitionnée (CSS existant `transition: width`).

## Hors périmètre
- Sous-groupe « Gestion » (Documents/Paramètres) du dashboard maquette — pages inexistantes, omis (Réglages = « Mon compte »).
- La page Communauté elle-même (le `.feed`) — c'est l'objet d'une autre intégration DA.
- Logique de paiement Pro (l'upsell pointe vers `/reglages` ou la future page abonnement).

## Tests & vérification
- `pnpm build && pnpm lint && pnpm vitest run` verts (les helpers `navItemsFor`/`entryState`/`planForActor` sont déjà testés).
- Visuel (local, Docker) en **nuit ET jour**, et **plié ET déplié** : logo, carte entité (+ switch fonctionnel), nav (actif/locked/badge), upsell visible seulement en entité free, fil d'activité en bas, pied (Mon compte + toggle). Comparer à `communaute-fil.html` / `mes-dates.html`.
- `grep` : zéro classe Tailwind inline résiduelle pour l'entité/footer ; zéro `rgba(61,48,40)` / token-triplet brut dans `Sidebar.css`.

## Risques / pièges
- **Tokens** : `Sidebar.css` doit wrapper les triplets (`hsl(var(--card))`…) et utiliser les couleurs de marque brutes (`var(--copper)`). Cf. [[feedback_css_token_audit]] / [[reference_da_daynight_gotchas]].
- **Collapse** : tester tous les blocs en mode plié (ne rien casser).
- **Festivalier** (0 entité) : pas de dropdown, pas d'upsell, pas de locks pertinents (nav festivalier).
- `BottomBar` (mobile) reste séparée ; le toggle y a été ajouté récemment — ne pas le casser.
