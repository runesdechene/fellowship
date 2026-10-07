# Calendrier V2 — spec

> 07/10/2026. Maquette : Figma, cadres « FELLOWSHIP — Calendrier » (ordinateur, 1728) et
> « FELLOWSHIP — Calendrier (mobile) » (390). **La maquette fait foi** ; elle a été posée par
> Claude et Uriel peut la reprendre : on intègre la version de Figma au moment du code.

## Le besoin

L'artisan voit **son année à venir d'un coup** : où il va, mois par mois, où en est chaque
dossier, et qui de ses amis sera là. C'est l'écran le plus important après le tableau de bord.

## Ce qui a été tranché avec Uriel

- **Une frise horizontale de mois en colonnes** (option A), du mois en cours à +11 mois. Les mois
  passés n'y sont pas : ils vivent dans « Mes bilans ».
- **Des cartes-affiches** : l'affiche est l'élément fort, comme sur la fiche événement.
- **Le style des deux premières maquettes vaut pour toute l'application** ; libertés permises
  quand elles améliorent.
- **La frise glisse de gauche à droite** : seule exception admise au « jamais de scroll interne
  imbriqué ». La page garde un seul défilement vertical.
- **Une entrée « Calendrier » dans la barre latérale**, entre Explorer et Tableau de bord.
- **Un seul filtre : « Mes amis », affichés ou masqués** (demandé par Uriel). « Amis pro » et
  « Visiteurs » de la V1 ne reviennent pas : ils tenaient au Pro, absent de la V2.

## L'écran

**Adresse** : `/calendrier`, avec `?mois=AAAA-MM` pour le mois visible en premier.

**En-tête**
- « Calendrier » en titre ; dessous : « N dates d'ici <mois année> · la prochaine dans X jours »
  (rien après le point s'il n'y a pas de prochaine date).
- **Le filtre « Mes amis »** sous la phrase : une pastille à interrupteur, allumée par défaut.
  Éteint, plus d'avatars sur les affiches ni de bloc « Tes compagnons ». Le choix est retenu sur
  l'appareil (`localStorage`, lu et écrit sous `try/catch` : la page marche sans).
- **Les 12 barres de mois** (la frise de saison du tableau de bord, en plus fin). Cliquer une
  barre fait défiler la frise jusqu'à ce mois. Une plage surligne les mois visibles.

**La frise** — une colonne par mois, ~4 visibles sur ordinateur, la 5ᵉ coupée par le bord.
- En-tête de colonne : le nom du mois en très grand (foncé pour le mois en cours, clair pour les
  autres), le compte (« 2 dates », « 1 date », « Aucune date »), et la pastille « Ce mois-ci » sur
  le mois en cours.
- **Carte-affiche** : l'affiche en portrait, un dégradé sombre en haut et en bas ; posés dessus, le
  compte à rebours (haut droite) et les avatars des amis présents (bas gauche, 3 max puis « +N »).
  Dessous : le nom avec, sur la même ligne à droite, la pastille de statut (double coche sur
  « Inscrit ») ; « 25–27 oct. · Ménétrole (63) ». **Pas de catégories** sur le calendrier (07/10/2026) :
  l'artisan connaît ses dates, elles détournaient l'œil du statut ; la fiche et Explorer les montrent.
- **Sans affiche** : bloc beige au format portrait, le jour en très grands chiffres et le mois
  abrégé, dans la couleur de la première catégorie.
- **Mois vide** : carte en pointillés « Mois libre · Trouver une date en <mois> → ».
- **Compagnons** (bas de colonne) : les dates du mois où vont des amis **sans** l'artisan —
  avatar, « Gautier va à » (le nom en gras), puis « Hellfest Winter · 14 nov. » en gras 13.
- Une date à cheval sur deux mois va dans le mois où elle **commence**.
- Survol : la carte se soulève légèrement (transition des jetons, `prefers-reduced-motion`
  respecté). Clic : la fiche événement.

