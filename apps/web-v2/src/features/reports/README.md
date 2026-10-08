# features/reports — les bilans

« Mes bilans » (`/bilans?annee=`) et le bilan d'une date (`/bilans/:eventId`). La logique vit dans
`lib/reports.ts` ; les hooks chargent, les composants affichent.

- `ReportsPage.tsx` — l'écran Mes bilans : en-tête, choix de l'année, blocs.
- `useReports.ts` — les dates passées inscrites d'une année et leurs lignes de registre.
- `YearCard.tsx` — la carte de l'année : bénéfice, chiffre d'affaires, frais, meilleure date.
- `MonthlyChart.tsx` — le bénéfice par mois.
- `ReportsTable.tsx` — la liste des dates, chacune vers son bilan.
