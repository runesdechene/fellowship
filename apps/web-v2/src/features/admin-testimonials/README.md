# features/admin-testimonials — les témoignages

`/admin/temoignages` (lot 4, spec `docs/superpowers/specs/2026-10-19-v2-admin-lot-4-design.md`).
La landing lit les actifs : `features/landing/useTestimonials.ts`.

- `TestimonialsPage.tsx` — l'écran : la liste, Ajouter, Modifier, Supprimer.
- `TestimonialDialog.tsx` — la fenêtre : photo, prénom, métier, phrase, vitrine reliée, affiché, ordre.
- `useAdminTestimonials.ts` — lit tout, envoie la photo, enregistre, supprime.
