# features/discover — la landing claire, à l'essai sur `/decouvrir-v2`

Maquette validée par Uriel le 26/11/2026 (artifact « Fellowship — Découvrir (papier) »). Elle vit
à côté de `features/landing/` tant qu'elle n'a pas pris sa place. Elle lui emprunte la FAQ, les
témoignages, l'encadré des organisateurs et le pied de page.

- `DiscoverPage.tsx` — la page : les sections dans l'ordre de la maquette.
- `DiscoverNav.tsx` — la barre qui reste en haut.
- `Hero.tsx` — la promesse à gauche (`ToolMess.tsx` : les outils en vrac), l'application à droite.
- `Manifesto.tsx` — ce qu'est Fellowship, et trois chiffres lus en base (`useCounts.ts`).
- `FeatureGrid.tsx` + `cards.ts` — la grille des détails de l'application.
- `Quote.tsx` — un témoignage saisi en admin.
- `Helper.tsx` — « Tout ce qu'il suit pour toi ».
- `Letter.tsx` — « Pourquoi j'ai créé Fellowship ».
- `Pricing.tsx` — le gratuit et le Pro côte à côte.
- `FinalPitch.tsx` — le dernier appel, et les papiers à jeter (`PaperToss.tsx`).
- `useCycle.ts` — ce qui tourne tout seul (titre, écrans, aides).

Les captures sont dans `public/decouvrir/` : la vraie application, sur des données inventées (aucun
vrai exposant, aucune vraie affiche). Les styles : `styles/3-components/discover*.css`.
