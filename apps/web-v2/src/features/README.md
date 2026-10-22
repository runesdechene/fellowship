# features — un dossier par écran

- `dashboard/` — le tableau de bord (`/`).
- `landing/` — la landing publique (`/`, sans compte).
- `event/` — la fiche d’un événement (`/evenement/:id`).
- `event-create/` — la création d’un événement (`/evenement/nouveau`).
- `community/` — la Communauté (`/communaute`).
- `settings/` — les Réglages (`/reglages`).
- `admin-board/` — l’accueil de l’administration : le tableau de l’équipe (`/admin/taches`).
- `admin-accounts/`, `admin-entity/`, `admin-person/` — l’administration : comptes, fiche enseigne, fiche personne (`/admin/…`).
- `admin-moderation/`, `admin-events/`, `admin-categories/`, `admin-testimonials/` — l’administration, lot 4 : signalements, événements, catégories, témoignages.

Chaque dossier porte son écran, ses morceaux et ses hooks. Un écran n’importe pas un autre écran : ce qui se partage monte dans `components/` ou `lib/`.
