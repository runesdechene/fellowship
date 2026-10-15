# features/public-search — la recherche publique

`/festivals`, sans compte (lot 11b, spec `docs/superpowers/specs/2026-10-15-v2-annuaire-public-11b-design.md`,
maquette `2314:2`). Un compte connecté est renvoyé sur l'Explorer.

- `PublicSearchPage.tsx` — la page : recherche, titre, grille, « Voir les N festivals », la bande
  « N festivals de plus t'attendent après {mois} », le pied de page.
- `PublicEventCard.tsx` — une carte : affiche, nom, plage, ville ; elle ouvre la fiche.
- `usePublicSearch.ts` — le chargement, par `lib/event-search.ts`, sur 3 mois.
