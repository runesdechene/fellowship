# features/welcome — l'arrivée d'un exposant

`/bienvenue` (lot 10a, maquettes 2102:72, 2244:2, 2244:53 ; sept étapes depuis le 21/10/2026, maquettes
2391:65 à 2392:271, spec `docs/superpowers/specs/2026-10-21-arrivee-sept-etapes-design.md`). Le
gabarit commun avec la connexion vit dans `styles/3-components/door.css` ; les règles dans
`lib/welcome.ts`.

L'enseigne se crée en quittant l'étape photo et bannière ; les festivals puis les exposants viennent
après, et l'identité n'est relue qu'à la toute fin.

- `WelcomePage.tsx` — les étapes, la vitrine en direct, la création, puis l'entrée dans l'app.
- `WelcomeStepFields.tsx` — le contenu d'une étape : sur-titre, titre, phrase, champs.
- `WelcomePreview.tsx` — « Ta vitrine, en direct », photo et bannière comprises.
- `ActivityPreview.tsx` — « C'est ainsi qu'on te verra dans le réseau » (étape du prénom).
- `WelcomeFestivals.tsx` — « Ces festivals t'intéressent ? » : un choix devient un festival repéré.
- `WelcomePeople.tsx` — « Tu les connais peut-être » : les exposants des mêmes festivals d'abord.
- `useWelcomeDraft.ts` — les réponses (mémoire de session) et l'étape (`?etape=N`).
- `useWelcomeImages.ts` — la photo et la bannière choisies, en attendant la création.
- `useSlugFree.ts` — l'adresse `flw.sh/…` est-elle libre ?
- `useReferralOwner.ts` — à qui appartient le code de parrainage tapé ?
