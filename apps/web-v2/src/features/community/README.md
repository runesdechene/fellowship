# features/community — la page Communauté

Lot 9a, maquette `2027 — Communauté (10/10/2026)` (`2212:2`). La base rend des lignes prêtes à
afficher (`community_feed`, `crossing_dates`, `accounts_to_follow`), l'identité protégée déjà
appliquée ; `lib/community.ts` les lit et les dit.

- `CommunityPage.tsx` — l'écran : filtres dans l'adresse (`?voir=`), « Ça se rassemble », le fil
  groupé par jour, la colonne de droite.
- `useCommunity.ts` — les lectures, Suivre et Repérer.
- `FeedItem.tsx` — une ligne du fil (phrase, festival ou avis, âge, Suivre).
- `Gathering.tsx` — « Ça se rassemble ».
- `CrossingCard.tsx` — « Où vous vous croiserez ».
- `ToFollowCard.tsx` — « À suivre ».
