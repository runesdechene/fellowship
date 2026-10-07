# features — un dossier par écran

- `dashboard/` — le tableau de bord (`/`).
- `event/` — la fiche d’un événement (`/evenement/:id`).
- `event-create/` — la création d’un événement (`/evenement/nouveau`).

Chaque dossier porte son écran, ses morceaux et ses hooks. Un écran n’importe pas un autre écran : ce qui se partage monte dans `components/` ou `lib/`.
