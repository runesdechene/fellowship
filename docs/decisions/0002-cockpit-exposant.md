# 0002 — Cockpit exposant (home après login)

- **Date :** 2026-05-24
- **Participants :** Uriel (CEO) · Claude (XO)
- **Statut :** `acté` (maquette validée)
- **Maquette de référence :** [`assets/dashboard-exposant.html`](assets/dashboard-exposant.html)
- **Lié à :** [0001 — Fondations & DA](0001-fondations-vision-packs-da.md)

> Premier écran du produit (après login). Pas « un calendrier » mais **un vrai tableau de bord de pilotage** d'activité d'exposant nomade. DA « Nuit de Festival » (thème nuit par défaut + jour), menu latéral gauche.

## Structure (validée)

- **Menu latéral gauche** : sélecteur d'**entité** en haut (« Rune de Chêne · Exposant » — le compte unique en action), nav (**Explorer** tout en haut, puis Tableau de bord, Calendrier, Communauté, Ma vitrine, Documents, Paramètres), compte « Uriel » + **toggle thème nuit/jour** en bas.
- **Bandeau Bilan** pleine largeur en haut.
- **3 colonnes indépendantes** (flex, hauteurs naturelles — pas de grille en lignes qui couple les hauteurs et crée des trous) :
  - **Col 1** : Prochain festival → Tes prochains festivals
  - **Col 2** : À régler & finaliser → Mes compagnons de route
  - **Col 3** : Mon véhicule → Ta saison 2026

## Modules

- **Prochain festival** : grande **affiche portrait à gauche** + infos à droite (J-X, dates, lieu+km, statut, compagnons présents, « Voir le dossier / Itinéraire / 💬 »).
- **Bilan post-festival** : quand un festival est **terminé**, prompt « Comment ça s'est passé ? » → renseigner CA, note, impressions (rentabilité par festival, pas un agrégat).
- **Tes prochains festivals** : liste verticale (affiche + nom + date + **statut** : Payé / À payer / Inscription) + « Ajouter une date ». Pas de festivals « à prospecter » ici (ils vivent dans Découvrir).
- **Ta saison 2026** : frise des 12 mois avec **nb de dates par mois** (vert si rempli, pointillé ambre si vide) → repérer les **trous** (« Sept & Nov vides → trouve des dates »). Coup d'œil « ma saison est-elle validée ? ».
- **Mes compagnons de route** (fusion réseau + « Où vont tes compagnons ») : avatars de la troupe + bandeau « 🎪 Vous serez N réunis à X → Rejoindre la discussion », puis sous-section **bulles → flèche → affiche** (qui va où).
- **Mon véhicule** : véhicule **nommé** (« Griffon »), **photo uploadable** (optionnelle ; fallback icône + « Ajoute une photo »), modèle, **conso éditable**, **coût/km calculé automatiquement** depuis le prix carburant. Supporte **plusieurs véhicules** (équipe : ex. Mathéo gère le stand Nord avec « Faucon »).
- **À régler & finaliser** : paiements dus + inscriptions à boucler, d'un coup d'œil.

## Décisions notables

- **Chat / « expédition » = un fil GLOBAL par festival** (tous les exposants présents), **pas** de sous-groupes créés par untel autour de son réseau (trop de fragmentation). Le festival fédère ; l'esprit de camaraderie entre exposants est déjà là. → chaque festival a UNE discussion.
- **Coût carburant temps réel** : conso saisie par l'user × **prix moyen du gazole/SP95** récupéré via l'**open data carburants** (`prix-carburants.gouv.fr` / data.gouv.fr), rafraîchi quotidiennement. Affinable par région plus tard.
- **Équipe multi-personnes** : une entité peut être gérée par plusieurs personnes (stands dupliqués Nord/Sud). Surfacé via les véhicules (conducteur par véhicule/stand). À creuser pour la refonte comptes.
- **Vocabulaire** : « **compagnons (de route)** » plutôt qu'« amis » ou « troupe ». « Réseau » → « Mes compagnons de route ».

## Retirés volontairement (allègement / honnêteté V1)

