# V2 — Lot 11b : l'annuaire public (recherche et fiche sans compte)

> Validé en conversation avec Uriel le 15/10/2026. Maquette : `2027 — Recherche publique (validée le
> 14/10/2026)` (`2314:2`). Suite des specs `2026-10-14-v2-landing-design.md` et
> `2026-10-14-v2-landing-11c-design.md`.

## Pourquoi

Sur la landing, la recherche mène à la connexion : elle promet ce qu'elle ne tient pas. Uriel veut
une vraie recherche sans compte. Règles déjà tranchées (vault, 14/10/2026) : sans compte, on fouille
**3 mois** ; un compte gratuit en ouvre 6, le Pro toute l'année ; les fiches restent ouvertes par
lien direct.

## Ce que voit un visiteur sans compte

### Les adresses

- **`/festivals?q=…&ou=…&quand=…[&tout]`** — la page de résultats publique. Mêmes paramètres que
  `/explorer`. Un compte connecté qui y arrive est renvoyé sur `/explorer` avec la même recherche.
- **`/evenement/:id`** — la même adresse pour tous : un visiteur voit la fiche visiteur, un compte
  admis la fiche complète (garde inchangée : un connecté non admis repart vers la V1).
- **La recherche de la landing** (`Opening.tsx`) mène à `/festivals` ; « Où » et « Quand » deviennent
  de vrais champs (le `SearchBar` de l'Explorer, horizon de 3 mois).

### Le cadre visiteur — `GuestShell`

La barre du haut de la landing (`LandingTopBar` : logo, « Se connecter », « Créer ma vitrine »),
puis la page. Pour la fiche, le mur d'affiche à droite (`PosterWall`, `PageChromeProvider`) est
gardé. Ni barre latérale, ni cloche, ni compte. Monté par la prop `guest` de `ProtectedRoute`, le
mécanisme qui sert déjà la landing sur `/`.

### La page de résultats (maquette `2314:2`)

- La recherche, puis « **N festivals dans les 3 prochains mois.** » (le titre suit la recherche,
  `resultsTitle`) et « Ajoutés et tenus à jour par les exposants eux-mêmes, dans toute la France. »
- Une grille de 6 cartes : affiche, nom, dates, ville. Pas d'étoile « Repérer », pas d'amis.
  « **Voir les N festivals** » ajoute `&tout` à l'adresse et montre la suite.
- La bande nuit : « **N festivals de plus t'attendent après {mois}.** Crée ton compte gratuit pour
  voir davantage dans le futur, ajouter tes dates et suivre tes collègues exposants. »,
  « Créer mon compte gratuit » (`/connexion`), « Découvrir le Pro » (`/pro`). Masquée si N = 0.
- Puis le pied de page de la landing seul, dans la même bande nuit : la maquette n'a pas le grand
  appel « Ton prochain stand commence ici. » ni l'encadré des organisateurs. Le pied est sorti de
  `FinalCall` en composant partagé.
- Seules les fiches publiques (`is_private = false`), comme l'Explorer.

### La fiche visiteur

- **Visible** : affiche, titre, catégories, dates et lieu, « À propos », informations, « Pour
  candidater » (sans le rappel de clôture), carte et « Depuis ma position ».
- **Masqué** : le statut, « Qui y va », « Tenue à jour » (historique), « Mon bilan », « Mon
  dossier », le bilan de la dernière édition, les boutons de modification, les blocs Avis et
  Discussions réels.
- **L'aperçu flouté** — sous les informations, s'il y a au moins un avis ou une question :
  « **4 avis · 7 questions** » (une seule moitié si l'autre vaut zéro), quelques lignes factices
  floutées, puis « **Crée ton compte gratuit pour les lire** » vers `/connexion`. Les lignes sont des
  barres décoratives : **aucun contenu réel n'est envoyé** au navigateur. Sans maquette : montré à
  Uriel dans le navigateur avant d'être déclaré fini.
- **Fiche privée** : « introuvable » pour un visiteur (filtre `is_private = false` côté app). La
  policy `anon_read_events` laisse lire les fiches privées en base : ticket déjà ouvert
  (`docs/v2/purge-back.md:17`), hors de ce lot.
- Le retour mène à la landing.

## Le code

### Logique pure — `lib/explorer.ts`

L'horizon est figé à 6 mois par un booléen `pro`. Il devient un **nombre de mois** : 3 pour un
visiteur, 6 en gratuit, illimité en Pro. `quandChoices`, `searchWindow`, `windowMonths` et
`beyondWindow` prennent cet horizon ; le mois du compteur (« après {mois} ») en découle au lieu
d'être figé (`ProEndCard` : `monthsAhead(new Date(), 5)`). L'Explorer connecté garde exactement son
comportement. Tests dans `lib/explorer.test.ts`.

### Lectures sans compte

- Recherche : la requête de `useExplorer` (`eventsInWindow`, filtres `q` / `ou`, `countBeyond`)
  sortie en fonctions sans acteur, réutilisées par l'Explorer et par la page publique. Aucune
  lecture d'amis, de statut, d'enseignes ni de `follows` côté visiteur.
- Fiche : `loadEvent` sans acteur rend déjà la fiche seule ; on y ajoute le filtre `is_private`
  quand il n'y a pas de session. Les sections masquées ne lancent aucune requête (dont la RPC
  `histoire_evenement`, fermée à `anon`, et `event_threads`).

### Base — une migration

Une fonction `compter_avis_et_questions(p_event uuid)` → `(avis int, questions int)`, `SECURITY
DEFINER`, `search_path` figé, `GRANT EXECUTE` à `anon` et `authenticated`. Elle ne rend que deux
nombres, pour une fiche **publique** (une fiche privée rend 0, 0) : les avis de `reviews`, les
questions de `event_threads` (les fils, pas les réponses). Jamais un contenu ni un auteur. Écrite à
partir des définitions **live** de `reviews` et `event_threads` (`information_schema`), en suivant
`docs/db/`. En tête : le pourquoi.

### Fichiers

- `features/public-search/` (nouveau dossier, README) : la page de résultats, sa grille, sa bande.
- `components/layout/GuestShell.tsx` : le cadre visiteur.
- `features/event/` : la fiche lit `user` et masque ses sections ; `GuestTeaser.tsx` pour l'aperçu
  flouté et son hook.
- `App.tsx` : la route `/festivals`, la prop `guest` sur `/evenement/:id`.
- `features/landing/Opening.tsx` : la recherche mène à `/festivals`.
- Les styles dans `styles/3-components/`, aucune valeur en dur.

## Vérifier

- Tests purs : l'horizon de 3 / 6 mois / illimité, la fenêtre de recherche, le mois du compteur.
- La fonction en base : appelée avec la clé publique sur une fiche publique avec avis, une fiche
  privée (0, 0) ; lecture seule, aucune écriture pour tester.
- Le parcours dans un navigateur **sans compte** : landing → recherche → résultats → « Voir les N »
  → fiche → aperçu flouté → retour. Puis le même parcours connecté en admin : rien n'a changé dans
  l'Explorer ni dans la fiche.
- Écran comparé à la maquette `2314:2` ; l'aperçu flouté, sans maquette, validé par Uriel.
- `pnpm --filter web-v2 lint`, puis le build. Déploiement : décision d'Uriel (`pnpm deploy:v2`).

## Hors de ce lot

La fermeture en base des fiches privées à `anon` ; l'indexation (SEO) des fiches ; la page de
résultats sur téléphone au-delà de ce que la grille donne d'elle-même, si la maquette ne la montre
pas ; les vitrines d'exposants dans les résultats publics.
