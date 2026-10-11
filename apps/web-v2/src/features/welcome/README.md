# features/welcome — l'arrivée d'un exposant

`/bienvenue` (lot 10a, maquettes 2102:72, 2244:2, 2244:53). Le gabarit commun avec la connexion vit
dans `styles/3-components/door.css` ; les règles dans `lib/welcome.ts`.

- `WelcomePage.tsx` — les étapes à gauche, la vitrine en direct à droite, la création à la fin.
- `WelcomeStepFields.tsx` — le contenu d'une étape : sur-titre, titre, phrase, champs.
- `WelcomePreview.tsx` — « Ta vitrine, en direct ».
- `ActivityPreview.tsx` — « C'est ainsi qu'on te verra dans le réseau » (étape du prénom).
- `useWelcomeDraft.ts` — les réponses (mémoire de session) et l'étape (`?etape=N`).
- `useSlugFree.ts` — l'adresse `flw.sh/…` est-elle libre ?
