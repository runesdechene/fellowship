# V2 — Lot 11a : la landing publique

> Validé avec Uriel le 14/10/2026. Maquette qui fait foi : Figma `2027 — Landing` (`2104:2`).
> Plan directeur : `docs/superpowers/plans/2026-10-07-v2-2027-plan-directeur.md`, lot 11.

## Pourquoi

La landing « 2027 » remplace la landing de la V1 et la page « Parchemin ». Elle se construit
**dans la V2, sous `flw.sh/v2/`** : la V1 garde la sienne, et la nouvelle devient la vitrine le
jour où la V2 passe à tout le monde (lot 12). Un seul changement de design, assumé (Uriel,
14/10/2026).

## Découpage

- **11a (ce spec)** : la landing elle-même, toutes les sections de la maquette, données réelles.
- **11b (plus tard)** : l'annuaire public — Explorer et fiche ouverts sans compte, recherche sur
  6 mois, compteur « N festivals t'attendent après {mois} ». En 11a, tout ce qui y mènera pointe
  vers `/connexion`.

Personne d'anonyme ne passe par `/v2/` avant la bascule : 11a seul est relisable en entier.

## La route

`/` de la V2 :

| Qui                       | Voit                              |
| ------------------------- | --------------------------------- |
| Sans session              | la landing                        |
| Session avec accès V2     | le tableau de bord (inchangé)     |
| Session sans accès V2     | renvoyé vers la V1 (inchangé)     |

Le changement vit dans la garde (`lib/access.ts`), en fonction pure testée : sur `/`, « pas de
session » rend « landing » au lieu de « connexion ». `/connexion` ne change pas.

## La page

Pas de barre latérale. Une barre du haut propre à la landing : la marque, quatre ancres (Les
festivals, Ce que ça t'apporte, Le Pro, Organisateurs), « Se connecter », « Créer ma vitrine ».

`features/landing/`, un composant par section de la maquette :

| Composant        | Section                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| `LandingTopBar`  | barre du haut                                                           |
| `Hero`           | accroche, recherche (Rechercher · Où · Quand), « Sans compte : l'annuaire est ouvert à tous » |
| `TypeMarquee`    | défilé des catégories                                                   |
| `NextFestivals`  | « Les prochains festivals »                                             |
| `WhyFellowship`  | « Pourquoi Fellowship », signé Uriel                                    |
| `Features`       | les six fonctions                                                       |
| `Community`      | « Tu n'y vas jamais seul »                                              |
| `ProTeaser`      | « Et quand tu veux voir loin. »                                         |
| `Organizers`     | bandeau Organisateurs                                                   |
| `Festivalgoers`  | bande Festivaliers                                                      |
| `FinalCall`      | « Ton prochain stand commence ici. » et pied de page                    |

Réutilisés : `PosterArt` (affiches et repli sans affiche), `lib/tags` (couleurs et icônes des
catégories), `lib/pricing` (prix), tokens et polices du design system. Thème clair et sombre
comme le reste de l'app.

- **Images de fond** (accroche, Organisateurs) : les affiches floutées provisoires de la
  maquette. Les photos de marché viendront plus tard (Uriel, 14/10/2026 : pas maintenant).
- **Défilé** : continu, fondu sur les bords, pause au survol, figé sous
  `prefers-reduced-motion`.
- **Mobile** : la maquette ne dessine que l'ordinateur. On empile sans inventer — deux colonnes
  l'une sous l'autre, une carte de fonction par ligne, les ancres de la barre masquées.

## Les données

Tout est lisible sans compte (vérifié en prod le 14/10/2026 avec la clé publique : `events`,
`tags`, `participations`).

- **Catégories** : table `tags` via `lib/tags`, dans l'ordre de l'administration.
- **Prochains festivals** : les cinq prochaines dates publiques (`is_private = false`, fin ≥
  aujourd'hui), triées par date de début, celles qui ont une affiche d'abord. Carte : nom, plage
  de dates, ville (département).
  - « Nouveau » : la règle de l'Explorer (`isRecent`).
  - « Populaire » : la date qui a le plus d'inscrits parmi les cinq, s'il y en a au moins trois.
  - Sans affiche : le repli de `PosterArt`.
- **Lecture ratée** : la section se cache, jamais une rangée vide ni un zéro.
- **Prix du Pro** : `lib/pricing.ts`, donc les prix que Stripe facture aujourd'hui (11,99 € HT /
  mois · 119,88 € HT / an). Le passage au tarif du vault (9,99 € / 99,90 €) se fera avec le
  changement Stripe, dans ce seul fichier (Uriel, 14/10/2026).
- **Illustrations** des six fonctions, de la communauté, du Pro et des Festivaliers : figées,
  avec les exemples de la maquette. Ce sont des dessins qui expliquent, pas des données.

## Les liens

| Élément                                                  | Mène à                                   |
| -------------------------------------------------------- | ---------------------------------------- |
| Se connecter · Créer ma vitrine (barre et appel final)   | `/connexion` (qui crée aussi les comptes) |
| Ancres de la barre                                       | leur section, en défilant                |
| Recherche · Voir tout l'annuaire · affiches · catégories | `/connexion` (en attendant 11b)          |
| Découvrir le Pro                                         | la page de l'offre Pro                   |
| Nous écrire · Contact                                    | `mailto:appfellowship@pm.me`             |
| CGU · Confidentialité                                    | `/legal/cgu`, `/legal/confidentialite` (V1) |
| Runes de Chêne                                           | `https://runesdechene.com`               |

**Référencement** : pas d'indexation tant que la page vit sous `/v2/` ; elle se règle à la
bascule.

## Tests

- Fonctions pures, vitest : la décision de la garde pour `/` sans session ; la sélection des
  prochains festivals (tri, affiche d'abord, « Nouveau », « Populaire » et son seuil).
- Navigateur, `pnpm dev:v2` sans être connecté : chaque section contre la maquette, clair et
  sombre, ordinateur et téléphone, chaque lien.
- Puis lint, tests, build, déploiement de la V2 (`.claude/rules/deploiement.md`).

## Hors périmètre

L'annuaire public (11b) ; les photos de marché ; le nouveau tarif Stripe ; l'indexation ; une
maquette mobile.
