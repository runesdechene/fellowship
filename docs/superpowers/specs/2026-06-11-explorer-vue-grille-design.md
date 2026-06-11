# Explorer — sélecteur de vue Slideshow / Grille

**Date** : 2026-06-11
**Statut** : design validé (visuel), en attente de relecture spec avant plan d'implémentation

## Contexte & objectif

La page Explorer présente aujourd'hui les festivals en **coverflow** (slideshow, un
festival mis en avant à la fois). On ajoute un **second mode d'affichage : une grille**
qui montre tous les festivals filtrés d'un coup (« tout voir / scanner vite »). Un
**sélecteur en haut à gauche** bascule entre les deux modes. Les deux vues partagent
exactement les mêmes filtres (Quoi/Où/Quand + recherche) et la même liste filtrée — la
grille n'est qu'une autre présentation de `displayed`.

Le slideshow reste le mode par défaut.

## Décisions validées (maquettes)

- **Carte grille = « affiche pleine + overlay »** (option B), format **portrait 2/3**.
- **6 colonnes** en grand écran, cartes généreuses ; dégressif en plus petit.
- **Mêmes infos que le dock du slideshow**, mêmes fonts (Plus Jakarta Sans / Inter),
  même pilule de tag (`dock-tag` : emoji + label + couleur landing).
- **Pastilles de statut et badges réutilisés à l'identique** (`participationChip` →
  classes `.card-status.*` ; `eventBadge` → `.card-badge.*`). Pas de re-design.
