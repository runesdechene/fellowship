# features/reporting

La zone Reporting : l'e-reporting B2C d'une enseigne, envoyé à SuperPDP (obligatoire au
01/09/2027). Zone à part, comme l'administration : on y entre par le sélecteur d'identité, si
l'enseigne active a une ligne dans `reporting_entreprises`. Facturée 4 € HT par mois.
Maquettes Figma, page « Reporting » : Décades (2795:233), Réglages (2803:233).

- `ReportingRoute.tsx` — la garde : l'enseigne active doit avoir le reporting.
- `useReportingAccess.ts` — les enseignes de la personne qui ont le reporting.
- `DecadesPage.tsx` — `/reporting` : le titre, À traiter, les décades du mois, les journées, les sources.
- `useReporting.ts` — charge la page Décades ; valide une journée à vérifier.
- `ReportingTodo.tsx` — les journées bloquées et celles qui attendent une source.
- `DecadeCard.tsx` — une décade en carte. `DaysTable.tsx` — ses journées.
- `DaySales.tsx` — les ventes d'un jour déplié, et « Facturée à un pro ».
- `ReportingSources.tsx` — le dernier relevé de chaque source, et SuperPDP.
- `DayMark.tsx` — la forme d'un jour (coche, point d'exclamation, demi-cercle, tiret, cercle).
- `ReportingSettingsPage.tsx` — `/reporting/reglages`. `useReportingSettings.ts` — lit et écrit.

Le calcul (décades, échéances, état d'un jour, montants) vit dans `lib/reporting.ts`, testé seul.
Le serveur : `reporting-lecture` lit les sources et écrit les journées, `reporting-vente-pro` marque
une vente facturée à un pro. L'envoi quotidien n'existe pas encore : la conception est dans
`E-Repporting Imperial/conception.md`.
