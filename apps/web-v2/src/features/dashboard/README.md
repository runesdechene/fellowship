# features/dashboard — le tableau de bord

L'écran de la maquette, et l'entrée de la V2 (`/`). `useDashboard` charge et prépare tout ;
les composants ne font qu'afficher.

- `Dashboard.tsx` — l'écran : assemble les blocs.
- `useDashboard.ts` — les données : participations, amis, registre des bilans → `DashboardData`.
- `ActionBanner.tsx` — la bande qui réclame le dernier bilan.
- `SeasonChart.tsx` — la frise des mois.
- `NextDateCard.tsx` — la prochaine date.
- `UpcomingCard.tsx` — les dates suivantes.
- `SettlementsSection.tsx` — « À régler ».
- `ReportsSection.tsx` — « Mes bilans ».
- `SuggestionsSection.tsx` — « Pour toi » : les festivals proches de ceux qu'il fait (Pro), le nombre trouvé (gratuit).
- `useSuggestions.ts` — les suggestions de l'acteur actif, et « Pas pour moi ».
