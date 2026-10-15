# features/admin-person

L'administration, fiche d'une personne (`/admin/personnes/:id`).

- `PersonPage.tsx` — la page : retour, en-tête, deux colonnes.
- `useAdminPerson.ts` — charge la personne, ses enseignes et ses gestes.
- `PersonEntitiesCard.tsx` — ses enseignes, leur offre et son rôle dans chacune.
- `PersonActivityCard.tsx` — quatre chiffres et les derniers gestes.
- `AccessCard.tsx` — rôle (modifiable), suspension et suppression (désactivées pour l’instant).
- `PersonInfoCard.tsx` — (mode correction : `PersonEditForm.tsx`) prénom, e-mail, téléphone, identifiant, code postal, notifications.
- `roles.ts` — les trois rôles et leur libellé, partagés par l'en-tête et l'accès.
- `PersonEditForm.tsx` — le formulaire de correction (prénom, identifiant, téléphone, code postal).
