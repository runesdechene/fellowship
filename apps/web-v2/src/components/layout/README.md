# components/layout — le châssis

Ce qui entoure chaque écran connecté et ne change pas d'un écran à l'autre. Une page n'y touche
pas directement : elle déclare son décor (retour, repère, affiche) via `lib/page-chrome.tsx`, et
le châssis le rend.

- `AppShell.tsx` — la coquille : assemble tout le reste, porte le fournisseur du décor.
- `Sidebar.tsx` — la barre latérale et sa navigation ; en mode admin (`/admin…`), les sections de l'administration.
- `AccountSwitcher.tsx` — la carte de compte, le choix d'enseigne et, pour un admin, l'entrée en administration.
- `Topbar.tsx` — la barre du haut : retour, repère, cloche, « Ajouter une date ».
- `PosterWall.tsx` — le mur d'affiche sur le bord droit.
- `IdentityError.tsx` — « Ton compte n'a pas pu se charger » et « Réessayer », à la place de l'app.
- `GuestShell.tsx` — le cadre d'une page vue sans compte : barre de la landing, page, mur d'affiche (lot 11b).

Styles : `styles/3-components/` (un fichier par composant).

- `UpdateBanner.tsx` — « Une nouvelle version de Fellowship est disponible » et « Recharger » (lot 12).
