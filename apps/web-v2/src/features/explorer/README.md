# features/explorer

L'écran Explorer (`/explorer`), maquettes `2027 — Explorer` et `2027 — Explorer · résultats`.

- `ExplorerPage.tsx` — l'écran : titre, recherche, catégories, rangées ou résultats. Tout l'état
  vit dans l'adresse.
- `SearchBar.tsx` — Rechercher · Où (son rayon en menu dessous) · Quand. Le rayon cherche dans un cercle autour de la
  commune (BAN + `events_within`) ; une commune introuvable retombe sur le texte.
- `CategoryChips.tsx` — « Tout » et les catégories dans leurs couleurs.
- `EventRail.tsx` — une rangée de cartes qui glisse à l'horizontale, avec ses flèches.
- `FriendsInviteCard.tsx` — au bout de « Où vont tes amis » vide : « Trouve tes compagnons de route ».
- `ExploreCard.tsx` — une carte : affiche, « Nouveau », étoile « Repérer », amis qui y vont.
- `SearchResults.tsx` — titre, onglets, grille des festivals, cartes d'exposants (Suivre).
- `useExplorer.ts` — le chargement de l'accueil et de la recherche, Repérer et Suivre.

La logique pure vit dans `lib/explorer.ts` (titre, motif de recherche, fenêtre « Quand »).