**Mobile** : le filtre « Mes amis » à droite du titre ; une colonne occupe l'écran, la suivante dépasse à droite ; arrêt net sur chaque
mois (`scroll-snap`). Les barres de mois (initiales) restent fixées en haut au défilement.

**Tableau de bord** : le lien « Voir tout le calendrier » mène à `/calendrier` ; cliquer une barre
de la frise de saison ouvre `/calendrier?mois=…`.

## Les données

Rien de neuf en base : tout existe et se lit sous les policies en place.

- **Mes dates** : `participations` de l'acteur actif dont l'événement **finit** à partir
  d'aujourd'hui et **commence** avant la fin du 12ᵉ mois, statuts `interesse`, `en_cours`,
  `inscrit`, `confirme` (pas `refuse`), avec `events!inner(*)`, triées par `start_date`.
  ⚠ Le tableau de bord ne compte que les dates *programmées* (sans `interesse`) : le calendrier
  montre aussi les dates notées, parce que c'est là qu'on planifie.
- **Amis présents** : `fetchFriendsByEvent` (lib/friends.ts), tel quel.
- **Compagnons** : les participations *programmées* des amis mutuels sur la même fenêtre, hors
  événements où l'artisan est déjà, regroupées par événement (plusieurs amis → une ligne).
  Nouvelle fonction dans `lib/friends.ts`, à côté de `fetchFriendsByEvent`, qui réutilise
  `fetchMutualFriendIds` et `fetchActorProfiles`.
- **Catégories** : seulement la couleur de la première, pour la grande date des cartes sans affiche
  (`lib/tags.ts`, jamais en dur).
- **Statuts** : mêmes libellés et mêmes tons que la fiche (`EventStatus.tsx`) — blé « Intéressé »,
  terre « Dossier en cours », olive « Inscrit ». La pastille vient d'un seul endroit, partagé.

## Découpage

- `features/calendar/` : `CalendarPage.tsx` (en-tête + frise), `MonthColumn.tsx`,
  `PosterCard.tsx`, `useCalendar.ts` (`loadCalendar` rend l'état, patron de `.claude/rules/v2.md`).
- `lib/dates.ts` : la fenêtre de 12 mois existe (`monthsWindow`) ; ajouter le rangement d'une date
  dans son mois de début et le format « 25–27 oct. » — **testés** (vitest, Europe/Paris).
- Logique pure testée à part : répartition par mois, compagnons sans doublon avec mes dates,
  compte « N dates », phrase d'en-tête.
- Styles : `styles/3-components/calendar.css`, jetons seulement ; toute couleur nouvelle de la
  maquette entre d'abord dans `1-primitives.css`.

## Erreurs et états

- Chargement : squelette des colonnes (pas d'écran blanc).
- Une requête qui échoue affiche l'erreur, **jamais** « Mois libre » ni « Aucune date ».
- Aucune date sur 12 mois : la frise reste, toutes les colonnes en « Mois libre ».

## Hors périmètre

- Navigation vers les années passées (les bilans s'en chargent).
- Le lien « Trouver une date » reste **inerte** tant qu'Explorer n'existe pas en V2 (comme
  l'entrée Explorer de la barre latérale).
- La liste complète des amis au clic sur la pile d'avatars (la fiche événement la montre).

## Points à confirmer par Uriel

1. **« Dossier en cours » (code) ou « Dossier envoyé » (maquette de la fiche)** : les deux
   libellés coexistent aujourd'hui. Le calendrier prendra celui qu'Uriel choisit, partout.
2. **Les dates « Intéressé » dans le calendrier** (voir Les données) : oui par défaut.
3. **« va à » devant un nom de festival** : le code ne connaît pas l'article (« au Marché de Noël »,
   « à la Fête… », « aux Médiévales »). « va à » partout fera parfois faux ; « y va » ne se trompe
   jamais. À trancher.
