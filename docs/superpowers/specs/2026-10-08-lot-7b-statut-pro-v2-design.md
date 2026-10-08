# Lot 7b — Le statut Pro dans la V2

> 08/10/2026. Deuxième partie du lot 7 du plan directeur
> (`docs/superpowers/plans/2026-10-07-v2-2027-plan-directeur.md`), après 7a (bilans, livré) et
> avant 7c (offre Pro et paiement). Design validé par Uriel le 08/10/2026.

## Pourquoi

La V2 se construit « comme si le Pro existait » (Dev.md, 07/10/2026), mais elle ne lit pas encore
le statut de l'enseigne : tout y est ouvert. Ce lot pose le statut, et les écrans gratuits qui
donnent envie du Pro sans rien cacher de l'annuaire.

## Ce qui est déjà tranché (vault, `Dev.md`)

- **Pro = badge Certifié, bilans, dates au-delà de 6 mois, notes détaillées des festivals.**
- **Tout le monde voit tous les événements.** En gratuit, on repère et on s'inscrit jusqu'à
  6 mois : un seul horizon, posé **sur le geste**, jamais sur ce qu'on voit.
- Le tableau de bord, les amis et la communauté restent gratuits.
- En gratuit : la note globale et la lecture des avis ; le détail (affluence, organisation,
  rentabilité) est Pro.

## Décisions de ce lot (Uriel, 08/10/2026)

1. **La limite des 6 mois vit dans la V2 seulement**, pas en base : la V1 est en production et
   laisse tout le monde poser des dates. Un gratuit pourrait la contourner par la V1 ou l'API ;
   risque accepté.
2. **Bilans en gratuit** : Mes bilans et le bilan d'une date affichent la page floutée de la
   maquette ; le bloc « Mes bilans » du tableau de bord est flouté avec la pastille Pro et mène à
   cette page ; la bande « bilan à remplir » est masquée.
3. **Notes détaillées** : état gratuit dessiné et validé (cadre `Points de contact du Pro`,
   exemple « Fiche — les notes détaillées des festivals »).
4. Le rappel avant la clôture des candidatures reste au **lot 8** (il dépend des notifications).

## Les maquettes — elles font foi

| Ce qui | Cadre Figma |
|---|---|
| Mes bilans en gratuit | `2027 — Mes bilans · compte gratuit` (`2085:2`) |
| Explorer, calendrier, vitrine, notes détaillées | `2027 — Points de contact du Pro` (`2086:2`) |
| Notes détaillées, état payant (référence) | `2027 — Fiche événement`, bloc « Avis des exposants » |

## Ce que le lot livre

### 1. Le statut

`lib/plan.ts`, pur et testé :

- `isPro(entity, now)` : vrai si `plan === 'pro'`, ou si `comped_pro_until` est dans le futur
  (Pro offert par le parrainage, hors Stripe). Un compte personnel (sans enseigne) est gratuit.
- `isCertified(entity, now)` : `isPro(…)` ou `verified === true` (décision 0004).
- `proHorizon(today)` : `monthsAhead(today, 6)`, le premier jour du septième mois. En gratuit, on
  agit sur une date dont le **début** est avant cet horizon.
- `canActOn(startDate, pro, today)` : `pro || startDate < proHorizon(today)`.

`useAuth()` expose déjà les enseignes avec toutes leurs colonnes : un hook `usePlan()` lit
l'enseigne de l'acteur actif et rend `{ pro, certified }`, sans nouvelle requête.

**Pour tester sans compte gratuit** : sous `pnpm dev` seulement (`import.meta.env.DEV`),
`?plan=free` dans l'adresse force l'état gratuit pour la session de l'onglet. Le réglage n'existe
pas dans le build de production.

### 2. L'horizon des 6 mois

Le geste est refusé, l'affichage ne change pas. Une invitation Pro (`ProBubble`, la bulle de la
maquette Explorer) dit « Ce festival est dans 9 mois. En gratuit, tu planifies tes 6 prochains
mois. Le Pro t'ouvre toute ton année. — Découvrir le Pro ».

- **Explorer** : l'étoile d'un festival au-delà de l'horizon ouvre la bulle au lieu de le repérer.
- **Fiche** : choisir un statut (Intéressé, Dossier, Inscrit) pour une date au-delà de l'horizon
  ouvre la bulle.
