# Lot 10b — Ajouter une date (V2)

> 11/10/2026. Deuxième des trois sous-lots du lot 10 (10a connexion et arrivée, en ligne en 2.32.0 ;
> 10b ajouter une date ; 10c modifier un événement). Conception validée par Uriel le 11/10/2026.

## Pourquoi

La V2 sait déjà créer une date en 4 étapes (`features/event-create/`), mais loin de sa maquette : pas
de barre de création, un aperçu sommaire, des doublons sans le nombre d'exposants ni de lien pour les
ouvrir. Et surtout, une date créée par la V2 n'a **pas de position sur la carte** : les 112 événements
de la base en ont tous une (posée par la V1), celui-là serait le seul absent de la carte. Enfin, après
la création, on retombe sur le tableau de bord au lieu de voir la date créée.

## Décisions (Uriel, 11/10/2026)

1. **L'adresse se choisit parmi des adresses réelles suggérées** (la Base Adresse Nationale, le
   service d'adresses de l'État, gratuit, sans clé — celui de la V1) ; en choisir une remplit ville,
   département et position. Sans adresse, la position se déduit de la ville à la création.
2. **« C'est sa nouvelle édition » reste** à côté de « Ouvrir → » sur un doublon passé (lot 8b).
3. **Une date créée ouvre sa fiche**, où l'on est déjà « Intéressé ».
4. **Les étapes 2 à 4 s'intègrent sur le gabarit de l'étape 1**, sans maquette propre.

## La maquette — elle fait foi

`2027 — Ajouter une date · étape 1` (`2082:2`) : barre de création (« × Quitter », les 4 étapes
nommées, « ✓ Brouillon enregistré ») ; « Étape 1 sur 4 », titre serif « Quel événement veux-tu
ajouter ? », « Son nom, tel qu'il est annoncé par l'organisateur. », champ « Nom », carte « Événement
privé » ; bloc « N événements ressemblent » ; « Effacer le brouillon » et « Continuer → » ; à droite
« Aperçu » : l'affiche en pointillés (« L'affiche viendra à l'étape 4 »), le nom, « Date et lieu à
l'étape suivante », « ✓ À la création, tu y es inscrit en « Intéressé » ».

Ce qui n'est pas sur la maquette n'existe pas : l'édition, les horaires, l'affluence, la taille et le
prix du stand ne sont pas demandés ici (10c, si Uriel les veut).

## Ce que le lot livre

### 1. Le cadre

