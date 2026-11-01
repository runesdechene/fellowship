# features/search — la recherche plein écran

La loupe de la barre du haut (`components/layout/TopbarSearch.tsx`) ouvre `?recherche` ; la
recherche prend alors toute la page (maquette Figma `2606:379`). Entrée mène à tout voir dans
Explorer, qui reste la recherche complète.

- `SearchOverlay.tsx` — le `<dialog>` plein écran : le grand champ, l'ouverture liée à l'adresse.
- `SearchResults.tsx` — « Récemment » et « Par catégorie » avant de taper, les résultats ensuite.
- `useQuickSearch.ts` — les résultats en direct, avec les requêtes d'Explorer bornées.
