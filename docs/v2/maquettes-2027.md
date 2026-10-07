# Maquettes « 2027 » — ce qu'elles demandent au code

> 07/10/2026. Les maquettes de la rangée « 2027 » du Figma (lien dans `apps/web-v2/README.md`)
> font foi pour la V2. Les décisions vivent dans le vault (`Fellowship/Dev.md`, section Tranché) ;
> ce carnet liste ce qu'elles impliquent côté code et base, pour que rien ne se perde entre la
> maquette et le plan. Une ligne cochée = intégrée dans une spec ou un plan.

## Les écrans

| Écran | Cadre Figma | État |
|---|---|---|
| Tableau de bord | `2027 — Tableau de bord` | validé (avec « Mes dossiers ») |
| Calendrier | `2027 — Calendrier` | validé — spec `docs/superpowers/specs/2026-10-07-calendrier-v2-design.md` |
| Fiche événement | `2027 — Fiche événement` | validé (enrichie le 07/10 : dossier, candidature, avis, discussions) |
| Explorer, accueil | `2027 — Explorer` | validé |
| Explorer, résultats | `2027 — Explorer · résultats` | validé |
| Vitrine d'un artisan | `2027 — Vitrine d’un artisan` (+ états du propriétaire) | validé |
| Mes bilans | `2027 — Mes bilans` | validé |
| Bilan d'une date | `2027 — Bilan d’une date` | validé |
| Ajouter une date | `2027 — Ajouter une date · étape 1` | dessiné (étapes 2-4 au même gabarit) |
| États Pro | `2027 — Mes bilans · compte gratuit`, `2027 — Points de contact du Pro` | dessiné |
| Notifications | `2027 — Notifications` | dessiné |
| Offre Pro | `2027 — Offre Pro` | dessiné |
| Communauté | `2027 — Communauté` | dessiné |
| Réglages | `2027 — Réglages` | dessiné |
| Page d'un organisateur | — | **pas maintenant** : les organisateurs ne peuvent pas encore créer de compte |
| Connexion (e-mail, code) | `2027 — Connexion`, `2027 — Connexion · code` | validé |
| Arrivée d'un exposant | `2027 — Bienvenue · ta marque` (étape 2 sur 5, vitrine en direct) | dessiné — l'écran du choix est **écarté** |
| Landing publique | `2027 — Landing` | validé (photos de marché à fournir ; défilé des types en couleurs) |
| Écrire un avis | `2027 — Écrire un avis` | dessiné |
| Modifier un événement | `2027 — Modifier un événement` | dessiné |
| Mobile — tableau de bord, calendrier, fiche, Explorer | `2027 mobile — …` (rangée sous les écrans ordinateur) | dessiné |
| Thème sombre — tableau de bord, fiche, calendrier | `2027 sombre — …` (rangée sous le mobile) | validé le 08/10/2026 |
| Mobile — les autres écrans | — | à dessiner au moment de leur spec |

## Le langage visuel — à réécrire dans `docs/v2/DESIGN-SYSTEM.md`

- [ ] Fond blanc légèrement chaud (`#fcfbf9`), barre latérale d'Uriel (beige, logo centré, panneau à arrondi inversé, pas de bordure).
- [ ] Polices : **Inter** partout, **Instrument Serif** pour les grands titres seulement (noms de mois, nom d'un festival ou d'une enseigne, chiffres phares).
- [ ] Deux encres (`#1f1d1b`, `#6f6b66`) + `#a6a19b` pour le tertiaire ; filets `#ebe9e5` ; surfaces `#f2f0ec`.
- [ ] Le **dégradé terre du logo** (`#964623` → `#cf9251`) ne dit qu'une chose : **acquis** (Inscrit, bénéfice). Pastille pleine pour une date seule, coche en dégradé dans les listes.
- [ ] Statuts par la **forme** : Intéressé = cercle en pointillés, Dossier envoyé = cercle à moitié plein, Inscrit = dégradé. Remplace les tons blé / terre / olive actuels du CSS.
- [ ] **Plus de vert**, sauf le point « en direct » de l'activité du réseau.
- [ ] **Les tags portent toujours leur couleur** (fond teinté ~16 %, liseré ~35 %, texte et icône assombris), partout : défilé de la landing, puces de l'Explorer, en-tête de la fiche, modification d'un événement, création. Les couleurs viennent de la table des tags.
- [ ] Bouton principal noir ; liens en encre avec une flèche ; pas d'ombre (liseré seul sur les flottants).
- [ ] Le Pro se signale par une petite pastille noire « Pro », jamais par un cadenas.

## Base de données — migrations à prévoir

