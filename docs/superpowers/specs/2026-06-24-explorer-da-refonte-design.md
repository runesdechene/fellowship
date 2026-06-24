# Explorer — refonte bespoke DA « sci-fi chaud »

**Date :** 2026-06-24
**Statut :** Design validé (compagnon visuel, vraies affiches de la base). Prêt pour le plan d'implémentation.
**Parents :** `2026-06-24-da-sci-fi-chaud-design.md` (langage visuel) · `2026-06-24-da-fondation-primitives-design.md` (primitives `.da-*`, `--accent-app`, `.glass-card`) · `2026-06-24-calendrier-da-refonte-design.md` (page sœur, doctrine statuts).

## Intention

3ᵉ refonte bespoke de la propagation DA (après Calendrier et EventPage). Appliquer le
langage « sci-fi chaud » à **Explorer** en **repensant la hiérarchie, pas en recolorant**.

Décision structurante prise avec Uriel : **la grille devient le cœur de la page**. Le
**coverflow (slideshow) passe en sommeil** — il n'est pas utilisé, il complique la page,
et il sera supprimé peu après déploiement & test. Explorer redevient un **catalogue de
découverte épuré** : une seule intention, les affiches dominent.

Cibles du nettoyage (dette actuelle) : carte grille en **affiche plein cadre + overlay**
(le texte recouvre le flyer → illisible sur les vrais flyers portrait chargés de texte),
**emojis** partout (📅📍✨🔥), **couleurs hex en dur** (`getTagLandingColor`), **deux
systèmes de statut** (`participationChip` colorés + map inline), halos dynamiques liés au
coverflow, et vieux tokens (`hsl(var(--card))`).

## Décision de cadrage : grille seule, coverflow endormi

1. **La grille est la seule vue.** On **retire `ViewToggle`** de la page. La grille n'a plus
   à coexister avec le slideshow.
2. **Le coverflow est conservé mais débranché** : `EventDeck`, `DeckCard`, `ScrubBar`,
   `EventDock`, `ViewToggle` restent dans le repo (réveillables plus tard comme mode
   « vitrine » ou pour la Carte), mais ne sont plus importés/rendus par `Explorer.tsx`.
   **TODO explicite (commentaire + note de progress)** : supprimer ce code mort après que
   la refonte grille soit déployée et testée en prod.
3. Le state lié au slideshow (`activeIndex`, `scrubbing`, `focusEventId`, navigation
   clavier ←/→, autoplay) est retiré de `Explorer.tsx`.

## Structure de page validée (option A — catalogue épuré)

Ordre vertical, scroll de page unique :

1. **Haut de page** : `h1 "Explorer"` + **sous-titre court** (intention, ex. « Découvre les
   festivals et repère tes prochaines dates ») + **compteur** « N festivals trouvés »
   (déplacé/unifié — voir Compteur).
2. **Barre de recherche segmentée** : **Quoi / Où / Quand** + recherche texte. Modèle
   conservé (validé, fonctionnel), **re-skinné en verre DA**.
3. **Grille des cartes-festival**.

**Pas de bandeau « ancre »** (ferait doublon avec le compteur) ni d'**affiche à la une**
(garde la page focalisée ; le spotlight pourra réutiliser le coverflow endormi plus tard).

## Carte-festival (option B v2 — image + corps verre)

**Parti pris validé sur les vraies affiches de la base** : l'overlay plein cadre (design
actuel) écrase les flyers portrait chargés de texte. On passe à une carte **structurée** où
**l'affiche n'est jamais recouverte** et le texte vit dans un **panneau verre toujours
lisible**.

