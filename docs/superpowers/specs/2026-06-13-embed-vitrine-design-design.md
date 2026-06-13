# Embed = design exact des dates de la Vitrine

**Date :** 2026-06-13
**Remplace :** `2026-06-13-embed-mini-fluid-design.md` (la direction a changé : on ne fait
plus de format mini/customisation, on porte le design Vitrine).

## Intention

L'embed iframe actuel est jugé moche. Plutôt qu'un système de customisation CSS (impossible
de toute façon à travers la frontière iframe), on **réutilise le design EXACT des cartes de
dates de la page Ma Vitrine** (`VitrineEscales` / classes `.v-escale`). On a déjà un beau
rendu validé ; on le porte tel quel dans l'embed.

## Décisions validées

- **Un seul design** : les cartes escales deviennent LE rendu de l'embed. On **retire la
  distinction mini / pleine-page** (le param `view`, les onglets de format de la modale).
- **Pas de compagnons** (`.v-ecomp`) : hors contexte sur un site perso, fetch en plus,
  vie privée.
- **Tags colorés exacts** : on charge la table des tags dans l'embed (`useTags`) pour les
  mêmes couleurs par tag que la Vitrine.
- **En-tête identité conservé** : avatar (64px) + nom du profil + description (type · ville),
  centré, au-dessus des cartes. Puis le pied « Propulsé par Fellowship » (inchangé).
- **Fond de page transparent conservé** (seule déviation vs Vitrine) : l'embed doit se fondre
  dans le site hôte. Les cartes, elles, sont opaques `--card` exactement comme la Vitrine.

## Design des cartes (port exact de `.v-escale`)

Carte horizontale, une par événement à venir, triées par date :
`[date] [affiche 86×116] [infos] [chevron ›]`

- **Date** (`.v-edate`, 58px) : jour 28px police titre `--foreground`, mois MAJ `--muted-foreground`, année.
- **Affiche** (`.v-eposter`) : 86×116, radius 11, ombre `0 6px 16px rgba(0,0,0,.35)`, `object-fit:cover`.
- **Infos** (`.v-einfo`) : nom 18px police titre ; tags colorés (max 3) ; lieu (pin + ville (dépt)) ; durée (horloge + N jours).
- **Chevron** `›` `--muted-foreground` à droite.
- Carte : `background:--card`, `border:1px --border`, `radius:18px`, `padding:16px 18px`,
  hover `border-color: hsl(33 16% 34%)` + `translateY(-1px)`.

## Tokens portés dans l'embed (scopés par `data-theme`)

L'embed reste isolé : on **redéfinit** les valeurs de tokens sur `.embed-page[data-theme="…"]`
(plutôt que dépendre du `:root` de l'app, qui est figé en sombre tant que `.light` n'est pas posé).

| token | jour (.light) | nuit (:root) |
|---|---|---|
| `--background` | `35 29% 92%` | `9 24% 7%` |
| `--foreground` | `24 21% 20%` | `35 60% 95%` |
| `--card` | `39 40% 94%` | `9 22% 12%` |
| `--muted-foreground` | `28 11% 44%` | `28 17% 64%` |
| `--border` | `30 14% 84%` | `33 16% 20%` |

Polices : `--font-heading` (Plus Jakarta Sans) et `--font-body` (Inter) sont déjà chargées
globalement (`index.html`) — l'embed est une route de l'app, donc dispo. On les référence.

## Fichiers touchés

| Fichier | Changement |
|---|---|
| `src/lib/embed-params.ts` | retire `view`/`EmbedView` ; params = `{theme, max, accent, maxWidth}` ; `max` défaut = null (tous) |
| `src/lib/embed-params.test.ts` | MAJ (plus de view ; max défaut null) |
| `src/lib/embed-snippet.ts` | retire `view` ; snippet unique `?theme=` ; hauteur de repli fixe |
| `src/lib/embed-snippet.test.ts` | MAJ |
| `src/components/profile/EmbedModal.tsx` | retire les onglets Format (Vignette/Pleine page) ; snippet unique |
| `src/pages/Embed.tsx` | `useTags()` ; rendu = en-tête identité + cartes escales (exact) + pied ; plus de mini/full ; pas de compagnons |
| `src/pages/EmbedPage.css` | tokens jour/nuit scopés ; styles cartes escales (port exact) ; retrait des styles mini-row + hero/grid devenus morts ; en-tête centré + pied conservés |

## Hors périmètre (YAGNI)

- Customisation CSS / Web Component / params de style : abandonné.
- Compagnons.
- Sous-titre « Prochaines escales — N dates » : l'en-tête identité suffit (peut s'ajouter plus tard).

## Vérification

- `pnpm build` vert ; tests `embed-params` + `embed-snippet` verts.
- Capture headless réelle (Edge, contexte neuf) du déploiement : rendu = cartes Vitrine, jour ET nuit, pleine largeur.
