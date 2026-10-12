# features/event-history — l'histoire d'une fiche

Lot 10c (méthode des lieux de Runes de Chêne) : chaque modification d'une fiche garde une version.

- `HistoryPage.tsx` — `/evenement/:id/historique` (maquette 2253:2) : une ligne par version.
- `VersionPage.tsx` — `/evenement/:id/historique/:version` (maquette 2253:299) : ce qu'une version a
  ajouté et retiré ; « Revenir à cette version » pour un admin.
- `useEventHistory.ts` — les versions d'une fiche ; aussi lu par la ligne « Tenu à jour » de la fiche.
