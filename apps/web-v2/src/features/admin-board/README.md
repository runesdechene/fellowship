# features/admin-board — le tableau de l'équipe

`/admin/tableau`, l'accueil de l'administration (maquette `2432:306`, Uriel, 22/10/2026). Chaque
admin a son paquet de cartes et n'en voit que la carte du dessus : Fait, Plus tard, Mélanger. Les
idées attendent à gauche, les paquets de l'équipe à droite, ce qui est terminé s'efface en 7 jours.
Table `admin_tasks`, admins seuls.

- `BoardPage.tsx` — l'écran : en-tête, les trois zones, l'archive, les erreurs.
- `DeckTable.tsx` — mon paquet : carte du dessus, gestes, saisie, paquet déplié.
- `IdeaNotes.tsx` — les idées, à glisser sur un paquet.
- `TeamDecks.tsx` — les paquets des autres admins, où l'on donne une carte.
- `DoneArchive.tsx` — « Terminé » par jour, avec qui l'a fait, de plus en plus pâle.
- `useDropZone.ts` — une zone où lâcher une carte glissée.
- `useAdminBoard.ts` — lit et écrit `admin_tasks` ; les règles pures vivent dans `lib/admin-board.ts`.
