# features/activity

Le fil « Activité du réseau », en bas de la barre latérale (maquette `2027 — Tableau de bord`).

- `NetworkActivity.tsx` — le bloc : point « en direct », quatre nouvelles, leur âge.
- `useNetworkActivity.ts` — le chargement : arrivées, dates prises, abonnements, festivals ajoutés.

La fusion des sources vit dans `lib/activity.ts`, l'âge (« 12 min », « hier ») dans `lib/dates.ts`.