- **Une participation existante** au-delà de l'horizon (posée dans la V1 ou pendant une période
  Pro) reste modifiable et retirable : on ne bloque personne sur ses propres dates.
- **Calendrier** : en gratuit, six mois, puis la colonne du septième mois avec la carte
  « {Mois} et au-delà » de la maquette (« Pose les dates sur toute l'année et ne rate plus une
  candidature. — Découvrir le Pro »). Les dates déjà posées plus loin restent visibles sur leur
  fiche et dans le tableau de bord.
- **Ajouter une date** : l'événement entre toujours dans l'annuaire, quelle que soit sa date.
  Au-delà de l'horizon, il est créé **sans** participation, et l'écran le dit : « Ajouté à
  l'annuaire. Pour le mettre dans ton calendrier, passe au Pro. »

### 3. Les bilans en gratuit

- `/bilans` : la page de la maquette `2085:2`, contenu flouté et invitation centrée (« Sache ce que
  chaque festival t'a vraiment apporté », la liste des avantages, « Découvrir le Pro »,
  « Pas maintenant » qui ramène au tableau de bord).
- `/bilans/:eventId` : renvoie vers `/bilans`.
- Le flou porte sur les **vraies données** de l'enseigne si elle en a (bilans saisis dans la V1
  pendant une période Pro) ; sinon sur un exemple fixe. Ce sont ses propres chiffres : rien n'est
  exposé à autrui. Le contenu flouté est `aria-hidden` et inerte (`inert`).
- Tableau de bord : le bloc « Mes bilans » est flouté, porte la pastille Pro, et un clic mène à
  `/bilans` ; la bande « bilan à remplir » n'apparaît pas.

### 4. Les notes détaillées

Bloc « Avis des exposants » de la fiche, en gratuit : la note globale et les étoiles restent
lisibles ; les trois barres et leurs valeurs sont floutées, avec la pastille « Voir le détail avec
le Pro → » au centre, qui ouvre `/pro`. Les avis eux-mêmes restent lisibles. Écrire un avis reste
ouvert à tous (décision 0005).

### 5. La vitrine

Pour le **propriétaire** d'une vitrine non certifiée, l'emplacement en pointillés « Obtenir le
badge Certifié » à la place du badge, qui ouvre `/pro`. Les visiteurs ne voient rien.

### 6. `/pro`

Toutes les invitations mènent à `/pro`. En attendant la vraie page (lot 7c), `/pro` affiche une
page simple : « L'offre Pro arrive dans la V2. » et un lien vers l'abonnement de la V1
(`/abonnement`, hors du routeur `/v2`). Aucun bouton ne mène nulle part.

## Comment c'est construit

- **Aucune migration.**
- `lib/plan.ts` + `lib/plan.test.ts` (TDD) ; `lib/usePlan.ts` (le hook).
- `components/ui/ProBadge.tsx` (la pastille « Pro » noire de la maquette), `ProBubble.tsx`
  (l'invitation en bulle), `ProVeil.tsx` (un contenu flouté, inerte, avec son invitation par-dessus).
  Les trois existent déjà ailleurs dans la maquette : ils servent aux lots suivants.
- Les écrans touchés : `features/explorer`, `features/event` (statut, avis), `features/calendar`,
  `features/event-create`, `features/reports`, `features/dashboard`, `features/vitrine`, et une
  page `pages/ProPage.tsx` pour `/pro`.
- Styles : jetons uniquement ; le flou par `filter: blur()` sur un bloc de taille modeste (piège
  du coût du flou sur une grande couche : `.claude/rules/interface.md`).

## Vérification

- Tests de `lib/plan.ts` : Pro payant, Pro offert en cours, Pro offert expiré, compte personnel,
  certifié à la main ; horizon au changement de mois et au passage d'année (décembre → juin) ;
  une date le dernier jour du sixième mois (permise) et le premier du septième (refusée).
- `pnpm --filter web-v2 lint`, tests, build.
- Chaque état gratuit comparé à son cadre Figma, en dev avec `?plan=free`, puis en ligne
  (lecture seule) après déploiement.

## Hors de ce lot

- La page de l'offre et le paiement : **7c**.
- Le rappel de clôture, les recherches sauvegardées, l'annonce de nouvelle édition : **lot 8**.
- L'intégration du calendrier sans la marque : avec l'intégration du lot 6.
- Les nouveaux prix Stripe : après la V2.
