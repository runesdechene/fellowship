# features/admin-board — le tableau de l'équipe

`/admin/tableau`, l'accueil de l'administration (maquette `2417:233`, Uriel, 22/10/2026). Quatre
colonnes pensées pour des cerveaux TDAH : À réfléchir, À faire, Maintenant (une carte par
personne), Fait (compté sur la semaine, vidé après 7 jours). Table `admin_tasks`, admins seuls.

- `BoardPage.tsx` — l'écran : les quatre colonnes, les erreurs, la carte qui vient d'être finie.
- `BoardColumn.tsx` — une colonne : titre, compteur, saisie rapide, repli de « À faire », dépôt.
- `TaskCard.tsx` — une carte : texte corrigé sur place, porteur, âge, flèches, prendre, supprimer.
- `useAdminBoard.ts` — lit et écrit `admin_tasks` ; les règles pures vivent dans `lib/admin-board.ts`.
