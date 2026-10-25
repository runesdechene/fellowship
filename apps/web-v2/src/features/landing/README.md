# features/landing — la landing publique

Ce qu'un visiteur sans compte voit sur `/`, et tout le monde sur `/decouvrir` (lot 11c, spec
`docs/superpowers/specs/2026-10-14-v2-landing-11c-design.md`, maquette `2290:2`). Tout ce qui vit
sur Fellowship vient de la base ; seul l'exposant de démonstration vient de `lib/landing-demo.ts`.

- `LandingPage.tsx` — la page : l'ouverture, puis les bandes dans l'ordre de la maquette.
- `useLandingShowcase.ts` — les lectures sans compte, assemblées par `lib/landing.ts`.
- `LandingBand.tsx` — une bande penchée (papier, terre, nuit), avec ses affiches floues en fond.
- `LandingTopBar.tsx`, `useLandingNav.ts` — la barre qui reste en haut : la marque, les chapitres
  (le chapitre lu est souligné), « Se connecter », « Commencer gratuitement ».
- `OrganizersBox.tsx` — l'encadré des organisateurs, en tête du pied de page (« Bientôt »).
- `FinalCall.tsx` — « Ton prochain stand commence ici. », la FAQ et le pied de page.
- `LandingFaq.tsx` — la FAQ sous l'appel final : les questions s'ouvrent une à une.
- `useFaq.ts` — les questions affichées, éditées depuis `/admin/faq`.
- `LandingSearch.tsx` — la recherche, qui mène à `/festivals` (lot 11b).
- `LandingFoot.tsx` — le pied de page, partagé avec la recherche publique (`away` hors de la landing).
- `Opening.tsx`, `PosterWall.tsx` — l'ouverture et son mur de vraies affiches qui défile.
- `AssistantBand.tsx` — « Ton copilote de festivals », avec le Calendrier et le Tableau de bord,
  ouvert par `ToolsCompare.tsx` : huit outils en vrac (vrais logos, `public/landing/`) → une seule app.
- `screens/` — les écrans de l'app reproduits pour la landing, dans une fenêtre (`AppWindow`).
- `CommunityBand.tsx` — « Ta communauté d'exposants », avec l'écran Communauté et « Qui y va ».
- `SoonBand.tsx` — « Bientôt · Pro » : l'inscription en un clic, le dossier PDF, la veille.
- `ProBand.tsx` — le Pro : « Gratuit » et le prix (`lib/pricing.ts`) côte à côte, ce que le Pro
  ajoute, l'écran « Pour toi », puis `ProSoon.tsx` : les six encadrés « Bientôt · Pro ».
- `Stories.tsx`, `StoryDialog.tsx`, `useTestimonials.ts` — « Ils en parlent mieux que nous » : le
  bouton flottant et les stories des témoignages (table `testimonials`, `lib/testimonials.ts`).
