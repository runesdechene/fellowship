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

### Lot 1 — Design system « 2027 »  ☐
- **Livre** : polices Inter + Instrument Serif, nouvelle matière et nouveau sens (couches 1-2), composants
  dont la forme change (bouton noir, pastilles de statut, tags colorés, contrôle segmenté, cartes
  bordées), barre latérale d'Uriel en Inter ; `docs/v2/DESIGN-SYSTEM.md` réécrit.
- **Écrans touchés** : tout l'existant (barre latérale, tableau de bord, fiche, création, connexion),
  sans fonction nouvelle.
- **Spec** : `2026-10-07-design-system-2027-design.md` (validée). **Base** : rien.
- **Fini quand** : les écrans existants ressemblent aux cadres « 2027 » correspondants.

### Lot 2 — Tableau de bord  ☐
- **Livre** : frise de saison, « Ma prochaine date » (pastille Inscrit pleine, objectif), « À venir »,
  **« Mes dossiers »** (dossier + paiement : à payer / acompte / payé, solde, échéance), « Mes bilans »
  (bloc, en Pro), **activité du réseau** en bas de la barre latérale (+ arrivées d'exposants).
- **Cadre** : `2027 — Tableau de bord`. **Base** : objectif de CA par participation (migration).
- **Dépend de** : lot 1.

### Lot 3 — Fiche événement  ☐
- **Livre** : statut en contrôle segmenté (« Dossier envoyé »), **Mon dossier** (paiement détaillé),
  **Pour candidater** (date limite, comment, dossier, contact, ce que j'ai envoyé), **avis** (note globale
  gratuite, détail Pro, extraits à l'identité protégée), **discussions** au nouveau style, fixer un
  objectif, rappel de clôture (Pro) ; **écrire un avis** (page).
- **Cadres** : `2027 — Fiche événement`, `2027 — Écrire un avis`.
- **Base** : « ce que j'ai envoyé » par exposant ; vérifier les colonnes candidature existantes.
- **Dépend de** : lots 1-2.

### Lot 4 — Calendrier  ☐
- **Livre** : frise horizontale de mois, cartes-affiches, filtres Mes amis / Intéressé, compagnons
  « y va », navigation des 12 mois, horizon 6 mois en gratuit (mois Pro au-delà).
- **Cadres** : `2027 — Calendrier`, `2027 mobile — Calendrier`.
- **Spec** : `2026-10-07-calendrier-v2-design.md` — **à aligner** sur la maquette finale avant le plan.
- **Dépend de** : lot 1.

### Lot 5 — Explorer  ☐
- **Livre** : accueil éditorial (Où vont tes amis, Ajoutés récemment, Près de chez toi), recherche par
  mot (festivals + artisans), Où / Quand, catégories colorées, résultats ; étoile « Repérer »
  (horizon 6 mois en gratuit) ; cartes sans affiche (date en serif + icône de catégorie en filigrane).
- **Cadres** : `2027 — Explorer`, `2027 — Explorer · résultats`.
- **Base** : recherche plein texte ; code postal → position pour « Près de chez toi ».
- **Dépend de** : lot 1.

### Lot 6 — Vitrine d'un artisan  ☐
- **Livre** : page publique (bannière, logo, Certifié = Pro, réseau, prochaines escales, tampons),
  états du propriétaire (modifier, intégrer à mon site), Suivre / Partager / QR / Signaler.
- **Cadre** : `2027 — Vitrine d’un artisan`. **Dépend de** : lot 1.

### Lot 7 — Le Pro et les bilans  ☐
- **Livre** : états verrouillés (aperçu flouté, pastille Pro, bulles), page **Mes bilans**, **bilan d'une
  date** (page, enregistrement automatique, ce qui a marché), offre Pro, branchement Stripe existant,
  intégration du calendrier sans la marque.
- **Cadres** : `2027 — Mes bilans`, `2027 — Bilan d’une date`, `2027 — Mes bilans · compte gratuit`,
  `2027 — Points de contact du Pro`, `2027 — Offre Pro`.
- **À confirmer par Uriel** : prix, essai de 14 jours, prévenance avant la fin de l'essai.

### Lot 8 — Notifications et alertes  ☐
- **Livre** : panneau de la cloche, préférences (appli / e-mail), alertes Pro : clôture des
  candidatures, nouvelle édition d'un festival déjà fait, recherches sauvegardées.
- **Cadres** : `2027 — Notifications`, section Notifications de `2027 — Réglages`.
- **Base** : notifications, préférences, recherches sauvegardées, **lien entre éditions** ; envois
  planifiés (e-mails). **Le plus lourd côté back.**

### Lot 9 — Communauté et réglages  ☐
- **Livre** : Communauté (fil groupé par jour, « Ça se rassemble », suggestions, identité protégée) ;
  Réglages (profil, compte, notifications, enseignes et abonnement, **vraie suppression de compte**).
- **Cadres** : `2027 — Communauté`, `2027 — Réglages`.

### Lot 10 — Connexion, arrivée, création et modification d'une date  ☐
- **Livre** : connexion au nouveau style ; **arrivée d'un exposant** (prénom, marque, métier, ville,
  lien — plus de parcours festivalier) ; création d'une date (4 étapes, doublons enrichis, aperçu en
  direct) ; **modification d'un événement** (info manquante mise en avant, aperçu en direct de la fiche).
- **Cadres** : `2027 — Connexion`, `… · code`, `2027 — Bienvenue · ta marque`,
  `2027 — Ajouter une date · étape 1`, `2027 — Modifier un événement`.
- **Base** : historique des modifications ; vérifier qui peut modifier un événement.

### Lot 11 — Landing publique  ☐
- **Livre** : la landing « 2027 » (accroche copilote, recherche sans compte, défilé des types en
  couleurs, festivals, histoire, six fonctions, Pro, organisateurs, « Propulsé par Runes de Chêne ») ;
  remplace la page « Parchemin ».
- **Cadre** : `2027 — Landing`. **À fournir par Uriel** : photos de marché, relecture de l'histoire.

### Lot 12 — Bascule de `flw.sh` vers la V2  ☐
- Décidé par Uriel quand les lots 1-11 suffisent à remplacer la V1. Redirections, service worker,
  annonce aux utilisateurs. Le mobile des écrans restants est fait au fil des lots, avec chaque écran.

## Après la V2

Les organisateurs : comptes, réception des candidatures, « Postuler en 1 clic » (idée de l'ancienne
landing), covoiturage entre exposants.
