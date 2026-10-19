# features/admin-events — les événements de l'administration

`/admin/evenements?q=&page=` (lot 4, spec `docs/superpowers/specs/2026-10-19-v2-admin-lot-4-design.md`).
La recherche et la page dans l'adresse : `lib/admin-events.ts`.

- `AdminEventsPage.tsx` — l'écran : recherche, tableau paginé, « Supprimer » avec confirmation.
- `useAdminEvents.ts` — lit une page (`admin_evenements`) et supprime une fiche.
