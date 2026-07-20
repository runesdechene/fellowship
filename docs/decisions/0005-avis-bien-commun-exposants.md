# 0005 — Les avis de festival, bien commun des exposants (et non plus levier Pro)

- **Date :** 2026-07-21
- **Participants :** Uriel (CEO) · Claude (XO)
- **Statut :** `acté` (positionnement validé ; livré avec la feature « réponses aux avis »)
- **Lien :** impacte la [matrice gratuit/Pro](0001-fondations-vision-packs-da.md) ; adossé au [badge Certifié](0004-badge-certifie-levier-pro.md) comme levier Pro restant.

## Contexte

On ajoute les **réponses aux avis de festival** (fil plat sous chaque avis ; cf. spec
`docs/superpowers/specs/2026-07-20-reponses-avis-festival-design.md`). Le besoin porté par
Uriel : que **tout exposant** puisse répondre à un avis, pas seulement les Pro.

Or, jusqu'ici, la **lecture du détail des avis** (commentaires, liste complète) était
réservée au **Pro** (lock client `canSeeDetails = plan === 'pro'`). Un exposant gratuit
voyait la note moyenne + les critères, mais pas les commentaires.

Contradiction : laisser un exposant gratuit **répondre** à un avis qu'il ne peut pas
**lire** n'a aucun sens.

## Décision

**On ouvre la lecture des avis (détail + commentaires) à tout exposant (entité), gratuit
comme Pro.** Le lock Pro sur les avis saute. Les avis deviennent un **bien commun des
exposants** — un fil de retours d'expérience entre pairs, vivant dès le départ parce que
tout le monde peut y lire ET y répondre.

## Justification

- **Cohérence produit** : répondre implique lire. Un mur au milieu casse l'usage.
- **Effet réseau > rétention par mur** : la valeur des avis croît avec la participation.
  Verrouiller la lecture bride le volume de contributions — exactement ce qui fait vivre la
  feature. On préfère un contenu riche et animé qu'un contenu rare derrière un péage.
- **Le Pro ne perd pas grand-chose** : c'était un argument faible (« payer pour lire des
  commentaires »). Le Pro conserve ses vrais leviers.

## Ce que le Pro garde comme leviers

- **Calendrier**, **Communauté**, **Dashboard exposant** (gating fonctionnel).
- **Badge Certifié** (décision 0004) — le levier de crédibilité, plus fort qu'un mur.

## Conséquence sur la matrice freemium

- **Avant** : avis détaillés = Pro. Exposant gratuit = note + critères, commentaires lockés.
- **Après** : avis détaillés (lecture + réponses) = **tout exposant**. Plus de lock Pro sur
  les avis.
- À répercuter dans la mémoire projet `project_freemium_matrix`.

## Hors périmètre

- **Discussion générale du festival** : chantier distinct, sa propre spec à venir.
- **Signalement des réponses** : différé en v1.1 (extension de `content_reports`).
