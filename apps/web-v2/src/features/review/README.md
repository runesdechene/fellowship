# features/review

L'écran « Écrire un avis » (`/evenement/:id/avis`), maquette `2027 — Écrire un avis`.

- `WriteReviewPage.tsx` — trois notes en étoiles, un retour facultatif, qui voit ton nom, et
  l'aperçu de ce que les autres exposants liront.
- `useMyReview.ts` — l'avis de l'acteur actif : le lire pour le reprendre, l'enregistrer.

Les avis se lisent sur la fiche (`features/event/EventReviews.tsx`) ; la note et la signature
protégée vivent dans `lib/reviews.ts`.
