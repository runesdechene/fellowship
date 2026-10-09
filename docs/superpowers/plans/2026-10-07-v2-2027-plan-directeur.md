# V2 « 2027 » — plan directeur

> 07/10/2026. Le plan global pour intégrer toute la V2 « 2027 ». **C'est le point de reprise** : après un
> `/clear`, lire ce fichier, puis le lot en cours.
>
> - Les maquettes font foi : Figma, rangées « 2027 » et « 2027 mobile » (lien dans `apps/web-v2/README.md`).
> - Ce que les maquettes demandent au code et à la base : `docs/v2/maquettes-2027.md`.
> - Les décisions : vault, `1. LE MÉTIER/2. Fellowship/Dev.md` (Tranché / Écarté).
> - La méthode du dépôt : `CLAUDE.md`, `.claude/rules/v2.md`, `.claude/rules/deploiement.md`.

## Comment on avance

Un lot à la fois, dans l'ordre. Pour chaque lot :

1. **Spec** courte si le lot n'en a pas (`docs/superpowers/specs/`), validée par Uriel.
2. **Plan détaillé** du lot (`docs/superpowers/plans/`), écrit au moment de l'attaquer — jamais à
   l'avance : chaque lot change le code sur lequel s'appuient les suivants.
3. **Code** : TDD pour la logique pure (`lib/`), migrations par le canal unique (`supabase.exe db push
   --linked`, dry-run d'abord), un commit par étape qui marche.
4. **Vérification** : `pnpm --filter web-v2 lint`, tests, build ; chaque écran ouvert en dev et comparé
   à son cadre Figma, écart par écart ; parcours testé dans le navigateur.
5. **Déploiement** de la V2 (`flw.sh/v2/`, admins seulement) ; la V1 ne bouge pas.
6. **Cocher** le lot ici et les lignes concernées dans `docs/v2/maquettes-2027.md`.

La V1 reste en production et intacte pendant tout le chantier (même base, aucun import croisé).
La bascule de `flw.sh` vers la V2 est un lot à part, en dernier, décidé par Uriel.

## Les lots

### Lot 1 — Design system « 2027 »  ☑ (07/10/2026, plan `2026-10-07-lot-1-design-system.md`)
- **Livre** : polices Inter + Instrument Serif, nouvelle matière et nouveau sens (couches 1-2), composants
  dont la forme change (bouton noir, pastilles de statut, tags colorés, contrôle segmenté, cartes
  bordées), barre latérale d'Uriel en Inter ; `docs/v2/DESIGN-SYSTEM.md` réécrit.
- **Écrans touchés** : tout l'existant (barre latérale, tableau de bord, fiche, création, connexion),
  sans fonction nouvelle.
- **Spec** : `2026-10-07-design-system-2027-design.md` (validée). **Base** : rien.
- **Fini quand** : les écrans existants ressemblent aux cadres « 2027 » correspondants.

### Lot 2 — Tableau de bord  ☑ ordinateur (07/10/2026) · ☐ objectif de CA, montant versé et échéance (avec le lot 3), mobile
- **Livre** : frise de saison, « Ma prochaine date » (pastille Inscrit pleine, objectif), « À venir »,
  **« Mes dossiers »** (dossier + paiement : à payer / acompte / payé, solde, échéance), « Mes bilans »
  (bloc, en Pro), **activité du réseau** en bas de la barre latérale (+ arrivées d'exposants).
- **Cadre** : `2027 — Tableau de bord`. **Base** : objectif de CA par participation (migration).
- **Dépend de** : lot 1.
- **Tranché en route** : livrés « Bonjour », la frise en gélules, « Mes dossiers » (remplace « À
  régler »), le bloc « Mes bilans », le fil « Activité du réseau » (arrivées, dates prises, abonnements,
  festivals ajoutés ; sans avis, dont l'identité est protégée ; sans « Tout voir » tant que la
  Communauté n'existe pas). La base ne garde ni le montant versé d'un acompte ni l'échéance du solde
  (`payments` et `total_cost` sont vides partout) : « Mes dossiers » dit « Reste le solde sur 450 € »
  sans barre de progression ; les colonnes et leur saisie arrivent avec « Mon dossier » sur la fiche
  (lot 3), comme l'objectif de CA — une colonne sans écran pour la remplir serait morte. « Tout
  voir » des bilans déplie sur place en attendant l'écran « Mes bilans » (lot 7). La bande « Ta
  prochaine action » (bilan à remplir) est gardée bien qu'absente de la maquette : à trancher par
  Uriel.

### Lot 3 — Fiche événement  ☑ ordinateur (07/10/2026) · ☐ rappel de clôture (Pro), mobile
- **Livre** : statut en contrôle segmenté (« Dossier envoyé »), **Mon dossier** (paiement détaillé),
  **Pour candidater** (date limite, comment, dossier, contact, ce que j'ai envoyé), **avis** (note globale
  gratuite, détail Pro, extraits à l'identité protégée), **discussions** au nouveau style, fixer un
  objectif, rappel de clôture (Pro) ; **écrire un avis** (page).
- **Cadres** : `2027 — Fiche événement`, `2027 — Écrire un avis`.
- **Base** : « ce que j'ai envoyé » par exposant ; vérifier les colonnes candidature existantes.
- **Dépend de** : lots 1-2.
- **Tranché en route** : le privé d'un exposant sur une date (objectif de CA, acompte, échéance
  du solde, ce qu'il a envoyé) vit dans une table neuve `participation_dossiers` (migration
  `20261007200000`, appliquée) — pas sur `participations`, dont la lecture est publique pour une
  date « inscrit ». Recliquer l'étape choisie du statut retire la date (« Je n'y vais pas » n'est
  plus un bouton). « Je paie ma place / On me paie un cachet » reste, en petit, sous le paiement :
  absent de la maquette, mais sans lui un cachet ne se saisit plus. Le détail des avis porte le
  badge Pro mais reste visible à tous jusqu'au lot 7. Le retour reste dans la barre du haut (règle
  « sortir d'un écran est du châssis ») alors que la maquette le pose au-dessus du titre :
  contradiction à trancher par Uriel. Les discussions passent en carte 2027, mais la signature
  reste sous la question (la maquette la pose au-dessus). Le titre d'« Écrire un avis » est
  « Alors, c'était comment ? » : « Alors, ces Aventuriales ? » ne se généralise pas à tous les noms.

### Lot 4 — Calendrier  ☑ ordinateur (07/10/2026) · ☐ mobile
- **Livre** : frise horizontale de mois, cartes-affiches, filtres Mes amis / Intéressé, compagnons
  « y va », navigation des 12 mois, horizon 6 mois en gratuit (mois Pro au-delà).
- **Cadres** : `2027 — Calendrier`, `2027 mobile — Calendrier`.
- **Spec** : `2026-10-07-calendrier-v2-design.md` — **à aligner** sur la maquette finale avant le plan.
- **Dépend de** : lot 1.
- **Tranché en route** : l’horizon 6 mois du gratuit attend le lot 7 — l’authentification de la V2 ne
  connaît pas encore l’offre du compte ; en attendant, tout le monde voit 12 mois. La carte sans
  affiche montre la date en serif, sans l’icône de catégorie en filigrane : la V2 n’a pas encore
  d’icônes de catégorie (elles arrivent avec l’Explorer, lot 5). Le mobile attend le châssis mobile
  (barre d’onglets en bas), qui n’existe pas encore dans la V2.

### Lot 5 — Explorer  ☑ ordinateur (07/10/2026) · ☐ icônes de catégorie, distance en km, mobile
- **Livre** : accueil éditorial (Où vont tes amis, Ajoutés récemment, Près de chez toi), recherche par
  mot (festivals + artisans), Où / Quand, catégories colorées, résultats ; étoile « Repérer »
  (horizon 6 mois en gratuit) ; cartes sans affiche (date en serif + icône de catégorie en filigrane).
- **Cadres** : `2027 — Explorer`, `2027 — Explorer · résultats`.
- **Base** : recherche plein texte ; code postal → position pour « Près de chez toi ».
- **Dépend de** : lot 1.
- **Tranché en route** : la recherche est un `ilike` sur le nom, la ville et le département
  (festivals) et sur le nom, la ville et le métier (exposants), pas encore un plein texte. « Près
  de chez toi » compare le département de l'enseigne : l'acteur n'a pas de coordonnées, et les
  géocoder demanderait un service extérieur (à décider avec Uriel) — d'où l'absence de « à 24 km ».
  Les rangées glissent à l'horizontale avec leurs flèches (exception assumée, comme la frise du
  calendrier) ; pas de « Tout voir » tant qu'il n'y a pas d'écran où l'envoyer. L'étoile pose la
  date en « Intéressé » (ou la retire) ; une date déjà engagée garde son étoile pleine. Les cartes
  sans affiche n'ont pas l'icône de catégorie en filigrane : la V2 n'a pas encore ces icônes.

### Lot 6 — Vitrine d'un artisan  ☑ ordinateur, consultation (07/10/2026) · ☐ édition, QR, intégration, signaler, mobile
- **Livre** : page publique (bannière, logo, Certifié = Pro, réseau, prochaines escales, tampons),
  états du propriétaire (modifier, intégrer à mon site), Suivre / Partager / QR / Signaler.
- **Cadre** : `2027 — Vitrine d’un artisan`. **Dépend de** : lot 1.
- **Tranché en route** : la vitrine vit à `/:slug` comme dans la V1. Livré : bannière, logo, nom,
  Certifié (Pro ou vérifié), Ambassadeur, métier, ville, présentation, site, abonnés et compagnons
  exposants, prochaines escales avec les amis du visiteur, tampons, Suivre / Partager. Le
  propriétaire voit « Modifier ma vitrine », qui ouvre l'éditeur de la V1 en attendant celui de la
  V2. Reste : l'éditeur, le QR, « Intégrer à mon site », « Signaler » et le menu « … » — absents de
  l'écran plutôt que des boutons morts.

### Lot 7 — Le Pro et les bilans  ☑ (09/10/2026) · 7a bilans ☑ (08/10/2026, plan `2026-10-08-lot-7a-bilans-v2.md`) · 7b statut Pro ☑ (08/10/2026, plan `2026-10-08-lot-7b-statut-pro-v2.md`) · 7c offre et paiement ☑ (09/10/2026, plan `2026-10-09-lot-7c-offre-pro-v2.md`, fonctions Stripe redéployées)
- **Livre** : états verrouillés (aperçu flouté, pastille Pro, bulles), page **Mes bilans**, **bilan d'une
  date** (page, enregistrement automatique, ce qui a marché), offre Pro, branchement Stripe existant,
  intégration du calendrier sans la marque.
- **Cadres** : `2027 — Mes bilans`, `2027 — Bilan d’une date`, `2027 — Mes bilans · compte gratuit`,
  `2027 — Points de contact du Pro`, `2027 — Offre Pro`.
- **Prix tranché le 08/10/2026** : 9,99 € HT / mois, 99,90 € HT / an, essai de 14 jours. Les nouveaux
  prix Stripe et la bascule des abonnés actuels passent **après** la V2 (ordre d'Uriel). Reste à
  confirmer : la prévenance avant la fin de l'essai.

### Lot 8 — Notifications et alertes  ☐
- **Livre** : panneau de la cloche, préférences (appli / e-mail), alertes Pro : clôture des
  candidatures, nouvelle édition d'un festival déjà fait, recherches sauvegardées.
- **Cadres** : `2027 — Notifications`, section Notifications de `2027 — Réglages`.
- **Base** : notifications, préférences, recherches sauvegardées, **lien entre éditions** ; envois
  planifiés (e-mails). **Le plus lourd côté back.**
- **Ajouté le 08/10/2026 (retour client)** : une notification quand quelqu'un écrit dans la discussion
  d'un festival où tu vas, et la **mise en sourdine** d'une discussion. Le lien entre éditions sert
  aussi à afficher **ton bilan de l'an passé** sur la fiche de la nouvelle édition.

### Lot 9 — Communauté et réglages  ☐
- **Livre** : Communauté (fil groupé par jour, « Ça se rassemble », suggestions, identité protégée) ;
  Réglages (profil, compte, notifications, enseignes et abonnement, **vraie suppression de compte**).
- **Cadres** : `2027 — Communauté`, `2027 — Réglages`.
- **Ajouté le 08/10/2026** : la communauté est au cœur de Fellowship ; les festivaliers reviennent
  comme **public de l'exposant** (discussion « Entre exposants / Avec les festivaliers »), pas comme
  clients — l'arrivée reste celle de l'exposant.

### Lot 10 — Connexion, arrivée, création et modification d'une date  ☐
- **Livre** : connexion au nouveau style ; **arrivée d'un exposant** (prénom, marque, métier, ville,
  lien — plus de parcours festivalier) ; création d'une date (4 étapes, doublons enrichis, aperçu en
  direct) ; **modification d'un événement** (info manquante mise en avant, aperçu en direct de la fiche).