- **Km parcourus** (total) : faux à cause des boucles/allers-retours → trompeur.
- **CA / Bénéfice agrégés** sur la home : trompeurs (les exposants ont souvent d'autres sources de revenus). La rentabilité reste **par festival** dans le bilan.
- **Bloc Documents** sur la home : pas utile en V1 (pas d'organisateurs à qui les envoyer encore) → reporté.
- **« À faire » générique** : présupposait les organisateurs (deadlines/réponses) → remplacé par « Ta saison » + « À régler ».

## Détails DA (rappel, cf. 0001)

- 2 thèmes : **nuit** (défaut, halos chauds) + **jour** (fond lin plat uniforme, halos masqués pour éviter les taches de couleur). Toggle lune/soleil.
- Palette **copper (bronze patiné) + vert tilleul `#a8cc7a`** + ambre. Plus Jakarta Sans + Inter.

## Écran Calendrier (validé)

Maquette : [`assets/calendar-exposant.html`](assets/calendar-exposant.html). Reprend le paradigme du calendrier actuel de l'app (vue année), redesigné en Nuit de Festival.

- **Vue année** : 12 mois en grille (**4 → 3 → 2 → 1** colonnes selon la largeur), hauteurs **égalisées par ligne**.
- Chaque mois = **carte-cadre** avec un **bandeau illustré de saison** (flocons, cœurs, soleil, vagues, lune, citrouille, sapin…) en en-tête.
- **Carte festival épurée** : **affiche portrait encadrée** (arrondie, qui respire), **fond neutre** (`surface2`, pas de teinte par tag), **tag neutralisé** (chip gris + emoji coloré — testé : moins de bruit visuel).
- **Statut = badge rond** (icône + label dessous), à gauche de la **date neutre/terreuse**. Termes : **Payé · À payer · Repéré · Terminé** (Repéré = festival qui intéresse, à creuser ; « En réflexion » possible plus tard).
- **Compagnons** : ligne discrète sous l'événement (« X compagnons sur cette date »). Festivals d'amis seuls = bloc minoritaire « Tes compagnons ce mois-ci ».
- **Mois vides** : opacité faible + « Ce mois est libre » très discret.
- Filtres = **toggles** d'affichage (Mes festivals / Mes compagnons), pas de « Découvrir » (page à part).

## Écran Explorer (validé)

Maquette : [`assets/explorer.html`](assets/explorer.html). Page de **découverte des festivals**, renommée **« Explorer »** et placée **tout en haut** du menu (au-dessus du Tableau de bord). Pensée comme l'expérience de découverte partagée exposant **et** festivalier.

- **Carousel coverflow plein écran** : grande **affiche centrale** (animée, léger Ken Burns), affiches **précédente/suivante** de part et d'autre, **3ᵉ niveau** plus rapproché. Les côtés sont **assombris (brightness), pas transparents** (sinon on voyait au travers). Ça **tourne tout seul** (~4,5 s), flèches + clic sur une affiche latérale pour naviguer. Le **fond ambiant** suit l'affiche centrale.
- **Affiches sans bordure ni radius** (ce sont de vraies affiches, souvent avec texte intégré → on ne plaque rien dessus).
- **Infos sous la carte** (et **non** sur l'affiche) : intitulé · nom · type+lieu+dates · amis qui y vont. Elles **changent à chaque rotation**. Bloc **centré à égale distance** entre le bas de l'affiche et les boutons.
- **Boutons d'action fixes en bas** : « Voir le festival » + « ★ Repérer » + compteur de résultats.
- **Topbar = barre segmentée Quoi / Où / Quand** (façon Airbnb, une seule ligne — scalable aux **~28 catégories** prévues, vs empiler des pills). Chaque segment ouvre un **popover** :
  - **Quoi** → grille des catégories (+ « N autres… »).
  - **Où** → ville + **curseur de rayon (km)** + bouton **« 🇫🇷 Toute la France »** (recherche nationale, ignore le rayon).
  - **Quand** → **périodes glissantes** : Ce mois-ci / 3 / 6 / **12 prochains mois** / Ajoutés récemment / Terminés. (Pas de « Cette année » → caduque en décembre ; on raisonne en fenêtre glissante.)
- **« Qui y va » = uniquement tes abonnés** (cf. modèle de visibilité) : bouboules avatars + « Camille & Maraël y vont » (1-2 nommés) ou « **N utilisateurs de Fellowship y vont** » (au-delà).

## Ouvert / à creuser

- [ ] Mécanique précise du chat de festival (qui peut écrire, modération, public/privé).
- [ ] Modèle de données équipe (membres d'une entité, rôles/permissions).
- [ ] Source/API exacte du prix carburant + cache.
- [ ] États « avec photo » du véhicule (la maquette montre le fallback sans photo).
