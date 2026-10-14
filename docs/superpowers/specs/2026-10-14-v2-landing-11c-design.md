# V2 — Lot 11c : la landing refaite sur la maquette validée, vivante

> Validé avec Uriel le 14/10/2026. Maquette qui fait foi : Figma `2027 — Landing (validée le
> 14/10/2026)` (`2290:2`). Règle de style : `.claude/rules/v2.md`, « La landing a sa propre
> direction artistique ». Remplace la landing du lot 11a (spec `2026-10-14-v2-landing-design.md`).

## Pourquoi

La landing en ligne suit l'ancienne maquette. La nouvelle est validée (« magistrale ») et Uriel
exige que **chaque élément soit vivant** : quand une affiche ou un festival change sur Fellowship,
la landing change.

## Le principe : un exposant de démonstration posé sur de vrais contenus (option B)

- **Tout ce qui vit sur Fellowship vient de la base, en direct** : affiches, festivals, dates,
  villes, nombre d'inscrits, nombre d'exposants, festivals ajoutés récemment.
- **Seule la « personne » est une démonstration** : « Atelier Corne & Cuir », ses statuts, ses
  montants, les prénoms de sa discussion et de ses compagnons. Tout cela vit dans **un seul
  fichier**, `lib/landing-demo.ts`, posé sur les vrais festivals.
- **Rien de faux n'entre dans la base.** Aucun compte de démonstration, aucune migration.
- **Ni le compte Runes de Chêne ni aucun vrai exposant n'apparaît par son nom ou son logo** : on
  montre leurs affiches et des chiffres agrégés, jamais leur identité sans accord.

## Les sections, et d'où vient chaque élément

| Section | Vivant (base) | Démonstration (`landing-demo.ts`) |
| --- | --- | --- |
| Ouverture — mur | les affiches des festivals publics à venir, triées par date, défilant en 6 colonnes à sens alternés | — |
| Ouverture — carte sous une affiche | le festival à venir qui a le plus d'inscrits, et ce nombre (« avec N compagnons ») | « Atelier Corne & Cuir y va » |
| Ouverture — preuve | « N exposants y tiennent déjà leur saison » : le nombre d'enseignes exposants | les 5 visages (initiales, tons chauds) |
| Assistant — Calendrier | 4 mois à venir, leurs festivals avec affiche, dates, ville | statut de chaque date (intéressé, dossier envoyé, inscrit) |
| Assistant — Tableau de bord | les mêmes festivals | « Mes dossiers » : statuts, montants versés, soldes ; « Mes bilans » : chiffres |
| Communauté — écran | le festival « Ça se rassemble » (le plus d'inscrits) et son nombre d'inscrits ; les festivals du fil | les prénoms et les enseignes du fil |
| Communauté — « Qui y va » | le festival et son nombre d'inscrits | les 8 noms et leurs statuts |
| Bientôt — un clic | un vrai festival à venir (affiche, dates, ville) | « Ton dossier est prêt » |
| Bientôt — dossier PDF | le nom du festival et l'année | les champs remplis |
| Bientôt — l'agent | les 3 derniers festivals ajoutés sur Fellowship, avec « ajouté il y a N jours » (vrai `created_at`) | les critères (« Médiéval, fantasy »…) |
| Pro — « Pour toi » | 3 festivals à venir | « Bonjour, Atelier Corne & Cuir » |
| Pro — prix | `lib/pricing.ts` | — |

Une donnée manquante (lecture ratée, aucun festival à venir) **cache l'élément** qui en dépend,
jamais un zéro ni une case vide. La maquette disait « Ajouté depuis le site de la mairie » : la base
ne connaît pas la source, on écrit donc la vraie ancienneté.

## Architecture

- **Lecture** : un hook `useLandingShowcase()` lit, sans compte, les festivals publics à venir
  (avec affiche, triés par date puis id), les inscrits par festival, les festivals récemment ajoutés
  et le nombre d'exposants. Tout est déjà lisible sans compte (vérifié le 14/10/2026).
- **Assemblage** : une fonction pure `buildShowcase(lectures, demo, today)` (`lib/landing.ts`)
  rend tout ce que les écrans affichent. **Testée** (vitest) : choix du festival le plus suivi,
  répartition par mois, ancienneté, données manquantes.
- **Les écrans de l'app** sont des **reproductions présentationnelles** dans
  `features/landing/screens/` (fenêtre, barre, calendrier, dossiers, communauté, qui y va, pour
  toi), qui réutilisent `components/ui` (`PosterArt`, `Avatar`…) mais n'importent aucune page de
  l'app (règle : un écran n'importe pas un autre écran). Ils sont affichés réduits, comme dans la
  maquette.
- **Les bandes penchées** : `clip-path` CSS. Les fonds flous : affiches réduites sans `filter`
  (règle du coût du flou, `interface.md`).
- **Palette fixe** : la landing ne suit pas le thème sombre. Ses couleurs sont des tokens propres
  (couche 2), jamais en dur.

## Mouvement

Seul le **mur d'affiches défile** (colonnes à sens alternés, lent, comme la connexion), figé sous
`prefers-reduced-motion`. Pas d'apparition au défilement ailleurs : la maquette ne le montre pas.

## Liens

Inchangés depuis le 11a : recherche, « Créer ma vitrine », « Se connecter » → `/connexion` jusqu'au
lot 11b ; « Découvrir le Pro » → `/pro` ; pied de page → pages légales de la V1, contact par e-mail.

## Téléphone

Pas de maquette : on empile. Texte de l'ouverture, puis le mur réduit (3 colonnes) ; chaque bande
garde sa pente, adoucie ; écrans pleine largeur sous leur texte.

## Code retiré

Les sections du 11a absentes de la maquette partent dans le même commit : prochains festivals,
défilé des catégories, Pourquoi Fellowship, six fonctions, organisateurs, festivaliers ;
`pickNextFestivals` et ses tests ; l'ancien `useLanding` ; les images d'exemple de
`public/landing/` devenues inutiles.

## Tests

- vitest : `buildShowcase` (cas ci-dessus).
- Navigateur, `pnpm dev:v2` sans session : chaque section contre la maquette `2290:2`, ordinateur
  et téléphone, animation réduite ; changer une donnée (une affiche en local) et la voir changer.
- Lint, tests, build, déploiement de la V2.

## Hors périmètre

L'annuaire public et la page de résultats (lot 11b, maquette `2314:2`, spec à part) ; les vraies
photos de festival ; l'abonnement des visiteurs par e-mail ; l'agent et le remplissage eux-mêmes.
