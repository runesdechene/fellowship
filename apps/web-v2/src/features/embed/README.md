# features/embed — le calendrier intégré

`/:slug/embed` : les prochaines dates d'une enseigne, affichées dans une iframe sur le site d'un
artiste, avec le chargeur `public/embed.js`. Repris de la V1 à la bascule (lot 12) : mêmes
adresses, mêmes réglages, mêmes messages avec la page hôte.

- `EmbedPage.tsx` — l'écran : en-tête, cartes des dates, « Voir les autres », pied Fellowship.
- `useEmbed.ts` — l'enseigne et ses dates ; `useHostFrame.ts` — le dialogue avec la page hôte
  (hauteur, thème).