- **Compagnons qui y vont** affichés sur la carte (avatars empilés + « X compagnons y vont »).
- **Bouton « Repérer » accessible sur la carte** (étoile seule, en bas à droite de l'overlay).

### Anatomie de la carte grille (overlay, bas de l'affiche)

1. Affiche en fond (`object-fit: cover`, ratio 2/3) + dégradé bas pour la lisibilité.
2. Coin haut-gauche : pastille de statut de participation (`.card-status`, si l'acteur a une participation).
3. Coin haut-droite : badge `Nouveau` / `Populaire` (`.card-badge`, si applicable).
4. Overlay bas : pilule tag → nom (Plus Jakarta 800) → ligne date 📅 + lieu 📍 →
   **rangée du bas** : compagnons à gauche + **bouton Repérer (étoile seule) à droite**.

## Architecture & composants

Nouveau découpage, dans `src/components/explorer/` :

- **`ViewToggle.tsx`** — sélecteur segmenté (2 boutons : Slideshow / Grille), positionné
  en absolu en haut à gauche de `.explorer` (miroir du `FloatingActions` haut-droite).
  Reçoit `mode` + `onChange`. Icônes inline (lucide : `GalleryHorizontal`/`Layers` pour
  slideshow, `LayoutGrid` pour grille). Sur mobile : icônes seules (labels masqués en CSS).
- **`EventGrid.tsx`** — reçoit la liste `events` filtrée + le contexte (now, partByEvent,
  actorKind, friendsByEvent, canAddImage) et rend la grille responsive de `EventGridCard`.
  Gère le scroll interne (voir « Scroll »).
- **`EventGridCard.tsx`** — une carte (option B). Réutilise `getTagEmoji`,
  `getTagLandingColor`, `eventBadge`, `participationChip`. Clic → `onCardClick(event)`.

`Explorer.tsx` orchestre : état `viewMode`, rendu conditionnel
`{viewMode === 'grid' ? <EventGrid .../> : <EventDeck .../> + dock}`.

### Réutilisation (pas de duplication)

| Besoin | Source réutilisée |
|---|---|
| Liste filtrée | `displayed` (déjà calculé dans Explorer) |
| Statut de participation par event | `partByEvent: Map<id, PartLite>` (déjà construit) |
| Pastille statut | `participationChip(...)` + `.card-status.*` |
| Badge Nouveau/Populaire | `eventBadge(event, now)` + `.card-badge.*` |
| Tag (emoji/label/couleur) | `getTagEmoji` / `getTagLandingColor` (TagBadge.tsx) |
| Compagnons par event (groupé) | nouveau hook batché `useFriendsByEvent` (miroir du dock, voir ci-dessous) |
| Ouverture festival | `onCardClick` → `navigate(eventPath(ev))` |
| État vide | `<ExplorerEmpty />` |

### Chargement groupé des compagnons

Le dock charge les amis **d'un seul** event (`useFriendsOnEvent` : `get_friend_ids` →
participations des amis sur cet event). Une grille en chargerait N → nouveau hook
**`useFriendsByEvent(enabled)`** dans `src/hooks/use-friends-by-event.ts` qui **mirror
la sémantique du dock** mais en **batch** : `get_friend_ids` une fois → participations
des amis sur **tous** leurs events → `actor_public` pour les avatars → groupé par
`event_id` (`Record<eventId, FriendAvatar[]>`). Activé uniquement en mode grille
(`enabled = viewMode === 'grid'`) ; le dock garde son propre fetch en mode slideshow.

> On mirror le dock (amis = `get_friend_ids`, tous statuts) et **non** `useMapFriends`
> (qui utilise `follows` + statuts « going ») → cohérence stricte avec le slideshow.
> Les avatars de la grille sont **décoratifs** en v1 (clic carte = ouverture du festival).

## Comportements

- **Scroll** : `.explorer` reste `height:100%; overflow:hidden` (AppLayout `noScroll`
  inchangé). En mode grille, `.stagewrap` est une colonne flex : bandeau filtres en haut
  (en flux), puis une région **grille scrollable interne** (`overflow-y:auto; flex:1`).
  Le coverflow (arrows, scrubber, dock bas, navigation clavier/swipe) n'est rendu **qu'en
  mode slideshow**.
- **Responsive colonnes** : **breakpoints explicites** (pas d'`auto-fill`, qui dépasserait
  6 sur écran ultra-large) — `repeat(6,1fr)` ≥1400px, puis 5 / 4 / 3 et 2 en mobile.
  Le « max 6 » est ainsi garanti.
- **Persistance** : le mode choisi est mémorisé en `localStorage`
  (`flwsh:explorer-view` = `'slideshow' | 'grid'`), défaut `'slideshow'`. Lu à l'init.
- **Mobile** : toggle en haut à gauche, icônes seules. Grille 2 colonnes, scroll naturel.
  (La grille est d'ailleurs plus naturelle au doigt que le coverflow.)
- **Gratuit/Pro** : l'Explorer est gratuit ; la grille est la même donnée, **aucun
  nouveau gating**.

## Décision : compagnons visibles pour tous

Comme le dock du slideshow, la grille affiche « X compagnons y vont » à **tout le monde**
(pas de gating Pro sur les avatars). Validé 2026-06-11.

## Repérer (action de carte)

Étoile **icône-seule** en bas à droite de l'overlay (sur la rangée des compagnons :
compagnons à gauche, étoile à droite). Toggle :
- défaut = étoile contour sur fond glass ;
- repéré = étoile pleine **jaune** (`hsl(44 89% 71%)`, couleur du statut « Repéré »).

Réutilise la logique existante `toggleSave` / `isSaved` de l'Explorer. Le clic sur
l'étoile fait `stopPropagation` (le clic carte ouvre toujours le festival).

## Hors-scope (v1)

- Pas d'avatars compagnons cliquables en grille (décoratifs en v1).
- Pas de virtualisation de la grille (le volume actuel d'events ne le justifie pas ;
  fenêtrage à prévoir si la liste devient très grande).

## Fichiers touchés (prévision)

- **Nouveaux** : `src/components/explorer/ViewToggle.tsx`, `EventGrid.tsx`,
  `EventGridCard.tsx`, `src/hooks/use-friends-by-event.ts`, CSS associé.
- **Modifiés** : `src/pages/Explorer.tsx` (état viewMode + rendu conditionnel + hook amis),
  `src/pages/Explorer.css` (styles grille + toggle), `src/lib/explorer.ts`
  (+ `formatEventDateRange` extrait), `src/components/explorer/EventDock.tsx` (consomme
  le formateur extrait). `useMapFriends` **n'est pas touché** (sémantique différente).

## Tests

- `participationChip` / `eventBadge` : déjà couverts dans `lib/explorer.test.ts`.
- Logique pure à tester si extraite : mapping event → props de carte (tag emoji/couleur,
  statut, badge), dérivation `friendsByEvent`. (RTL render ne flush pas le sync sur cette
  stack → tests de fonctions pures plutôt que de rendu.)
- Persistance du mode (lecture/écriture localStorage) en fonction pure testable.
