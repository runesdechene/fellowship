# Cockpit exposant — design de build V1

- **Date :** 2026-06-02
- **Participants :** Uriel (CEO) · Claude (XO)
- **Statut :** `validé` (design approuvé, prêt pour plan d'implémentation)
- **Décision de référence :** [`docs/decisions/0002-cockpit-exposant.md`](../../decisions/0002-cockpit-exposant.md) (maquette `assets/dashboard-exposant.html`)
- **Maquette DA :** validée — ce document ne re-décide pas le visuel, il cadre le **périmètre de build**.

## Objectif

Construire le Cockpit, **home Pro après login** et justificatif central de l'abonnement.
Aujourd'hui `navModel.dashboard` existe (`/tableau-de-bord`, label « Cockpit », `pro: true`)
mais `built: false`. Cette spec couvre le build de la page V1.

## Décisions de périmètre (cette session)

1. **Module Véhicule différé en V1.1.** Seul module sans donnée existante ; c'est un
   sous-système complet (table `vehicles`, CRUD, upload photo, multi-véhicules équipe,
   intégration open-data carburant `prix-carburants.gouv.fr` + cache quotidien). On ne
   bloque pas la page qui vend le Pro pour ça.
2. **Page complète d'un coup, philosophie reuse-maximal.** La home Pro ne peut pas être
   à moitié remplie. Tous les modules V1 s'adossent à de la donnée **déjà sur `main`** →
   **aucune nouvelle table**, le coût est dans l'assemblage UI + quelques requêtes.
3. **Layout : 3 colonnes conservées** (option A). « Ta saison 2026 » reste seule dans le
   Col 3 (pas de bascule en bandeau pleine largeur).

## Réalités data (vérifiées sur `main`)

- `participation_status` (enum) : `interesse` (Repéré) · `en_cours` (Candidaté) ·
  `inscrit` (Inscrit) · `refuse` (**masqué partout**, ne jamais afficher comme « va à X »).
- `payment_status` (texte, CHECK) : `a_payer` · `acompte_verse` · `paye`
  (`en_cours_paiement` = legacy toléré).
- `event_reports` : table du bilan (CA, note, impressions). Composants existants :
  `components/reports/EventReportForm.tsx`, `components/reports/BilanCard.tsx`.
- Convergences / compagnons : `useCommunityFeed` (`src/hooks/use-community.ts`) calcule
  déjà `convergences` + `suggestions` via les RPC `get_network_follow_activity` /
  `get_follow_suggestions` (migration `20260527150000_communaute_feed.sql`). **Zéro
  dépendance à la branche Communauté non mergée.**
- Routing : `/dashboard` redirige aujourd'hui vers `/explorer` (legacy). Le Cockpit vit
  sur `/tableau-de-bord`.

## Layout

```
┌──────────────────────────────────────────────┐
│  Bonjour Uriel — Rune de Chêne · Pro      [+] │  topbar
├──────────────────────────────────────────────┤
│  🎉 BILAN post-festival (pleine largeur, conditionnel) │
├───────────────┬───────────────┬───────────────┤
│ Prochain      │ À régler &    │ Ta saison     │
│ festival      │ finaliser     │ 2026          │
│ (hero)        │               │ (frise 12 m.) │
│ ───────────   │ ───────────   │               │
│ Tes prochains │ Mes compagnons│               │
│ festivals     │ de route      │               │
└───────────────┴───────────────┴───────────────┘
```

Colonnes flex à hauteurs naturelles (pas de grille qui couple les hauteurs — cf. 0002).
Responsive : 3 → 2 → 1 colonne selon la largeur.

## Modules

### 🎉 Bilan post-festival — bandeau conditionnel
- **Trigger** : une participation `inscrit`/`paye` sur un event `end_date < today` **sans**
  `event_report` associé pour ce couple (acteur actif, event) → prompt
  « Comment s'est passé *[Festival]* ? ».
- **Action** : ouvre `EventReportForm` (réutilisé) → CA, note, impressions. Rentabilité
  **par festival**, jamais agrégée (0002).
- Plusieurs en attente → afficher le plus récent + « +N autres ». Rien à renseigner →
  **bandeau masqué entièrement** (pas de carte vide).

### 🎪 Prochain festival — Col 1, hero
- **Donnée** : prochaine participation **confirmée uniquement** (`inscrit`/`paye`),
  `start_date >= today`, la plus proche. Les candidatures `en_cours` ne s'affichent
  **jamais** comme « ton prochain festival » — elles vivent dans « Tes prochains
  festivals » + « À régler & finaliser ».
- **Affichage** : affiche portrait à gauche + infos à droite (J-X, dates, lieu, badge
  statut, compagnons présents via convergences). CTA : **Voir le dossier** (→ EventPage) ·
  **Itinéraire** (→ lien Maps externe, destination = ville) · **💬 Partager** (le chat est
  V1.5 → V1 = Partager le lien festival).
- **Vide** : « Aucun festival à venir → **Explorer** ».

### 🗓 Tes prochains festivals — Col 1
- **Donnée** : participations à venir (mêmes statuts), triées par date.
- **Affichage** : liste verticale — affiche + nom + date + **badge statut** + bouton
  **Ajouter une date**. Pas de festivals « à prospecter » (ils vivent dans Explorer).
- **Réutilisation** : même requête participations/events que la page Mes dates.
- **Vide** : « Ajoute ta première date ».

### 💳 À régler & finaliser — Col 2
- **Donnée** : items actionnables =
  - `inscrit` avec `payment_status` ∈ {`a_payer`, `acompte_verse`} → **à payer** ;
  - `en_cours` → **candidature / inscription à boucler**.
- **Affichage** : liste compacte, chaque ligne → lien vers le festival pour agir.
- **Vide** : « Tout est à jour ✓ ».

### 🧭 Mes compagnons de route — Col 2
- **Donnée** : `useCommunityFeed` (réutilisé) → `convergences` + avatars des compagnons
  qui exposent bientôt.
- **Affichage** : bandeau convergence « 🎪 Vous serez **N** réunis à *X* → **Partager** »,
  puis bulles → flèche → affiche (qui va où). Compagnons = followers uniquement (modèle de
  visibilité).
- **Cold-start** (réseau vide) : « Suis des compagnons pour voir où ils exposent →
  **Suggestions** » — jamais de carte morte.

### 📅 Ta saison 2026 — Col 3
- **Donnée** : agrégat du nb de participations confirmées **par mois** sur l'année courante.
- **Affichage** : frise 12 mois — **vert** si rempli, **pointillé ambre** si vide. Met en
  évidence les trous (« Sept & Nov vides → trouve des dates »).
- **Vide** : tout en pointillé + « Ta saison est à construire ».

## Câblage & routing

- Construire la page sur **`/tableau-de-bord`**, passer `navModel.dashboard.built = true`.
- **Redirection post-login** : entité **Pro → `/tableau-de-bord`** ; acteur gratuit →
  `/mes-dates` (home gratuite existante). `ProGate` reste sur la route (un gratuit qui y
  navigue voit le teaser d'upsell — comportement actuel conservé).
- Vérifier l'interaction avec le route-guard `AppLayout` (cf. mémoire
  `reference_applayout_route_guard` : il vire les routes hors nav + `SHARED_PREFIXES`).
  `/tableau-de-bord` est déjà une route de nav → OK, mais à re-vérifier au build.

## Architecture (composition)

- `src/pages/Cockpit.tsx` (route `/tableau-de-bord`) — page conteneur : topbar + layout
  3 colonnes, monte les modules.
- Un composant par module sous `src/components/cockpit/` : `BilanBanner`, `ProchainFestival`,
  `ProchainsFestivals`, `AReglerFinaliser`, `CompagnonsDeRoute`, `SaisonFrise`.
- **Données** : un hook `useCockpit(actorId)` qui charge en une passe les participations à
  venir + events liés (réutilise la logique Mes dates/calendrier), expose les dérivés
  (prochain festival, prochains festivals, à régler, agrégat saison, trigger bilan). Les
  compagnons passent par `useCommunityFeed` existant.
- Chaque module est isolé, testable, et lit ses props — pas de fetch dispersé dans les
  feuilles.

## Tests (TDD — pattern fonctions pures du projet)

Contrainte connue (`reference_react_test_infra`) : RTL `render()` ne flush pas en synchrone
sur ce stack → on teste la **logique pure**, pas le rendu. Fonctions pures à extraire et
tester :
- `selectNextFestival(participations, today)` → la bonne participation à venir (confirmée only).
- `filterAReglerFinaliser(participations)` → items à payer + candidatures à boucler.
- `aggregateSeason(participations, year)` → compte/mois + détection des mois vides.
- `detectBilanPrompt(participations, reports, today)` → festivals terminés non bilanés.

## Explicitement différé (V1.1)

Module Véhicule · coût/km du trajet · intégration open-data carburant · multi-véhicules
(équipe) · distance en km sur le hero (V1 = lieu + lien Maps).

## Hors-périmètre repéré (à traiter ailleurs)

⚠️ `get_friends_with_dates` (migration `20260509120000`) lit encore
`follows.follower_id/following_id`, **droppés au Plan 4 ph.3**. RPC cassée si encore
appelée. À vérifier/nettoyer hors de ce chantier.
