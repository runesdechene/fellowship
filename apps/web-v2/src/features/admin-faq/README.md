# features/admin-faq — la FAQ de la landing

`/admin/faq` (maquette `2552:233`, 25/10/2026). La landing lit les questions affichées :
`features/landing/useFaq.ts`. Table `faq_questions` (migration `20261025140000_faq.sql`).

- `FaqAdminPage.tsx` — l'écran : le formulaire, la liste dans l'ordre de la landing, Modifier, Supprimer.
- `FaqForm.tsx` — ordre, question, réponse, affichée ou masquée.
- `useAdminFaq.ts` — lit tout, ajoute, corrige, supprime.

Mise en page et styles : ceux des Mises à jour (`styles/3-components/admin-updates.css`).
