# features/calendar

L'écran Calendrier (`/calendrier`) : la frise horizontale des douze prochains mois.

- `CalendarPage.tsx` — l'en-tête, les filtres (Mes amis, Intéressé), la navigation des mois, la frise.
- `MonthColumn.tsx` — une colonne de mois : ses cartes, « Mois libre », les compagnons.
- `PosterCard.tsx` — une carte-affiche (ou la grande date en serif quand il n'y a pas d'affiche).
- `useCalendar.ts` — charge les dates, les amis présents et les compagnons (`loadCalendar`).

La logique pure (rangement par mois, plages de dates, phrase d'en-tête) vit dans `lib/calendar.ts`.
Spec : `docs/superpowers/specs/2026-10-07-calendrier-v2-design.md`. Maquette : cadre `2027 — Calendrier`.
