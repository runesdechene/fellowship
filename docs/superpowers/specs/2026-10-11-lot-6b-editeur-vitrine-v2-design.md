# Lot 6b — L'éditeur de la vitrine, en place (V2)

> 11/10/2026. Suite du lot 6 (la vitrine en consultation, livrée le 07/10/2026). Design et maquette
> validés par Uriel le 11/10/2026.

## Pourquoi

Sur sa vitrine, « Modifier ma vitrine » ouvre encore l'éditeur de la V1 : une fenêtre de formulaire.
Uriel veut le plus moderne en 2026 : **on modifie ce qu'on voit**, sur la page elle-même, avec des
animations. Et il ne pouvait même pas accéder à sa propre vitrine : « Ma vitrine » est entrée dans
la barre latérale le 11/10/2026 (déjà codé).

## Décisions (Uriel, 11/10/2026)

1. **Édition en place** : « Modifier la vitrine » fait basculer la page en mode édition ; on clique
   sur le nom, le métier, la ville, la présentation, les liens, le logo, la bannière — et on les
   change là où ils sont. La bannière se recadre **en la faisant glisser**.
2. **Rien n'est publié avant « Enregistrer »** (la vitrine est publique). « Annuler » remet tout.
3. **Jusqu'à trois liens** : site, Instagram, boutique — chacun avec son icône.
4. **L'adresse (`flw.sh/…`) se change librement**, avec un avertissement : « Les anciens liens et QR
   codes ne marcheront plus. » Pas de redirection de l'ancienne adresse : elle redevient libre
   aussitôt (sinon un exposant pourrait réserver plein d'adresses).
5. **Avec des animations** : la bascule en mode édition, l'apparition des cadres, le survol, la
   sélection, le glissé de la bannière.
6. **La zone sélectionnée** passe du pointillé gris à un **trait plein aux couleurs du logo** avec un
   léger halo (état de travail, visible du seul propriétaire).

## La maquette — elle fait foi

`2027 — Vitrine · mode édition` (`2231:2`), copie de `2027 — Vitrine d'un artisan` (`2076:2`) :
barre « Mode édition · Clique sur ce que tu veux changer · Annuler · Enregistrer » ; cadres
pointillés à la largeur de chaque élément, espacés ; pastilles « Changer la bannière » et
« Glisser pour recadrer » ; pastille appareil photo sur le logo ; liens avec icône et × ;
« + Ajouter un lien » ; l'adresse en ligne discrète (icône lien, « flw.sh/ » gris, l'adresse en
encre) montrée sélectionnée, avec son avertissement dessous ; le reste de la page atténué.

## Ce que le lot livre

### 1. Entrer et sortir

- Le propriétaire (`can_act_as` l'enseigne) voit « **Modifier la vitrine** » à la place de
  « Suivre ». Au clic : la barre d'édition glisse du haut, les boutons du visiteur s'effacent, les
  cadres pointillés apparaissent en fondu, les abonnés, escales, tampons et pied de page
  s'atténuent.
- **Enregistrer** : publie tout d'un coup (§ 4), la barre se retire, « Vitrine mise à jour »
  s'affiche un instant. **Annuler** : s'il y a des changements, « Abandonner tes modifications ? »
  puis tout revient ; sinon on sort aussitôt. Quitter la page (lien, retour) avec des changements
  demande la même confirmation.
- Le mode édition **n'a pas d'adresse propre** : c'est un brouillon local, pas un état à partager.
- **Ordinateur seulement** dans ce lot : sous 760 px, le bouton n'apparaît pas.

### 2. Ce qui se modifie en place

| Élément | Comment |
|---|---|
| **Bannière** | survol : « Changer la bannière » (choisir une image) et « Glisser pour recadrer » ; le glissé vertical règle `banner_position` (0 à 100) |
| **Logo** | pastille appareil photo : choisir une image ; affiché dans son cercle, centré |
| **Nom** (`brand_name`) | champ en place, police et taille réelles ; obligatoire, 60 caractères au plus |
| **Métier** (`craft_type`) | champ en place ; 60 caractères au plus |
| **Ville** (`city`) et **département** (`department`) | « Lyon (69) » : deux champs en place ; le département sur deux ou trois caractères |
| **Présentation** (`bio`) | zone de texte en place, 255 caractères au plus ; compteur qui apparaît à 200 |
| **Liens** (`links`) | trois au plus, chacun `{ type: 'website' \| 'instagram' \| 'shop', url, label }` ; le type se déduit de l'adresse (instagram.com → Instagram ; etsy, sumup, shopify, « boutique »… → boutique ; sinon site) ; × pour retirer, « + Ajouter un lien » tant qu'il y en a moins de trois ; `https://` ajouté s'il manque |
| **Adresse** (`public_slug`) | ligne « flw.sh/… » ; au clic, le nom devient éditable et l'avertissement apparaît dessous |

**L'adresse** : minuscules, chiffres et tirets (`^[a-z0-9]+(-[a-z0-9]+)*$`), 3 à 40 caractères,
jamais un chemin de l'application (`communaute`, `explorer`, `calendrier`, `bilans`, `pro`,
`reglages`, `evenement`, `connexion`, `v2`, `admin`, `api`). Saisie, elle se nettoie à la frappe
(majuscules en minuscules, espaces en tirets, accents retirés).

