# features/activity

Le fil « Activité du réseau », en bas de la barre latérale (maquette `2027 — Tableau de bord`).

- `NetworkActivity.tsx` — le bloc : point « en direct », quatre nouvelles, leur âge.
- `useNetworkActivity.ts` — le chargement : les quatre premières nouvelles du fil de la communauté
  (`community_feed`), sans les avis.

Les phrases vivent dans `lib/community.ts`, l'âge (« 12 min », « hier ») dans `lib/dates.ts`. « Tout
voir » mène à `/communaute`.
