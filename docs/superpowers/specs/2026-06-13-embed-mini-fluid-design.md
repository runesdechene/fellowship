# Embed mini — largeur fluide + en-tête recentré

**Date :** 2026-06-13
**Vue concernée :** `view=mini` du widget embed (`/@:slug/embed`). La vue `full` n'est **pas** touchée.

## Problème

La version mini du calendrier embarqué est plafonnée à **360px** (centrée, beaucoup de
vide autour) — à la fois par le défaut `maxWidth = 360` dans `embed-params.ts` et par la
règle CSS `.embed-page[data-view="mini"] .embed-page-container { max-width: 360px }`.

Uriel veut que la mini soit **fluide (100% du conteneur hôte)**, pour que la personne qui
l'intègre la dimensionne elle-même via son propre conteneur (Shopify, etc.) — max de
flexibilité, zéro plafond imposé. En plus, profiter du recadrage pour rafraîchir l'en-tête
et les lignes.

## Design validé (compagnon visuel, mock `mini-v4`)

### 1. Largeur fluide

- `embed-params.ts` : le défaut `maxWidth` de la vue `mini` passe de `360` à `null`
  (→ 100% du parent, comme `full`). Le param `?maxw=` reste un **plafond optionnel**
  (clampé [240, 2000]) pour qui veut contraindre.
- `EmbedPage.css` : supprimer la règle `.embed-page[data-view="mini"] .embed-page-container { max-width: 360px }`.

### 2. En-tête mini recentré (épuré)

Bloc centré en colonne (remplace l'actuel `.embed-header` en ligne avatar + nom + sous-titre) :

- **Avatar** agrandi à **64px** (fallback initiale ~24px), centré.
- En dessous : la **description** = `craft_type · ville` (le champ `subtitle` déjà calculé).
- **Plus de nom de marque** : la personne sait sur quel site elle est ; le nom est redondant.
- **Pas de titre/accroche** ajouté (idée « On se rencontre en vrai » écartée).

Ne concerne que la mini : la vue `full` garde son `.embed-hero` (titre + bouton Suivre).

### 3. Lignes d'événements (mini)

Layout une ligne : `[date] [titre …] ………… [lieu]`

- **Date** à gauche (inchangée : jour en cuivre + mois).
- **Titre** de l'event : `flex: 1`, **plus grand (15px, 700)**, `white-space: nowrap` +
  ellipse si trop long.
- **Lieu** (📍 ville (dépt)) : repoussé **à droite**, `flex-shrink: 0`, `nowrap`, gris.

JSX : on remplace le bloc empilé `.embed-mini-info` (nom au-dessus du lieu) par deux
enfants frères directs de `.embed-mini-row` : `.embed-mini-name` (flex:1) et
`.embed-mini-loc` (à droite).

## Fichiers touchés

| Fichier | Changement |
|---|---|
| `src/lib/embed-params.ts` | défaut `maxWidth` mini : `360` → `null` ; commentaire à jour |
| `src/lib/embed-params.test.ts` | test ligne 40-43 : mini `maxWidth` attendu `null` |
| `src/pages/Embed.tsx` | JSX en-tête mini (avatar + description, centré, sans nom) ; JSX ligne mini (titre + lieu à droite) |
| `src/pages/EmbedPage.css` | en-tête mini centré + avatar 64px ; lignes mini (name flex/ellipse + loc à droite) ; retrait du cap 360px |

## Hors périmètre (YAGNI)

- Vue `full` : intacte.
- `embed-snippet.ts` : la hauteur de repli mini (360px) reste — l'iframe s'auto-redimensionne
  via `postMessage`, le repli n'est qu'un état initial. Pas touché.
- Pas de reflow multi-colonnes (écarté : une colonne étirée suffit, l'hôte contraint la largeur).

## Vérification

- `pnpm build` (tsc + vite) vert.
- Test `embed-params` vert (défaut mini = null).
- Rendu mini conforme au mock `mini-v4` (large + conteneur étroit).
