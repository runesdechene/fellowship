# features/vitrine

La vitrine d'un artisan (`/:slug`), dans le langage « 2027 ». Maquette : cadre
`2027 — Vitrine d’un artisan`.

- `VitrinePage.tsx` — l'écran : en-tête, prochaines escales, tampons, pied de page.
- `VitrineHead.tsx` — bannière, logo, identité, réseau, Suivre / Partager (ou Modifier pour le propriétaire).
- `EscaleCard.tsx` — une prochaine escale, avec les amis du visiteur qui y vont.
- `Stamps.tsx` — la route passée en tampons.
- `useVitrine.ts` — le chargement, et Suivre / Ne plus suivre.

La logique pure (libellés, découpage de la route) vit dans `lib/vitrine.ts`.