- **Cadres** : `2027 — Connexion`, `… · code`, `2027 — Bienvenue · ta marque`,
  `2027 — Ajouter une date · étape 1`, `2027 — Modifier un événement`.
- **Base** : historique des modifications ; vérifier qui peut modifier un événement.

### Lot 11 — Landing publique  ☐
- **Livre** : la landing « 2027 » (accroche « Ta saison de festivals, avec ceux qui la font. »,
  section « Tu n'y vas jamais seul », bande Festivaliers — mise à jour validée le 08/10/2026 ; recherche sans compte, défilé des types en
  couleurs, festivals, histoire, six fonctions, Pro, organisateurs, « Propulsé par Runes de Chêne ») ;
  remplace la page « Parchemin ».
- **Cadre** : `2027 — Landing`. **À fournir par Uriel** : photos de marché, relecture de l'histoire.
- **Règle du 08/10/2026** : la recherche publique (sans compte) se fouille sur **6 mois**, comme l'Explorer gratuit, avec le même compteur « N festivals t'attendent après {mois} » ; les fiches restent ouvertes par lien direct (et indexables).

### Lot 12 — Bascule de `flw.sh` vers la V2  ☐
- Décidé par Uriel quand les lots 1-11 suffisent à remplacer la V1. Redirections, service worker,
  annonce aux utilisateurs. Le mobile des écrans restants est fait au fil des lots, avec chaque écran.

## Mobile — premier passage (07/10/2026, validé par Uriel sur téléphone le 08/10/2026)

Sous 760 px : la barre latérale disparaît, une barre d'onglets en bas (Explorer, Calendrier,
Communauté inerte, Tableau, « Moi » qui ouvre la liste des comptes), la marque en haut à gauche, la
cloche et un « + » rond à droite ; chaque écran passe en une colonne (affiche pleine largeur en tête
de fiche, recherche réduite au mot dans l'Explorer). Rien n'a pu être regardé sur un écran étroit :
la fenêtre du navigateur piloté est maximisée et le site refuse d'être affiché dans un cadre. Uriel l'a relu sur
son téléphone : bon.

## Après la V2

Les organisateurs : comptes, réception des candidatures, « Postuler en 1 clic » (idée de l'ancienne
landing), covoiturage entre exposants.
