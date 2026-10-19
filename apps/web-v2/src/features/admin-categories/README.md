# features/admin-categories — les catégories

`/admin/categories` (lot 4, spec `docs/superpowers/specs/2026-10-19-v2-admin-lot-4-design.md`).
Les catégories se lisent partout par `lib/tags.ts` ; leurs icônes, par `lib/category-icons.ts`.

- `CategoriesPage.tsx` — l'écran : la liste, Ajouter, Modifier, Supprimer.
- `CategoryDialog.tsx` — la fenêtre : nom, adresse, couleurs, ordre, aperçu.
- `useCategories.ts` — lit (`admin_categories`), enregistre (renommer suit dans les fiches), supprime.
