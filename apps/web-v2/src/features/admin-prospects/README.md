# features/admin-prospects

La page Prospects de l'administration (`/admin/prospects`, lot 3, maquette `2343:2`) : les contacts
à démarcher, travaillés directement dans le tableau.

- `ProspectsPage.tsx` — la page : en-tête, chiffres, bandeau, outils, tableau, pages, fenêtres.
- `useProspects.ts` — charge une page, les chiffres, les nombres des filtres, les sources et les correspondances.
- `ProspectsStats.tsx` — les quatre chiffres.
- `MatchBanner.tsx` — le bandeau des prospects qui ont l'e-mail ou le téléphone d'un compte.
- `ProspectsTable.tsx` — le tableau modifiable, et la ligne d'un prospect en cours d'ajout.
- `ProspectCells.tsx` — les cellules : texte, liste, contact (canal et date), case.
- `prospect-writes.ts` — les écritures : cellule, ajout, suppression, rapprochement, import.
- `ImportDialog.tsx` — la fenêtre d'import CSV, avec son aperçu.
- `MatchDialog.tsx` — la fenêtre « Voir et rapprocher ».
