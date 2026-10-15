# features/admin-person

L'administration, fiche d'une personne (`/admin/personnes/:id`).

- `PersonPage.tsx` — la page : retour, en-tête, deux colonnes.
- `useAdminPerson.ts` — charge la personne, ses enseignes et ses gestes (via `lib/useAdminSheet.ts`).
- `PersonEntitiesCard.tsx` — ses enseignes, leur offre et son rôle dans chacune.
- `AccessCard.tsx` — rôle (modifiable), suspendre / réactiver et supprimer (absents sur sa propre fiche).
- `DeletePersonDialog.tsx` — la fenêtre de suppression : aperçu, puis retaper le prénom.
- `PersonInfoCard.tsx` — (mode correction : `PersonEditForm.tsx`) prénom, e-mail, téléphone, identifiant, code postal, notifications.
- `roles.ts` — les trois rôles et leur libellé, partagés par l'en-tête et l'accès.
- `PersonEditForm.tsx` — le formulaire de correction (prénom, e-mail, identifiant, téléphone, code postal).