**La vitrine affiche les liens** de `links` (le premier lien de type « site » ou, à défaut, la
colonne `website` héritée de la V1, pour les vitrines pas encore rééditées).

### 3. Les images

- Choisir une image : aperçu **immédiat à sa place** (URL locale), **rien n'est envoyé avant
  Enregistrer**.
- Avant l'envoi, le navigateur la réduit (canevas) : bannière **2 000 px** de large au plus, logo
  **512 px**, en **WebP** (repli JPEG). Une photo de 10 Mo devient quelques centaines de Ko.
- Envoi dans le dépôt `entity-gallery`, chemin `{actor_id}/{cover|avatar}/{horodatage}.webp`
  (celui de la V1). Refus si ce n'est pas une image ou si elle dépasse 15 Mo avant réduction :
  « Cette image ne peut pas être utilisée. »

### 4. Enregistrer

Dans l'ordre : envoyer les images choisies → un seul `update` de `entities` (les colonnes
changées) pour l'acteur. La politique `entities_update_member` l'autorise ; les déclencheurs
protègent déjà plan, Pro offert, Ambassadeur et Certifié.

- **Adresse déjà prise** (`23505` sur `entities_public_slug_key`) : rien n'est publié, la ligne de
  l'adresse se rouvre, sélectionnée, avec « Cette adresse est déjà prise ».
- **Autre échec** : les modifications restent à l'écran, « Tes modifications n'ont pas pu être
  enregistrées. » et Enregistrer reste disponible.
- **Après un changement d'adresse** : la page passe à la nouvelle adresse (`replace`), et
  « Ma vitrine » de la barre latérale suit (`reloadIdentity`).

### 5. Les animations

Toutes sur les jetons de mouvement (`--duration-*`, `--ease-*`), coupées par
`prefers-reduced-motion` :
- bascule : la barre glisse du haut, les cadres et l'atténuation en fondu, les boutons du visiteur
  sortent en fondu ;
- survol d'un élément modifiable : le pointillé se fonce ;
- sélection : le pointillé devient trait plein dégradé avec halo, en fondu ;
- bannière : le curseur « main » pendant le glissé, l'image suit le pointeur sans délai ;
- sortie : l'inverse de l'entrée ; « Vitrine mise à jour » apparaît puis s'efface.

## Comment c'est construit

- **`lib/vitrine-edit.ts`** (pur, testé) : le brouillon (`VitrineDraft`), ce qui a changé
  (`changedColumns`), la validation (`slugProblem`, `cleanSlug`, longueurs), les liens
  (`linkType`, `normalizeUrl`), la position de bannière (`bannerPositionFrom(dy, height, start)`).
- **`lib/image-resize.ts`** : réduire une image au navigateur (canevas, WebP / JPEG).
- **`features/vitrine/`** : `useVitrineEdit.ts` (brouillon, images en attente, enregistrement),
  `EditBar.tsx`, `EditableText.tsx` (un champ en place réutilisable), `EditableBanner.tsx`,
  `EditableLogo.tsx`, `EditableLinks.tsx`, `EditableAddress.tsx` ; `VitrinePage` et `VitrineHead`
  basculent entre consultation et édition.
- **CSS** : `3-components/vitrine-edit.css`, jetons dans `2-semantic.css` (le dégradé du logo
  existe déjà : `--brand-gradient`).

## Vérification

- Tests Vitest : `cleanSlug` (majuscules, espaces, accents), `slugProblem` (court, long, réservé,
  caractères), `linkType` (Instagram, boutiques, site), `normalizeUrl`, `changedColumns` (rien,
  un champ, les images), `bannerPositionFrom` (bornes 0 et 100).
- Dans le navigateur (serveur local branché sur la base, compte d'Uriel) : chaque élément modifié
  puis **Annuler** (rien d'écrit) ; une modification de texte **Enregistrer** puis remise à
  l'identique ; la bannière recadrée ; une adresse déjà prise (refusée, rien publié). **Aucune
  écriture de test au-delà de ce qu'Uriel modifierait lui-même, remise à l'identique.**

## Hors de ce lot

- Le QR code, « Intégrer à mon site », « Signaler », le menu « … ».
- Les icônes de catégorie sur les escales et tampons sans affiche.
- Le mode édition sur mobile, la vitrine sur mobile.
- Le genre, le SIREN, la raison sociale : les Réglages (lot 9b).
- La redirection d'une ancienne adresse (écartée, décision 4).
