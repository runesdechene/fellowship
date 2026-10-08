# features/reports — les bilans

« Mes bilans » (`/bilans?annee=`) et le bilan d'une date (`/bilans/:eventId`). La logique vit dans
`lib/reports.ts` ; les hooks chargent, les composants affichent.

- `ReportsPage.tsx` — l'écran Mes bilans : en-tête, choix de l'année, blocs.
- `useReports.ts` — les dates passées inscrites d'une année et leurs lignes de registre.
- `YearCard.tsx` — la carte de l'année : bénéfice, chiffre d'affaires, frais, meilleure date.
- `MonthlyChart.tsx` — le bénéfice par mois.
- `ReportsTable.tsx` — la liste des dates, chacune vers son bilan.
- `ReportPage.tsx` — l'écran du bilan d'une date : en-tête, blocs, résumé.
- `useReport.ts` — l'état du bilan et ses écritures ; relit tout après chaque écriture.
- `loadReport.ts` — la lecture d'un bilan (date, registre, étiquettes, note, photos, objectif).
- `reportActions.ts` — les écritures ; le prix de la place passe par set_stand_amount.
- `Ledger.tsx` — recettes et dépenses, modifiables sur place, et la ligne d'ajout.
- `TagList.tsx` — « Ce qui a marché » et « À améliorer la prochaine fois ».
- `ReportNote.tsx` — la note libre.
- `ReportPhotos.tsx` — les photos souvenir, privées.
- `ReportSummary.tsx` — bénéfice, objectif, chiffres.
- `ClearReport.tsx` — « Supprimer ce bilan », en deux temps.
