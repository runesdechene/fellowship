# features/landing — la landing publique

Ce qu'un visiteur sans compte voit sur `/` (lot 11a, spec `docs/superpowers/specs/2026-10-14-v2-landing-design.md`).
Un composant par section de la maquette `2027 — Landing`, dans son ordre.

- `useLanding.ts` — les catégories du défilé et les prochains festivals, lisibles sans compte.
- `LandingPage.tsx` — la page : les sections dans l'ordre de la maquette.
- `LandingTopBar.tsx` — la marque, les ancres, « Se connecter », « Créer ma vitrine ».
- `FinalCall.tsx` — « Ton prochain stand commence ici. » et le pied de page.
- `Hero.tsx` — l'accroche et la recherche (qui mène à la connexion jusqu'au lot 11b).
- `TypeMarquee.tsx` — le défilé des catégories, dans leurs couleurs de la base.
- `NextFestivals.tsx` — les cinq prochaines dates publiques, choisies par `lib/landing.ts`.
- `WhyFellowship.tsx` — l'histoire, signée Uriel (texte validé le 08/10/2026).
- `Features.tsx` — les six fonctions et leurs vignettes dessinées en HTML et CSS.
- `Community.tsx` — « Tu n'y vas jamais seul. », une discussion dessinée.
- `ProTeaser.tsx` — le Pro, son prix lu dans `lib/pricing.ts`.
- `Organizers.tsx` — le bandeau sombre des organisateurs, « Nous écrire ».
- `Festivalgoers.tsx` — la bande des festivaliers.
