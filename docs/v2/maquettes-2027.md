# Maquettes « 2027 » — ce qu'elles demandent au code

> 07/10/2026. Les maquettes de la rangée « 2027 » du Figma (lien dans `apps/web-v2/README.md`)
> font foi pour la V2. Les décisions vivent dans le vault (`Fellowship/Dev.md`, section Tranché) ;
> ce carnet liste ce qu'elles impliquent côté code et base, pour que rien ne se perde entre la
> maquette et le plan. Une ligne cochée = intégrée dans une spec ou un plan.

## Les écrans

| Écran | Cadre Figma | État |
|---|---|---|
| Tableau de bord | `2027 — Tableau de bord` | validé |
| Calendrier | `2027 — Calendrier` | validé — spec `docs/superpowers/specs/2026-10-07-calendrier-v2-design.md` |
| Fiche événement | `2027 — Fiche événement` | validé |
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
| Mobile (tous les écrans) | — | à dessiner |

## Le langage visuel — à réécrire dans `docs/v2/DESIGN-SYSTEM.md`

- [ ] Fond blanc légèrement chaud (`#fcfbf9`), barre latérale d'Uriel (beige, logo centré, panneau à arrondi inversé, pas de bordure).
- [ ] Polices : **Inter** partout, **Instrument Serif** pour les grands titres seulement (noms de mois, nom d'un festival ou d'une enseigne, chiffres phares).
- [ ] Deux encres (`#1f1d1b`, `#6f6b66`) + `#a6a19b` pour le tertiaire ; filets `#ebe9e5` ; surfaces `#f2f0ec`.
- [ ] Le **dégradé terre du logo** (`#964623` → `#cf9251`) ne dit qu'une chose : **acquis** (Inscrit, bénéfice). Pastille pleine pour une date seule, coche en dégradé dans les listes.
- [ ] Statuts par la **forme** : Intéressé = cercle en pointillés, Dossier envoyé = cercle à moitié plein, Inscrit = dégradé. Remplace les tons blé / terre / olive actuels du CSS.
- [ ] **Plus de vert**, sauf le point « en direct » de l'activité du réseau.
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
- [ ] Tout le monde voit tous les événements ; en gratuit, **repérer ou s'inscrire jusqu'à 6 mois** (étoile, calendrier, alerte au-delà).
- [ ] Alertes Pro : clôture des candidatures (7 jours avant), nouvelle édition d'un festival déjà fait, recherches sauvegardées.
- [ ] Intégration du calendrier sur son site : gratuite avec la mention Fellowship, Pro sans la marque et personnalisable.
- [ ] Gratuit : tableau de bord, amis, activité, communauté, avis et questions, vitrine.
- [ ] Prix repris de la V1 : 11,99 € HT/mois ou 119,88 € HT/an, essai 14 jours — **à confirmer par Uriel**.
- [ ] La FAQ promet « on te prévient trois jours avant la fin de l'essai » — **à vérifier côté Stripe**, sinon retirer la phrase.
- [ ] À terme : calcul du coût de la route selon le véhicule (Pro).

## Écran par écran — ce qui change par rapport au code actuel

- [ ] **Statut `en_cours`** : libellé « Dossier envoyé » partout (`EventStatus.tsx` dit « Dossier en cours »).
- [ ] **Navigation** : Explorer · Calendrier · Communauté · Tableau de bord ; « Activité du réseau » en bas de la barre (gratuite).
- [ ] **Activité du réseau / Communauté** : ajouter les arrivées (« X vient de rejoindre Fellowship ») ; les avis respectent l'**identité protégée** (« Un exposant a noté… » sauf pour les amis professionnels).
- [ ] **Fiche** : contrôle segmenté du statut (Inscrit en dégradé) ; « Fixer un objectif » ; rappel de clôture (Pro) ; état vide des discussions.
- [ ] **Explorer** : recherche par mot (festivals et artisans ; pas d'organisateurs pour l'instant), barre Où / Quand, catégories en puces, rangées éditoriales ; « Près de chez toi » lit le code postal du profil.
- [ ] **Cartes sans affiche** : grande date en serif + icône de la catégorie en filigrane (les icônes des tags existent en V1).
- [ ] **Bilans** : vraie page « Mes bilans » (année, totaux, bénéfice par mois, tableau) ; le bilan devient une page ; « Ce qui a marché » saisissable (colonne `wins` déjà en base) ; tout s'enregistre seul ; bénéfice par jour.
- [ ] **Création d'une date** : les doublons montrent le nombre d'exposants inscrits et s'ouvrent.
- [ ] **Vitrine** : formulaire e-mail factice et incitation V1 retirés ; emplacement « Obtenir le badge Certifié » pour le propriétaire non Pro.

## Points ouverts

- [ ] « À payer porte la terre » (décidé le 07/10 au matin) contredit la terre = « acquis » : trouver un autre signe pour « À payer » quand le bloc « À régler » sera redessiné.
- [ ] Bannière de vitrine : générer une vraie photo d'atelier dans Figma (crédits IA d'Uriel) — en attente de son accord.