- [ ] **Objectif de chiffre d'affaires** par participation (colonne). L'objectif de saison = la somme des objectifs (recommandé, à confirmer).
- [ ] **Préférences de notifications** (par type, appli / e-mail).
- [ ] **Notifications** elles-mêmes (la cloche de la V2 n'ouvre rien aujourd'hui).
- [ ] **Recherches sauvegardées** (alerte Pro).
- [ ] **Lien entre les éditions d'un même festival**, pour l'alerte « nouvelle édition » — rien ne relie aujourd'hui l'édition 2026 à 2027.
- [ ] **Suppression de compte réelle** : en V1, « Supprimer mon compte » déconnecte seulement (problème RGPD).
- [x] Les **organisateurs** ne peuvent pas encore créer de compte (Uriel, 07/10/2026) : pas de page organisateur, et la section « Organisateurs » des résultats est masquée dans la maquette.
- [ ] À vérifier : les **événements récurrents** (« tous les dimanches ») n'existent sans doute pas — la carte de la maquette disparaît dans ce cas.

## Le Pro (décidé le 07/10/2026)

- [ ] Certifié = plan Pro.
- [ ] Bilans et objectifs : Pro (aperçu flouté + invitation pour le gratuit).
- [ ] Notes détaillées des festivals (affluence, organisation, rentabilité — les axes de la V1) : Pro ; en gratuit, la note globale et la lecture des avis.
- [ ] Suivi des dossiers et des paiements : **gratuit** (fonction plébiscitée).
- [ ] Tout le monde voit tous les événements ; en gratuit, **repérer ou s'inscrire jusqu'à 6 mois** (étoile, calendrier, alerte au-delà).
- [ ] Alertes Pro : clôture des candidatures (7 jours avant), nouvelle édition d'un festival déjà fait, recherches sauvegardées.
- [ ] Intégration du calendrier sur son site : gratuite avec la mention Fellowship, Pro sans la marque et personnalisable.
- [ ] Gratuit : tableau de bord, amis, activité, communauté, avis et questions, vitrine.
- [x] Prix repris de la V1 : 11,99 € HT/mois ou 119,88 € HT/an, essai 14 jours — confirmés par Uriel (08/10/2026).
- [ ] La FAQ promet « on te prévient trois jours avant la fin de l'essai » — **à vérifier côté Stripe**, sinon retirer la phrase.
- [ ] À terme : calcul du coût de la route selon le véhicule (Pro).

## Écran par écran — ce qui change par rapport au code actuel

- [ ] **Statut `en_cours`** : libellé « Dossier envoyé » partout (`EventStatus.tsx` dit « Dossier en cours »).
- [ ] **Navigation** : Explorer · Calendrier · Communauté · Tableau de bord ; « Activité du réseau » en bas de la barre (gratuite).
- [ ] **Mobile** : barre d'onglets en bas (les quatre entrées + l'avatar « Moi » à droite, qui ouvre le menu du compte en feuille) ; l'onglet actif en dégradé du logo ; en haut le logo de l'appli, la cloche et le « + » ; la barre d'état du téléphone occupe la zone sûre du haut ; la fiche ouvre sur l'affiche pleine largeur (retour et partage posés dessus) ; le calendrier glisse mois par mois avec les initiales des mois fixées en haut ; l'Explorer ramasse Rechercher / Où / Quand en un seul champ + un bouton de filtres, les catégories et les rangées glissent.
- [ ] **Activité du réseau / Communauté** : ajouter les arrivées (« X vient de rejoindre Fellowship ») ; les avis respectent l'**identité protégée** (« Un exposant a noté… » sauf pour les amis professionnels).
- [ ] **Fiche** : contrôle segmenté du statut (Inscrit en dégradé) ; « Fixer un objectif » ; rappel de clôture (Pro). Ordre : Statut · **Mon dossier** (paiement : à payer / acompte versé / payé, montant versé, solde et échéance, à qui) · À propos · Informations · **Pour candidater** (date limite, comment, dossier en ligne, contact, ce que j'ai envoyé — à stocker par exposant) · **Avis** (note globale ; détail affluence / organisation / rentabilité en Pro ; extraits à l'identité protégée) · **Discussions** (questions, réponses, « Résolu », champ pour poser une question). L'affiche reste fixe au défilement.
- [ ] **Explorer** : recherche par mot (festivals et artisans ; pas d'organisateurs pour l'instant), barre Où / Quand, catégories en puces, rangées éditoriales ; « Près de chez toi » lit le code postal du profil.
- [ ] **Cartes sans affiche** : grande date en serif + icône de la catégorie en filigrane (les icônes des tags existent en V1).
- [ ] **Bilans** : vraie page « Mes bilans » (année, totaux, bénéfice par mois, tableau) ; le bilan devient une page ; « Ce qui a marché » saisissable (colonne `wins` déjà en base) ; tout s'enregistre seul ; bénéfice par jour.
- [ ] **Tableau de bord — « Mes dossiers »** (gratuit, fonction plébiscitée) : une ligne par date à venir avec le statut du dossier et du paiement (montant versé, solde, échéance) ; remplace le bloc « À régler » actuel (`SettlementsSection`).
- [ ] **Écrire un avis** (page, plus une fenêtre) : trois notes en étoiles (affluence, organisation, rentabilité), commentaire facultatif, « Qui voit ton nom ? » (mes amis exposants par défaut / personne), aperçu de l'avis tel que les autres le voient ; réservé à qui était inscrit à l'édition (garde de la V1, `ReviewForm.tsx`) ; les organisateurs ne voient jamais le nom.
- [ ] **Modifier un événement** (page) : les champs de la création en sections ; depuis la fiche, une info manquante ouvre la page sur ce champ, mis en avant (« Il manquait cette info ») ; « dernière modification par X, il y a… » (historique à stocker) ; les changements sont visibles de tous à l'enregistrement. **Aperçu en direct** à droite : la fiche en miniature (bascule Fiche / Carte), mise à jour à la frappe, le champ en cours de saisie repéré à sa place. Même principe à reprendre sur la création d'une date. **À vérifier** : qui a le droit de modifier un événement (policy actuelle sur `events`).
- [ ] **Création d'une date** : les doublons montrent le nombre d'exposants inscrits et s'ouvrent.
- [ ] **Vitrine** : formulaire e-mail factice et incitation V1 retirés ; emplacement « Obtenir le badge Certifié » pour le propriétaire non Pro.

