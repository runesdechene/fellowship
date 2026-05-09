# Explorer Grid Redesign — Design Spec

**Date:** 2026-05-09
**Status:** Approved, ready for implementation plan

## Context

L'Explorer actuel affiche les événements via deux composants `<SlideRow>` horizontaux empilés verticalement :

- **"Bientôt"** — événements à venir (start_date ≥ now), tri par start_date asc
- **"Ajoutés récemment"** — tous les événements, tri par created_at desc

Chaque ligne défile horizontalement et n'expose que ~3-4 cartes à la fois sur grand écran. Conséquence : impossible de voir d'un coup d'œil l'ensemble du catalogue, l'utilisateur ne sait pas combien d'événements existent ni naviguer rapidement entre eux.

## Goal

Remplacer les deux `<SlideRow>` par **une grille verticale unique**, contrôlée par un **segmented control 3-modes** placé au-dessus de la grille. La grille s'adapte fluidement de 2 colonnes (mobile) à ~8 colonnes (grand écran).

## Out of scope

- Pagination / infinite scroll (alpha = volume faible, on revoit en prod si ralentissement)
- Refonte de `EventCard` (composant déjà flexible, accepte le sizing parent)
- Nouvelle route ou navigation
- Suppression de `SlideRow.tsx` / `SlideRow.css` (gardés pour réutilisation future)
- Changements aux filtres existants (tags / plage de mois / département)

## Design

### Modes

Un state local `mode: 'upcoming' | 'recent' | 'all'` détermine le filtre temporel et l'ordre de tri appliqués au-dessus des filtres existants.

| Mode | Filtre supplémentaire | Tri |
|---|---|---|
| `upcoming` (défaut) | `start_date ≥ now` | `start_date` asc |
| `recent` | aucun | `created_at` desc |
| `all` | aucun | `start_date` asc |

Les filtres existants (tags, plage de mois, département) restent appliqués indépendamment et se cumulent avec le mode.

### UI — segmented control

Trois boutons inline, style "pills dans une track", placés sous la barre de filtres existante et au-dessus de la grille :

```
[ Bientôt ] [ Récents ] [ Tous ]
```

Le bouton actif a le fond `--primary` et texte blanc. Les inactifs sont transparents avec texte atténué. Pas de nouveau composant : implémentation inline dans `Explorer.tsx`, ~20 lignes JSX + classes CSS.

### Grille

Une `<div className="explorer-grid">` qui contient les `<EventCard>` directement (plus besoin du wrapper `flex-shrink-0 w-[240px]` du `renderCard` actuel).

```css
.explorer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  padding: 0 var(--page-padding);
}
```

L'auto-fill produit naturellement :

| Largeur écran | Cartes / ligne |
|---|---|
| < 640px | 2 |
| 640 – 1024px | 3-4 |
| 1024 – 1440px | 5-6 |
| 1440 – 1920px | 7 |
| ≥ 1920px | 8 |

### Persistence

Le mode rejoint les autres filtres dans `localStorage['explorer-filters']` sous la clé `mode`. Le `persist()` callback existant est réutilisé.

```ts
const [mode, setMode] = useState<ViewMode>(() =>
  (['upcoming', 'recent', 'all'] as const).includes(stored.mode) ? stored.mode : 'upcoming'
)
```

### Empty state

Lorsque la grille est vide après filtrage, on affiche un bloc `<div className="explorer-empty">` avec icône loupe (`Search` de lucide-react) :

> 🔍 Aucun événement ne correspond
> Essaie d'élargir tes filtres.

Les styles `.explorer-empty` sont déjà définis dans `Explorer.css` (vestige de l'ancien design, pas utilisés actuellement) — on réutilise les classes telles quelles, on ajoute simplement le markup correspondant.

### Skeleton loading

Pendant `useEvents()` loading, on rend 8 cards placeholder dans le même conteneur grille (`aspect-ratio: 2/3`, `animate-pulse`). Remplace les 4 placeholders horizontaux actuels.

### Logique de filtrage (extrait pseudocode)

```ts
const displayedEvents = useMemo(() => {
  let result = filteredEvents  // déjà filtré par tags/mois/dept

  if (mode === 'upcoming') {
    result = result.filter(ev => new Date(ev.start_date) >= now)
    // déjà trié par start_date asc dans filteredEvents
  } else if (mode === 'recent') {
    result = [...result].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }
  // 'all' : aucune transformation supplémentaire (tri par start_date asc déjà appliqué)

  return result
}, [filteredEvents, mode, now])
```

## Decisions

1. **Default mode = `upcoming`** — préserve la sensation actuelle (les utilisateurs ouvraient l'Explorer et voyaient "Bientôt" en premier).
2. **Persistence du mode en localStorage** — cohérent avec les autres filtres, l'utilisateur retrouve son contexte au prochain visit.
3. **Pas de pagination en alpha** — volume actuel d'événements faible. On revoit si jamais la prod fait ramer le rendu.
4. **Auto-fill sans media query** — une seule règle CSS, ajustement futur trivial (tweaker `minmax(180px, 1fr)`).
5. **`SlideRow` non supprimé** — composant générique, peut servir ailleurs (ex. profil public, embed). Seul l'import dans `Explorer.tsx` est retiré.

## Files touched

- `src/pages/Explorer.tsx` — remove SlideRow imports, add mode state + segmented control + grid rendering, add empty state markup
- `src/pages/Explorer.css` — add `.explorer-grid` + `.explorer-mode-segmented` rules

## Testing

- Visual : préview Netlify, vérifier responsive (mobile + tablette + desktop + grand écran)
- Functional : changer de mode, vérifier que les filtres tags/mois/dept s'appliquent toujours, que le mode persiste après rechargement
- Empty state : appliquer un filtre tag impossible (ex : tag inexistant) et vérifier le message
- Loading : throttle réseau et vérifier les skeletons