- **La barre de création** (à la place de la barre du haut, la barre latérale reste) : « × Quitter »
  (retour à la page d'avant, le brouillon reste), les 4 étapes — L'événement, Où et quand,
  Catégories, Détails — numérotées, l'étape courante cerclée d'encre, les étapes faites cliquables
  pour y revenir (jamais une étape pas encore atteinte) ; « ✓ Brouillon enregistré » à droite, qui
  apparaît dès que le brouillon contient quelque chose.
- **Le bas du formulaire** : « Effacer le brouillon » (confirmation, comme aujourd'hui) à gauche,
  « Continuer → » à droite ; à la dernière étape, « Créer la date ».
- **L'aperçu** (colonne de droite, sur toutes les étapes) : « Aperçu », l'affiche (pointillés et
  « L'affiche viendra à l'étape 4 » tant qu'il n'y en a pas), le nom (« Sans nom pour l'instant » si
  vide), puis « {dates} · {ville} ({département}) » ou « Date et lieu à l'étape suivante », les
  catégories choisies, et « ✓ À la création, tu y es inscrit en « Intéressé » » (en gratuit, au-delà
  de 6 mois : la phrase n'apparaît pas, puisque l'inscription n'est pas faite).
- Le titre et la phrase de chaque étape, sur le modèle de l'étape 1 :
  - 2 — « Où et quand ? », « L'adresse, la ville et les dates. »
  - 3 — « Quelles catégories ? », « La première choisie est la principale. »
  - 4 — « Les détails », « L'affiche et ce qui aide les exposants à candidater. Tout est
    facultatif. »

### 2. Les doublons (étape 1)

Le bloc « {N} événement(s) ressemble(nt) » (au-dessus de « Continuer », comme sur la maquette, et non
plus à la place de l'aperçu) : une carte par festival — vignette d'affiche (`Poster`, couleur et
icône de la catégorie si pas d'affiche), nom, « {dates} · {ville} ({département}) · {N} exposants
inscrits » (ou « · Passé » pour un festival terminé), et « Ouvrir → » vers sa fiche. Un festival
passé garde aussi « C'est sa nouvelle édition » (inchangé). Dessous : « Si c'est l'un d'eux,
ouvre-le plutôt que d'en créer un second : tu y retrouveras les autres exposants. »

**En base** : la fonction `search_similar_events` (lue telle quelle le 11/10/2026) rend en plus
`image_url`, `tags` et `exhibitors` — le nombre de participations « Inscrit » / « Confirmé » d'une
enseigne. Elle est `SECURITY DEFINER`, ce qui permet de compter sans ouvrir les participations
(qui ne se lisent qu'entre amis). Changer ses colonnes impose de la supprimer et la recréer
(`DROP FUNCTION` + `CREATE`, droits remis) ; la V1, qui l'appelle aussi, ignore les colonnes en plus.

### 3. Où et quand (étape 2)

- **Adresse ou lieu** : pendant la frappe (3 caractères au moins, 300 ms après la dernière touche),
  une liste de 5 adresses suggérées par la BAN ; en choisir une remplit l'adresse, la ville, le
  département (déduit du code INSEE, Corse et outre-mer compris) et la position (précision
  « adresse »). Flèches et Entrée pour choisir, Échap pour fermer. Une adresse tapée sans choisir de
  suggestion reste une adresse libre.
- **Ville** et **Département** : obligatoires, comme aujourd'hui.
- **Début** et **Fin** : comme aujourd'hui, avec l'invitation Pro au-delà de 6 mois.
- **À la création**, si aucune position n'a été choisie : une recherche BAN de la ville (type
  commune, filtrée sur le département) pose la position de la ville (précision « ville »). Une BAN qui
  ne répond pas n'empêche jamais la création : la date part sans position.

### 4. La fin

- **L'affiche est réduite avant l'envoi** (`lib/image-resize.ts`, comme la vitrine et le profil).
- **« Créer la date »** : l'insertion (colonnes d'aujourd'hui, plus `latitude`, `longitude`,
  `geo_precision`), l'inscription « Intéressé » du créateur (règle d'aujourd'hui), l'effacement du
  brouillon, puis **la fiche du festival** (`/evenement/{id}`).

## Comment c'est construit

- `features/event-create/` garde sa structure ; `CreateEvent.tsx` (284 lignes) et `Steps.tsx` (307)
  se répartissent : `CreateBar` (la barre), `EventPreview` (réécrit), `DuplicateList` (le bloc),
  `PlaceStep` (étape 2 avec `AddressField`).
- `lib/geocode.ts` (nouveau, pur et testé, sans copier la V1) : l'adresse de la BAN, la lecture de sa
  réponse, le département d'un code INSEE.
- `lib/create-event.ts` ou l'existant `useEventDraft` : la phrase de l'aperçu, le libellé d'un doublon
  (pur, testé).
- Migration `search_similar_events` (définition live reprise, colonnes ajoutées).

## Vérification

- Tests : lecture d'une réponse BAN, département d'un code INSEE (Corse 2A/2B, outre-mer), libellé
  d'un doublon (inscrits, passé), phrase de l'aperçu.
- Migration : appliquée, puis lecture en prod (un nom connu rend ses inscrits) ; la V1 continue
  d'appeler la fonction sans erreur.
- Navigateur : les 4 étapes, l'aperçu, les doublons (« Ouvrir » ; un festival passé), les adresses
  suggérées, la barre (« Quitter », retour à une étape faite).
- Création : **une seule date de test**, privée, créée par un compte de test jetable (comme en 10a),
  vérifiée en base (position comprise), puis **effacée explicitement** (la suppression d'un compte
  garde les festivals qu'il a créés), avant de supprimer le compte par `delete-account` — jamais une
  fausse date publique dans l'annuaire.

## Hors de ce lot

- Modifier un événement (10c), l'historique des modifications.
- Les champs absents de la maquette (édition, horaires, affluence, stand).
- La recherche de doublons par date ou par lieu (seul le nom compte, comme aujourd'hui).
