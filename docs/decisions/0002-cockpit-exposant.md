# 0002 — Cockpit exposant (home après login)

- **Date :** 2026-05-24
- **Participants :** Uriel (CEO) · Claude (XO)
- **Statut :** `acté` (maquette validée)
- **Maquette de référence :** [`assets/dashboard-exposant.html`](assets/dashboard-exposant.html)
- **Lié à :** [0001 — Fondations & DA](0001-fondations-vision-packs-da.md)

> Premier écran du produit (après login). Pas « un calendrier » mais **un vrai tableau de bord de pilotage** d'activité d'exposant nomade. DA « Nuit de Festival » (thème nuit par défaut + jour), menu latéral gauche.

## Structure (validée)

- **Menu latéral gauche** : sélecteur d'**entité** en haut (« Rune de Chêne · Exposant » — le compte unique en action), nav (Tableau de bord, Calendrier, Découvrir, Communauté, Ma vitrine, Documents, Paramètres), compte « Uriel » + **toggle thème nuit/jour** en bas.
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

## Ouvert / à creuser

- [ ] Mécanique précise du chat de festival (qui peut écrire, modération, public/privé).
- [ ] Modèle de données équipe (membres d'une entité, rôles/permissions).
- [ ] Source/API exacte du prix carburant + cache.
- [ ] États « avec photo » du véhicule (la maquette montre le fallback sans photo).
