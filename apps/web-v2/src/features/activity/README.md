# features/activity

Le fil « Activité de la plateforme », en bas de la barre latérale (maquette `2027 — Tableau de bord`).

- `NetworkActivity.tsx` — le bloc : point « en direct », quatre nouvelles, leur âge.
- `useNetworkActivity.ts` — le chargement : les quatre premières nouvelles de toute la plateforme
  (`community_feed`, portée `plateforme`), sans les avis.

Les phrases vivent dans `lib/community.ts`, l'âge (« 12 min », « hier ») dans `lib/dates.ts`. « Tout
voir » ouvre `/communaute?voir=plateforme`.
