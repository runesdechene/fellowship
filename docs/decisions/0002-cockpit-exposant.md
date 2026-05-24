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

## Écran Page festival — vue exposant (validé)

Maquette : [`assets/festival-exposant.html`](assets/festival-exposant.html). Écran atteint depuis « Voir le festival » (Explorer) — **surface de conversion** de l'exposant. Reprend les éléments de l'`EventPage` actuelle, redesignés en Nuit de Festival et recentrés sur la candidature.

- **Layout** : fond ambiant unique partant du haut (affiche floutée → `--bg`, aucune coupure). **Grille 2 colonnes** (`1fr` + `348px`) :
  - **Gauche** : titre (pastille statut, catégorie, nom, méta dates/lieu/type, actions Repéré/Partager/Site, organisateur) → Compagnons → À propos → Infos pratiques → Q&R → Avis.
  - **Droite** : **affiche** (largeur de la colonne, 2:3) puis **cockpit candidature sticky**.
- **Cockpit candidature** (le différenciateur vs concurrent) : J-X, deadline, **tracker auto-déclaré « suivi perso »** Repéré → Candidaté → Inscrit, lignes Emplacement / Candidature / Itinéraire (+coût véhicule), CTA **Candidater** · Poser une question · Itinéraire.
- **Candidater = modale « Comment candidater » (libre, communautaire).** Pas de dossier interne en V1 (les orgas = V2). La modale liste les **moyens connus** pour ce festival — email, dossier PDF, téléphone, contact nommé — **renseignés par la communauté** (« Suggérer une correction »). Bas de modale : « Tu as envoyé ta candidature ? → Marquer comme candidaté » (avance le tracker). Doit tourner avec **1 seul moyen** renseigné, et afficher un état vide « sois le premier à renseigner ».
- **Fellowship V1 = carnet de bord / CRM de candidatures** : même quand l'inscription se fait par mail/PDF ailleurs, l'app retient où tu en es, la deadline, le coût, qui y va. Migration propre : quand l'orga arrive (V2), le dossier devient interne et le statut se synchronise.
- **Discussion = Questions & réponses threadées** (pas un chat) : questions avec réponses attachées, badge **Résolu/Ouverte**, compteur de réponses, « Poser une question ». Argument clé : **les réponses restent d'une édition à l'autre = la mémoire du festival** (« élec sur les stands ? », « sol praticable sous la pluie ? ») → aide à décider de candidater, actif qui grossit.
- **Le chat temps réel sort de la page festival** : réservé aux **groupes** qu'un exposant crée (potes/troupe) et plus tard aux **chats d'expédition festivaliers**. La carte Compagnons pointe vers **« Créer un groupe »**.
- **Compagnons / qui y va** = followers uniquement (cf. [modèle de visibilité](#) / mémoire) : avatars + « 9 utilisateurs de Fellowship y vont » + nommés.
- **Avis** : note globale + Affluence / Organisation / Rentabilité, **détail verrouillé hors Pro** (incitation Pro).

## Écran Vitrine — profil public exposant (validé)

Maquette : [`assets/vitrine-exposant.html`](assets/vitrine-exposant.html). Page publique partageable (`flw.sh/@slug`) — **identité de l'artisan + surface d'acquisition virale**. C'est elle qui rend le réseau précieux : on clique un nom (compagnons, Q&R, discussion) → on arrive ici → on suit. Reprend les éléments de la `PublicProfile` actuelle, redesignés Nuit de Festival.

- **Layout** : cover pleine largeur (240px, fondu vers `--bg`), avatar carré arrondi en débord, header (brand_name + nom réel + métier·ville + **chips de spécialité**, badge **vérifié**), actions (Suivre / Partager / QR). **Stats réseau** : Abonnés + Compagnons (bulles cliquables) + « N festivals en 2026 ». Puis **grille 2 colonnes** (`1fr` + `340px`).
  - **Gauche** : À propos → **Sélection** → nudge « Ne rate plus ses dates » (pleine largeur).
  - **Droite** : **Liens** → **Où me rencontrer**.
- **Bouton Suivre = 3 états** (Suivre / Suivi / Compagnons) — c'est l'action-clé de la page (convertir un visiteur en abonné, cf. modèle de visibilité followers).
- **Sélection (ex-« Mes créations »)** : galerie **curée, limitée à 6 pièces signatures**. Cadrage volontairement **intemporel** (« un aperçu de mon univers, pas un flux daté ») → tue l'objection « ça fige les créations dans le passé ». Un lookbook se met à jour 2×/an, pas un feed à nourrir.
  - **Pas d'import Instagram en V1** (tranché). Raisons : l'API Basic Display est fermée (fin 2024) → l'aspiration auto exige un compte Pro + Page FB + revue d'app + tokens (fragile, beaucoup d'artisans en compte perso) ; et **on ne veut pas être un tuyau de trafic vers Meta**. La valeur de la vitrine reste **native Fellowship**. (Import éventuel = V1.5, comme simple accélérateur de remplissage, jamais comme embed.)
- **Liens** : carte façon link-in-bio, **multi-liens libres** (site web, boutique en ligne / Etsy, Instagram **en lien**, site secondaire…). Icône + libellé + domaine + ↗.
- **Où me rencontrer** : les **prochains festivals** où l'exposant expose (sa saison/tournée), + passés (atténués). Festival commun mis en avant (**« Tu y vas »**) → relie les écrans. Reframe de l'EventCarousel (statut `inscrit` uniquement, comme l'app actuelle).
- **Footer de marque** « Vitrine Fellowship · flw.sh/@slug » — la page est faite pour être **partagée** (bio Insta, boutique).
- **Vue propriétaire (« Ma vitrine »)** — *non maquettée, décrite* : remplace **Suivre** par **Éditer / Intégrer le calendrier / QR** ; ajoute **« Gérer ma sélection »** (et, si V1.5, « Importer depuis Instagram ») ; les compteurs réseau ouvrent les modales Abonnés/Compagnons avec le **« suivre en retour »** (cf. inventaire `PublicProfile`).

## Écran Communauté — le fil du réseau (validé)

Maquette : [`assets/communaute-fil.html`](assets/communaute-fil.html). **Pas un annuaire de gens** (tranché) — c'est **le fil d'activité de ton réseau** (le *qui*, vs Explorer = le *quoi*). C'est lui qui donne le **sentiment d'activité** sur le site.

- **Décision de fond : aucune grille « parcourir les exposants ».** Raisons : (1) le rôle de la plateforme n'est pas un catalogue d'humains — les liens se créent *parce qu'on est au même festival* (découverte **festival-ancrée**) ; (2) on n'agrège/n'expose pas notre base de créateurs (data) ; (3) **cohérence** avec le modèle de visibilité (on ne voit que ses abonnés partout — un browse-all serait la seule entorse, et exposerait notre faible nombre au lancement).
- **Découverte de gens = contextuelle & intentionnelle uniquement** : **recherche** (pull : tu tapes un nom que tu connais déjà), **suggestions ancrées dans une relation** (« compagnons de tes compagnons », « va aux mêmes festivals que toi », « suivi par N compagnons » — jamais une grille brute, donc jamais de compteur global révélé), et surtout la découverte **sur la page festival** (« qui y va »).
- **L'item-roi = la Convergence** : quand plusieurs compagnons tombent sur le même festival → carte mise en avant (affiche + avatars empilés + « N de tes compagnons y seront » + Voir le festival). Le fil devient un **moteur de décision** (signal de troupeau) déguisé en réseau social.
- **Autres battements** (filtrés sur tes abonnements) : avis d'un pair *avec citation* (intel de confiance, y compris négatifs honnêtes), « X va à / expose à Y » (relié au festival, « vous y seriez tous les deux »), « +N dates ajoutées » (chips), nudge de suivi **tissé dans le fil** (« Camille & Théo suivent désormais Lucie → Suivre »).
- **Colonne droite** : Suggestions ancrées + **Convergences à venir** (vue d'ensemble persistante — complémentaire de l'item Convergence du fil, qui lui est événementiel « ça vient de se confirmer »).
- **Le fil ≠ les notifications** : les notifs parlent de *toi* (on t'a suivi/commenté) ; le fil parle de *ton réseau* (où *ils* vont). À ne pas mélanger.
- **Présence dans la barre de gauche** : mini-fil « Activité du réseau » (pastille *en direct*), **plafonné à 3 lignes** poussé en bas au-dessus du compte — l'ambiance permanente, le « coin de l'œil ». + **badge rouge** sur l'onglet Communauté = activité nouvelle depuis ta dernière visite (se vide à l'ouverture, ≠ notifs perso) → l'appât qui fait revenir.
- **Démarrage à froid** : réseau pauvre → la page met les suggestions/découverte (festival-ancrées) en avant ; réseau riche → le fil prend le dessus. Jamais de page morte exposant le vide.

## Ouvert / à creuser

- [ ] Modèle de données équipe (membres d'une entité, rôles/permissions).
- [ ] Source/API exacte du prix carburant + cache.
- [ ] États « avec photo » du véhicule (la maquette montre le fallback sans photo).
- [ ] **Groupes** : un groupe est-il rattaché à un festival ou libre (puis rattachable) ? Écran Groupes à maquetter. C'est là que vit le chat temps réel.
- [ ] **Modale « Comment candidater »** : modèle de données des moyens de contact (multi-format), édition communautaire / modération, état vide.
- [ ] **Q&R festival** : threads (réponses, marquage Résolu, épinglage), persistance inter-éditions, qui peut poser/répondre.