## Arrivée et landing (07/10/2026)

- [ ] **On ne vend plus aux festivaliers** : plus d'écran « Tu viens pour quoi ? » ; l'arrivée part sur le parcours exposant (prénom, marque, métier, ville, lien) ; CGU sur la première étape. Les comptes festivaliers existants continuent de fonctionner.
- [ ] La connexion actuelle de la V2 n'a pas d'inscription : l'arrivée de la V1 (`apps/web/src/pages/Onboarding.tsx`) est le cahier des charges.
- [ ] Landing : l'annuaire est cherchable **sans compte** (accueil public, indexable) ; la connexion reste la porte.
- [ ] Les chiffres du mur d'affiches (« 1 200 festivals · 3 400 exposants ») sont **inventés** : à lire en base, en direct.
- [ ] La page d'accueil actuelle (« Parchemin », derrière `/?v2=1`) est remplacée par la landing « 2027 ».
- [ ] **Photos de marché à fournir** (Uriel, plus tard) : derrière l'accroche (très atténuée) et derrière le bandeau Organisateurs. Les images actuelles sont des affiches floutées, provisoires.
- [ ] Landing : le **défilé des types de festivals** de la V1 revient sous la recherche (18 types, défilement continu, fondu sur les bords, pause au survol, figé si `prefers-reduced-motion`) — liste de la V1 : `apps/web/src/pages/LandingV2.tsx` (`MARQUEE_TAGS`), à lire de préférence dans la table des tags.
- [ ] Landing : l'histoire « Pourquoi Fellowship » (texte d'Uriel, relu et validé le 08/10/2026), « Propulsé par Runes de Chêne » en pied de page, bouton final en dégradé du logo (exception propre à la landing).

## Points ouverts

- [x] « À payer » : réglé le 07/10/2026 — le paiement se lit par la forme (cercle vide, à moitié plein + barre, dégradé quand c'est payé).
- [ ] Bannière de vitrine : générer une vraie photo d'atelier dans Figma (crédits IA d'Uriel) — en attente de son accord.

## Thème sombre (validé par Uriel le 08/10/2026)

- Fonds chauds foncés (éclaircis de deux crans le 08/10/2026, le premier jet était trop sombre
  pour Uriel) : barre latérale `#2a2724`, panneau `#201e1b` (plus profond que la
  barre : les cartes ressortent — choix d'Uriel le 08/10/2026, la barre plus sombre est écartée),
  cartes `#2c2926`, gouttières et pastilles `#37332f`, filets `#3c3834`.
- Encres crème : titres `#f3efe9`, texte doux `#a39d95`, pâle `#6f6962`.
- Le bouton principal s'inverse : crème, texte foncé. Le mois en cours de la frise aussi.
- La terre et le dégradé du logo ne bougent pas : ce sont eux qui ressortent la nuit.
- Les catégories gardent leur fond translucide ; leur texte prend la couleur claire de la catégorie.
- Les affiches ne changent pas.
- Bascule : le système d'abord ; l'interrupteur clair / sombre / automatique arrive avec les Réglages.
