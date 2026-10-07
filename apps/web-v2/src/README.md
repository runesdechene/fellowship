# src — le code de la V2

- `App.tsx` — les routes et la garde d'accès ; `main.tsx` — le montage (base `/v2`).
- `components/layout/` — le châssis ; `components/ui/` — les briques.
- `features/<écran>/` — un dossier par écran, avec ses hooks.
- `pages/` — les écrans hors coquille (connexion).
- `lib/` — la logique sans écran, et ses tests.
- `styles/` — tout le design, en trois couches.
- `types/` — les types de la base.
- `test/` — la préparation des tests.

Règles : `.claude/rules/v2.md`. Porte d'entrée : `apps/web-v2/README.md`.
