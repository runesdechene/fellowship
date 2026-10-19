# features/admin-updates — les mises à jour

`/admin/mises-a-jour` : écrire, publier et corriger les Nouveautés (spec
`docs/superpowers/specs/2026-10-19-v2-nouveautes-design.md`, maquette `2373:65`). Les exposants les
lisent sur `/nouveautes` (`features/updates`).

- `UpdatesAdminPage.tsx` — l'écran : le formulaire, les publiées, Modifier, Supprimer.
- `UpdateForm.tsx` — version, titre, texte, image, poids ; Aperçu, Publier (confirmé pour une grosse).
- `useAdminUpdates.ts` — lit, publie (`publish_app_update`, puis `app-update-email` pour une grosse),
  corrige, supprime, envoie l'image (seau `app-updates`).
