# Design system « 2027 » — spec

> 07/10/2026. Les maquettes « 2027 » du Figma font foi (carnet : `docs/v2/maquettes-2027.md`).
> Ce lot fait passer **le code existant de la V2** au langage « 2027 ». Les écrans nouveaux
> (calendrier, Explorer, vitrine, bilans…) arrivent chacun avec leur propre spec et leur plan.

## Le but

Que la V2 en ligne ressemble aux maquettes validées : même matière, mêmes polices, mêmes signes.
Et que `docs/v2/DESIGN-SYSTEM.md` dise à Uriel où changer quoi, dans ce nouveau langage.

## Ce qui ne change pas

L'architecture en trois couches, qui est saine : `1-primitives.css` (la matière),
`2-semantic.css` (le sens), `3-components/` (l'assemblage), aucune valeur en dur hors des couches
0-2, aucun style dans les `.tsx`. Les garde-fous (stylelint, en-têtes) restent tels quels.

## Ce qui change

**Couche 1 — la matière** (remplacée) :
- Polices : **Inter** (interface) et **Instrument Serif** (grands titres seulement), chargées comme
  aujourd'hui depuis Google Fonts dans `index.html`. Plus Jakarta Sans disparaît.
- Neutres : fond `#fcfbf9`, surfaces `#f2f0ec`, filets `#ebe9e5`, encres `#1f1d1b` / `#6f6b66` /
  `#a6a19b`. La barre latérale garde le beige d'Uriel (`#f3f0e9`) et son panneau à arrondi inversé.
- Le dégradé du logo : `#964623` → `#cf9251`.
- Les couleurs d'état olive / blé / argile et l'électrique de la V1 sortent (plus de vert, sauf le
  point « en direct »).
- Échelle typographique, espacements, arrondis, durées : repris, recalés sur les maquettes.

**Couche 2 — le sens** (réécrite, en gardant les noms existants partout où le sens est le même,
pour que la couche 3 suive sans modification) :
- `--ink-*`, `--surface-*`, `--line-*`, `--radius-*` pointent vers la nouvelle matière.
- Nouveaux jetons : `--brand-gradient` (acquis, onglet actif mobile, action principale de la landing),
  `--font-display` (Instrument Serif), `--status-*` (les trois signes de progression : vide,
  à moitié, plein), `--tag-tint` / `--tag-line` (opacités des tags colorés).
- Les tons `todo` / `pending` / `ok` des pastilles deviennent les signes de forme.

**Couche 3 — l'assemblage** : on ne touche que les composants dont la *structure* change dans la
maquette — bouton principal noir, pastilles de statut (point + texte à l'encre ; « Inscrit » en
dégradé), tags colorés, contrôle segmenté (option active en dégradé pour « Inscrit »), cartes
blanches bordées au lieu des aplats beige, barre latérale en Inter.

## Le périmètre de ce lot

Les écrans déjà codés : barre latérale, barre du haut, tableau de bord, fiche événement, création
d'une date, connexion. Ils prennent le nouveau langage, **sans gagner les fonctions nouvelles** des
maquettes (Mes dossiers, objectif, avis…) : celles-ci viennent avec leurs plans.

## Vérification

- `pnpm --filter web-v2 lint` (stylelint garde : aucune valeur en dur hors des couches 0-2) et build.
- Chaque écran du périmètre ouvert en dev, capture posée à côté du cadre Figma « 2027 » qui lui
  correspond, chaque écart repris (règle « Un écran n'est fini que comparé à sa maquette »).
- `prefers-reduced-motion` et le thème sombre éventuel : vérifier qu'aucun jeton supprimé n'est
  encore lu (recherche des `var(--…)` orphelins).

## Risques

- Des composants lisent des jetons dont le sens change (un « crème » utilisé comme surface de
  carte) : la recherche des jetons supprimés ou renommés les liste avant la bascule.
- La V1 n'est pas concernée (aucun import croisé).
