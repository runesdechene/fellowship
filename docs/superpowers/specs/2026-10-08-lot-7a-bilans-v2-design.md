# Lot 7a — Mes bilans et Bilan d'une date (V2)

> 08/10/2026. Première partie du lot 7 du plan directeur
> (`docs/superpowers/plans/2026-10-07-v2-2027-plan-directeur.md`). Le lot 7 est découpé en trois,
> dans cet ordre, validé par Uriel : **7a** bilans, **7b** le statut Pro dans la V2 (états
> verrouillés, horizon de 6 mois), **7c** offre Pro et paiement. L'intégration sans la marque sort
> du lot 7 : elle suivra l'intégration du calendrier (lot 6).

## Pourquoi

Les bilans sont l'outil préféré des clients (retour du 08/10/2026 : « j'ai extrêmement hâte de
comparer les événements d'une année sur l'autre et de revoir mes photos »). C'est aussi ce qui
retient un abonné : une saison de bilans ne se laisse pas tomber. La V2 n'en montre aujourd'hui
qu'un résumé sur le tableau de bord, dont « Tout voir » déplie sur place en attendant cet écran.

## Les maquettes — elles font foi

| Écran | Ordinateur | Mobile |
|---|---|---|
| Mes bilans | `2027 — Mes bilans` | `2027 mobile — Mes bilans` (validé le 08/10/2026) |
| Bilan d'une date | `2027 — Bilan d’une date` | `2027 mobile — Bilan d’une date` (validé le 08/10/2026) |

Sur mobile, le résumé du bilan (bénéfice, objectif, chiffres) passe **en tête**, sous le titre ;
le retour est le bouton rond de la barre du haut.

## Ce que le lot livre

### Deux adresses

- `/bilans?annee=2026` — Mes bilans. Sans `annee`, l'année en cours.
- `/bilans/:eventId` — le bilan d'une date, pour l'acteur actif.

Le tableau de bord pointe vers elles : « Tout voir » mène à `/bilans` (le dépliage sur place
disparaît, code mort supprimé dans le même commit) ; un bilan du tableau de bord mène à
`/bilans/:eventId`.

### Mes bilans

- **Quelles dates** : les participations de l'acteur actif au statut **inscrit**
  (`CONFIRMED_STATUSES`, déjà défini pour le tableau de bord) dont la date de fin est passée,
  de l'année choisie, **triées par date décroissante**. Les années proposées : celles où
  l'acteur a au moins une telle date, la plus récente d'abord.