Anatomie (haut → bas) :
- **Zone affiche** : `aspect-ratio: 4/5`, **`object-fit: cover`** (cadrage uniforme, grille
  régulière ; `contain` = option future si on veut les flyers entiers). Léger dégradé bas
  pour fondre vers le corps.
  - **Badge** Nouveau / Populaire en **gélule verre DA** (`backdrop-blur`, hairline), coin
    haut-gauche. Plus de pastille colorée criarde, plus d'emoji.
  - **Fallback sans image (~22 % des events, 20/90 en base)** : surface chaude
    (`--app-bg` + lueur `--accent-app` douce en haut) + **icône de catégorie au trait** en
    filigrane (plus d'emoji Unicode brut). Bouton « Ajouter une image » conservé (exposant +
    admin ; logique d'éligibilité et upload inchangés).
- **Corps verre** (`.glass-card` / tokens verre DA) :
  - **Ligne titre** : **nom** (`--name`) à gauche + **étoile « Repérer »** à droite, **sur la
    même ligne** (bouton arrondi discret, contour + remplissage `--accent-app` quand
    repéré). L'étoile quitte l'affiche et rejoint le texte.
  - **Méta** : `date · ville` avec **icônes au trait** (calendrier, épingle) — plus d'emoji.
  - **Pied** : **statut de participation** = `.da-dot` (`--status-*`) + **label court** issu
    de `participationChip` (« Inscrit », « Dossier à rendre »…), **ou** la ligne
    **compagnons** (pile d'avatars + « Marie y va » / « N compagnons y vont »), **ou** un
    discret « — · à découvrir » si rien. Hauteur min réservée pour garder la grille régulière.
- **Carte non participante** : légèrement atténuée (désaturée + opacité réduite), comme
  aujourd'hui, pour faire ressortir les dates repérées.

## Statuts unifiés (solde la dette, comme le Calendrier)

Une **seule source** : le **label** vient de `participationChip` (on garde sa logique
statut→label, on jette ses aplats colorés). Le rendu = **`.da-dot` + `--status-*`** + label
mono/court. **Supprimer** toute map de couleurs hex en dur (`STATUS_COLORS`/`STATUS_LABELS`
inline si présente côté grille). « Repéré » reste signalé par l'**étoile** (pas de pastille
redondante), comme aujourd'hui.

## Barre de recherche (Quoi / Où / Quand) — re-skin DA

- Modèle **conservé** : segments Quoi (catégories/tags), Où (zone dept/France), Quand
  (présélections de période), + bascule recherche texte (wipe).
- **Migration DA** : verre dépoli DA pour la barre et les popovers (`.glass-card`),
  `--accent-app` pour l'état actif, **icônes au trait** (la loupe, la croix sont déjà des
  SVG — OK), chips catégories en primitives DA. **Mort aux vieux tokens** (`hsl(var(--card))`,
  hex via `getTagLandingColor` pour les fonds — les couleurs de catégorie restent admises
  **uniquement** là où elles portent une sémantique de marque catégorie, sinon DA).
- Comportements inchangés : persistance localStorage `explorer-filters`, défaut « Quand »
  selon l'acteur (exposant → « récents », visiteur → « à venir »), arrivée depuis le
  Calendrier via `location.state.month` (filtre mois précis).

## Compteur

Aujourd'hui dupliqué (un dans `Explorer.tsx`, un dans `EventGrid`). **Unifier** sur **un
seul** compteur « N festivals trouvés » en haut de page (sous la barre). Retirer le doublon.

## Halos d'ambiance

