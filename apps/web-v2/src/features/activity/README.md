# features/activity

Le fil « Activité de la plateforme », en bas de la barre latérale (maquette `2027 — Tableau de bord`).

- `NetworkActivity.tsx` — le bloc : point « en direct », quatre nouvelles, leur âge.
- `useNetworkActivity.ts` — le chargement : les quatre premières nouvelles de toute la plateforme
  (`community_feed`, portée `plateforme`), sans les avis, avec les visites des amis (« a ouvert
  Fellowship », abonnements mutuels seulement). Une ligne au plus par personne : sa plus récente, une visite ne passant qu'à défaut d'un geste.

Les phrases vivent dans `lib/community.ts`, l'âge (« 12 min », « hier ») dans `lib/dates.ts`. « Tout
voir » ouvre `/communaute?fil=plateforme`.