- **La carte de l'année** : bénéfice (somme des bénéfices des bilans remplis), « sur N dates »,
  chiffre d'affaires et sa variation sur l'année précédente (absente s'il n'y a rien l'année
  d'avant), frais, meilleure date (le plus grand bénéfice, avec sa durée).
- **Bénéfice par mois** : douze barres, de janvier à décembre, le mois du meilleur bénéfice dans
  le dégradé du logo. Un mois rattache un bilan par la date de début de l'événement.
- **Les dates** : affiche, nom, date et ville, puis chiffre d'affaires, frais et bénéfice
  (ordinateur) ou le bénéfice seul (mobile). Une date sans bilan affiche « Remplir le bilan ».
  Cinq dates, puis « Voir les N autres dates » déplie la suite.

### Bilan d'une date

- **En-tête** : « Bilan », nom de l'événement, dates · ville · durée, « Visible par toi seul ».
- **Recettes et dépenses** : les lignes de `event_ledger_entries`, groupées en recettes et
  dépenses avec leur total. Chaque ligne a son icône de catégorie. On ajoute une ligne
  (catégorie, montant, « Ajouter »), on modifie un montant sur place, on supprime une ligne.
  **Chaque changement s'enregistre aussitôt.** La ligne d'emplacement (ou de cachet) issue de
  Mon dossier porte « depuis la fiche » et passe, comme sur la fiche, par `set_stand_amount` :
  une seule source pour ce montant.
- **Ce qui a marché** et **À améliorer la prochaine fois** : des étiquettes (`wins`,
  `improvements`), une croix pour retirer, « Ajouter » pour en écrire une.
- **Note libre** : enregistrée en quittant le champ.
- **Photos souvenir** : bucket privé `bilan-media`, chemin `{actorId}/{eventId}/{uuid}.ext`,
  image compressée avant l'envoi, affichée par URL signée. On en ajoute, on en retire.
- **Le résumé** : bénéfice, objectif de CA (`participation_dossiers.revenue_goal`) comparé au
  chiffre d'affaires réalisé (jauge `goalShare`, absente sans objectif), chiffre d'affaires, frais,
  bénéfice par jour, « Enregistré automatiquement ».
- **« Et pour les autres exposants ? »** : mène à l'écriture d'un avis (`/evenement/:id/avis`,
  déjà en place).
- **Supprimer ce bilan** : en deux temps, sur place (« Supprimer ce bilan » puis « Confirmer la
  suppression ») — jamais une boîte de dialogue du navigateur. Supprime la ligne
  `event_reports` ; les lignes de montant suivent par la cascade ; les photos sont retirées du
  bucket.

### Quand un bilan existe

La ligne `event_reports` (unique par acteur et événement) est créée à la **première saisie** :
une ligne de montant, une étiquette, une note ou une photo. Ouvrir un bilan ne crée rien. Les
montants viennent **uniquement** de `event_ledger_entries` ; les colonnes `revenue`,
`booth_cost`, `charges` d'`event_reports` sont mortes (`docs/db/gotchas.md`).

## Comment c'est construit

- **Aucune migration.** Tables, contraintes, politiques et bucket existent ; tout est privé à
  l'acteur par `can_act_as`.
- **`lib/` — logique pure, testée** :
  - `lib/reports.ts` : à partir des dates et des lignes, rend la carte de l'année, les douze
    mois, la meilleure date et la variation sur l'année précédente. Sommes et bénéfices
    passent par `money.ts` (`ledgerRevenue`, `ledgerProfit`), les dates par `dates.ts`.
  - `lib/report-media.ts` : chemin d'une photo, envoi compressé, URL signées.
- **`features/reports/`** : `ReportsPage` et son hook `useReports` (chargement de l'année) ;
  `ReportPage` et son hook `useReport` (chargement d'un bilan, écritures) ; un composant par
  bloc de la maquette (résumé, registre, étiquettes, note, photos). Le patron de chargement est
  celui de `.claude/rules/v2.md` : une fonction `async` qui rend l'état, appliquée une fois.
- **Styles** : `3-components/`, jetons uniquement. Les icônes de catégorie sont celles de la
  maquette.
- **Erreurs** : une lecture qui échoue s'affiche comme une erreur, jamais comme « aucun bilan ».
  Une écriture qui échoue remet la valeur d'avant et le dit sur place.
- **Animations** : ajout et retrait d'une ligne, d'une étiquette, d'une photo, dépliage des dates
  et confirmation de suppression glissent (jetons `--duration-*`, `--ease-*`,
  `prefers-reduced-motion` respecté).

## Vérification

- Tests de `lib/reports.ts` : année vide, bilans non remplis, variation sans année précédente,
  meilleure date à égalité (la plus récente), un bilan à cheval sur deux mois (rattaché au mois
  de début).
- `pnpm --filter web-v2 lint`, tests, build.
- Chaque écran comparé à son cadre Figma, ordinateur et mobile, écart par écart.
- Parcours dans le navigateur sur `flw.sh/v2/` après déploiement, **en lecture seule** : aucune
  écriture en base pour tester (règle de `.claude/rules/v2.md`). Les écritures sont relues par
  Uriel sur son propre compte.

## Hors de ce lot

- Le verrou Pro des bilans (aperçu flouté, invitation) : **7b**.
- Le bilan de l'an passé affiché sur la nouvelle édition d'un festival : lot 8, avec le lien
  entre éditions.
- Les nouveaux prix Stripe : après la V2.
