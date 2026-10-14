# features/landing — la landing publique

Ce qu'un visiteur sans compte voit sur `/`, et tout le monde sur `/decouvrir` (lot 11c, spec
`docs/superpowers/specs/2026-10-14-v2-landing-11c-design.md`, maquette `2290:2`). Tout ce qui vit
sur Fellowship vient de la base ; seul l'exposant de démonstration vient de `lib/landing-demo.ts`.

- `LandingPage.tsx` — la page : l'ouverture, puis les bandes dans l'ordre de la maquette.
- `useLandingShowcase.ts` — les lectures sans compte, assemblées par `lib/landing.ts`.
- `LandingBand.tsx` — une bande penchée (papier, terre, nuit), avec ses affiches floues en fond.
- `LandingTopBar.tsx` — la marque, les ancres, « Se connecter », « Créer ma vitrine ».
- `FinalCall.tsx` — « Ton prochain stand commence ici. » et le pied de page.
- `Opening.tsx`, `PosterWall.tsx` — l'ouverture et son mur de vraies affiches qui défile.
- `AssistantBand.tsx` — « Mon assistant de festivals », avec le Calendrier et le Tableau de bord.
- `screens/` — les écrans de l'app reproduits pour la landing, dans une fenêtre (`AppWindow`).
- `CommunityBand.tsx` — « Ma communauté d'exposants », avec l'écran Communauté et « Qui y va ».