Le `xhalos` + `--xh-accent` suivait la **couleur de l'affiche active** du coverflow. En
grille il n'y a pas de carte active → **retirer le halo dynamique**. Fond de page = **`--app-bg`**
sobre (`background-attachment: fixed`), cohérent avec Calendrier/EventPage. (Un ambient
statique très léger reste acceptable s'il sert la profondeur, mais sans couplage à un event.)

## Gating free / Pro

Explorer reste **gratuit** (matrice freemium : Explorer = découverte ouverte). **Aucun
teaser Pro** sur cette page (contrairement au Calendrier). La ligne « X compagnons y vont »
est **conservée** (preuve sociale, atout de découverte) — comportement et source de données
inchangés, conformes au modèle de visibilité (on ne voit que ses abonnés).

## Données & interactions (inchangées)

Hooks consommés tels quels : `useEvents`, `useTags`, `useMyParticipations`,
`useFriendsByEvent` (déjà en mode grille), `composeFilter`, quota dates
(`countActiveDates`/`canAddDate` + `DateQuotaModal`). **Repérer** = toggle participation de
`currentActor` (mécanique inchangée, quota gratuit respecté). Clic carte → fiche event
(`eventPath`). **Pas de nouvelle RPC, pas de nouvelle feature data.**

## Migration DA & nettoyage

- `Explorer.css` migré **off** vieux tokens → DA : `.glass-card`, `--accent-app`, `--name`,
  `--faint`, `--field`, `--hair`, `--status-*`, `.da-*`. Fond = `--app-bg`
  (`background-attachment: fixed`). Plus aucun hex/HSL en dur dans le TSX pour le chrome.
- **Garde-fou** : ne PAS toucher `--copper` / `--primary` / `--page-backdrop` (Landing /
  vitrine festives intactes), ni `--glass` **global** (casse le Cockpit ; utiliser les
  variantes locales `.glass-card`).
- **Code mort retiré / débranché** : `ViewToggle` (retiré de la page), state slideshow,
  compteur dupliqué, `DeckSkeleton`/`ExplorerEmpty` à porter en états grille DA. `EventDeck`,
  `DeckCard`, `ScrubBar`, `EventDock` conservés mais non importés (TODO suppression).
- ⚠️ **Scroll** : scroll de page unique, jamais de scroll interne imbriqué.
- ⚠️ **Pièges jour/nuit DA** : svg `fill:none; stroke:currentColor`, aucun `#fff` en dur pour
  du texte sur surface, ombres `.light` douces, verre lisible en jour ET nuit, vérif `dist`
  (`hsl(#` vide).

## États

- **Chargement** : skeleton de grille (cartes fantômes DA) — porter `DeckSkeleton` en
  `GridSkeleton`.
- **Vide (après filtres)** : message « Aucun festival ne correspond » + invite à élargir les
  filtres (réutilise l'esprit de `ExplorerEmpty`, re-skin DA).

## Mobile / responsive

- **Même grille responsive** (2 colonnes mobile → 3+ desktop selon largeur). **Pas** de
  coverflow rétréci (il dort). Cartes B v2 identiques, compactées.
- Barre de recherche compacte conservée (pilule Quoi/Où/Quand → popovers pleine largeur).
- Scroll de page unique.

## Hors scope / YAGNI

- Pas de réveil du coverflow ni de mode « vitrine » (évolution future).
- Pas d'affiche à la une / bandeau ancre.
- Pas de rayon km / géocodage (« Où » par zone uniquement, inchangé).
- Pas de nouvelle RPC, pas de changement de la logique des hooks.
- Pas de modification du pipeline d'upload d'image ni de l'éligibilité.
- `contain` pour les affiches : différé (cover en V1).
- Landing / vitrine publique / `--copper` / `--primary` : intouchés. Pas de changement de
  polices.

## Tests

- Vitest sur les helpers purs **existants** (pas de régression) : `composeFilter` (tags ∩
  zone ∩ période ∩ recherche ∩ mois), `participationChip` (statut→label), `periodToRange`.
  Conforme à la contrainte RTL (tests de fonctions pures).
- Smoke : carte rend bien le fallback sans image ; étoile « Repérer » toggle le state ;
  badge Nouveau/Populaire ; statut `.da-dot` + label ; éligibilité bouton « Ajouter une
  image » (exposant voit / festivalier non).
- Build + lint + check `dist` couleurs (pas de `hsl(#`, pas de `#fff` texte sur surface).

## Référence visuelle (maquettes validées)

`.superpowers/brainstorm/35381-1782323170/content/` : `page-layout.html` (structure A
choisie), `card-design.html` (comparatif A/B/C), `card-a-realdb.html` (A rejeté sur vraies
affiches — overlay illisible), `card-b-realdb.html` + `card-b-v2.html` (**carte B v2
choisie** : image + corps verre, étoile sur la ligne du titre).
