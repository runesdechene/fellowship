# Lot 13 — La carte d'un événement (V2)

> 12/10/2026. Décidé pendant le lot 10c, conception validée par Uriel le 12/10/2026. Version
> minimaliste d'abord ; la carte de tous les festivals reste celle de l'Explorer.

## Pourquoi

Très demandé par la communauté : voir **où est un événement par rapport à soi**, par exemple depuis
son atelier ou son siège social. La V2 n'a aucune carte ; la fiche ne dit qu'une ville.

## Décisions (Uriel, 12/10/2026)

1. **La distance part du siège ou de l'atelier de l'enseigne active**, à vol d'oiseau (« à 142 km de
   ton atelier »). Pas de temps de trajet.
2. **« Siège social ou atelier »** se renseigne dans les Réglages, sous chaque enseigne, avec la mention
   « Sert au calcul des distances. N'est jamais affiché. » Il reste **privé** : chacun ne voit que sa
   propre distance. L'**emplacement public** (« Nomade », « Bretagne »…) reste le champ libre de la
   vitrine, inchangé.
3. **Sans siège ni atelier** (enseigne nomade, compte personnel) : **« Depuis ma position »**, après la
   permission du navigateur. La position n'est jamais enregistrée.
4. **La carte montre l'événement et le point de départ** : deux épingles cadrées ensemble, un trait
   pointillé à vol d'oiseau. Pas les autres festivals (c'est l'Explorer).
5. **On l'ouvre depuis le lieu** : la carte « Lieu » des Informations porte la distance et « Voir sur la
   carte → ». Sur ordinateur, la carte prend la place de l'affiche dans le mur ; sur téléphone, un écran
   glisse depuis la droite.

## Les maquettes — elles font foi

- `2027 — Fiche · la carte` (`2263:2`) : le mur en carte (« × Revenir à l'affiche », épingles
  « Les Aventuriales » et « Ton atelier », trait pointillé, carte du bas « À 142 km de ton atelier ·
  À vol d'oiseau · {adresse}, {ville} ({dép.}) ») ; la carte « Lieu » avec la distance et « Voir sur la
  carte → ».
- `2027 mobile — Carte d'un événement (glisse depuis la droite)` (`2263:375`) et `… · sans siège ni
  atelier` (`2263:400`, « Pas de siège ni d'atelier renseigné pour ton enseigne », « Depuis ma
  position »).
- `2027 — Réglages · siège social ou atelier` (`2263:425`).
- `2027 — Modifier un événement` (`2117:2`) : la bascule « Fiche · Carte » de l'aperçu, masquée au 10c,
  revient.

Le fond de carte des maquettes est indicatif : la vraie carte est OpenFreeMap, aux couleurs de l'app.

## Ce que le lot livre

### 1. En base

- **Table `entity_bases`** : `entity_id` (→ entities, clé, supprimée avec l'enseigne), `address`,
  `latitude`, `longitude`, `updated_at`. RLS : seuls les membres de l'enseigne (`can_act_as`) la
  lisent, l'écrivent, l'effacent. Elle n'est pas ajoutée à `entities`, que tout le monde lit pour les
  vitrines.

### 2. Les Réglages

- Sous chaque enseigne de « Enseignes et abonnement » : « Siège social ou atelier », adresse choisie
  parmi les suggestions de la Base Adresse Nationale (le champ du lot 10b), enregistrée aussitôt
  (comme le reste des Réglages) ; la vider efface le siège.

### 3. La fiche

- **La carte « Lieu »** : « À {N} km de ton atelier » (l'enseigne active a un siège) ou « Depuis ma
  position » (sinon, et pour un compte personnel) ; puis « Voir sur la carte → ». Une fiche sans
  position n'a ni l'un ni l'autre.
- **Sur ordinateur (au-delà de 1100 px)** : « Voir sur la carte » met la carte dans le mur de droite, à
  la place de l'affiche, avec « × Revenir à l'affiche ». L'état est dans l'adresse (`?carte`) : le
  retour du navigateur ramène à l'affiche.
- **Sur téléphone et entre 760 et 1100 px** (pas de mur) : un écran qui glisse depuis la droite,
  « ‹ {nom} » pour revenir, la carte en plein écran, le panneau du bas avec la distance (ou « Depuis ma
  position ») et l'adresse.
- **La position de la personne** : demandée au clic sur « Depuis ma position », gardée le temps de la
  page, jamais enregistrée. Refusée ou indisponible : « Ta position n'est pas disponible. »

### 4. La carte

- **Un seul composant** (`EventMap`) pour le mur, l'écran glissant et l'aperçu : `maplibre-gl`, fond
  OpenFreeMap (style Positron) recoloré aux couleurs de l'app, jour et nuit ; chargé seulement quand on
  l'ouvre (import différé).
- Deux épingles au plus (l'événement, le point de départ), cadrées ensemble ; une seule, centrée à
  l'échelle d'une ville. Le trait pointillé relie les deux.

### 5. L'aperçu de la modification

- La bascule « Fiche · Carte » revient ; « Carte » montre l'épingle de l'adresse saisie (sa position
  choisie, ou celle de la ville sinon), pour vérifier qu'elle tombe au bon endroit.

### 6. Le site

- `Permissions-Policy` : `geolocation=()` devient `geolocation=(self)` dans `apps/web/netlify.toml`
  (la V2 est servie à travers la V1). Déploiement de la V1 (brouillon, vérification des en-têtes, puis
  production), au GO d'Uriel.

## Comment c'est construit

- `lib/distance.ts` (pur, testé) : distance à vol d'oiseau (haversine) et son libellé (« 142 km »,
  « 800 m », « 12,5 km »).
- `lib/map-style.ts` (pur, testé) : les couleurs du fond de carte, jour et nuit, tirées des jetons.
- `components/map/EventMap.tsx` (+ son CSS) : la carte, ses épingles, son cadrage.
- `features/event/` : la distance de la carte « Lieu », le mur en carte, l'écran glissant ; un hook
  `useOrigin` (le siège de l'enseigne active, ou la position demandée).
- `features/settings/` : la ligne « Siège social ou atelier » (reprend `AddressField`).
- `lib/page-chrome.tsx` : le mur sait montrer une carte à la place de l'affiche.

## Vérification

- Tests : distance (deux points connus, même point, libellés), style de carte (jour, nuit).
- En base, avec un compte jetable : un membre lit et écrit le siège de son enseigne ; un autre compte
  ne le lit pas ; l'enseigne supprimée l'emporte.
- Navigateur : réglages (choisir, vider), fiche avec atelier, sans atelier (« Depuis ma position »,
  accepter, refuser), mur sur ordinateur, écran glissant sur une fenêtre étroite, retour du navigateur,
  aperçu « Carte », jour et nuit. Compte jetable effacé ensuite.

## Hors de ce lot

- Temps de trajet, itinéraire ; les autres festivals autour ; la carte de l'Explorer.
- Plusieurs ateliers par enseigne.
