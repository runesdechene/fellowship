# Page Carte des événements — design

**Date :** 2026-06-04
**Statut :** validé (brainstorming, maquettes companion)
**Prérequis :** géocodage livré (v0.7.220) — `events.latitude/longitude/geo_precision`, 77/77 backfillés.

## Objectif

Une page **Carte** qui montre les festivals géolocalisés sur une **vraie carte interactive**, mais **entièrement redesignée** aux couleurs Fellowship — un artefact maison, pas un Google Maps. Double rôle : **aimant d'acquisition** (belle carte publique) et **tableau de chasse perso** (mes festivals confirmés ressortent).

## Décisions validées (brainstorming)

1. **Vraie carte recolorée**, pas un dessin stylisé ni un globe 3D. Concept « globe/planète » écarté (joli mais 95% vide ; la courbure ne valait pas le coup).
2. **Stack : MapLibre GL JS + tuiles OpenFreeMap** (sans clé, sans coût) — aligné sur le stack carto maison d'Uriel. Recoloration à la volée façon `applyParchmentColors`.
3. **Palette pilotée par le thème app** : « parchemin nuit » (validée) en mode sombre, « parchemin jour » (crème/atelier) en mode clair.
4. **Gating hybride** : carte + pins **gratuits pour tous** (cohérent avec Explorer gratuit, [[project_freemium_matrix]]). La couche sociale **« qui de ton réseau y va »** + filtres avancés = **Pro**, teasés *sur la carte* (cadenas sur l'overlay), pas un blocage de page.
5. **Pins colorés par tag** une fois zoomés (via `getTagLandingColor`, [[reference_tags_slug_coupling]]) ; **clusters** cuivre + chiffre en vue dézoomée.
6. **Mes events « Accepté » en évidence** : pour chaque event où l'acteur actif a le statut de participation `'confirme'` (= « Accepté »), le marqueur est **l'avatar de l'acteur**, cerclé cuivre, plus gros, **exempté de clustering**.
7. Cadrée **France** par défaut + **vignette** pour éteindre les bords (les voisins restent neutres ; données France-only).

## Architecture

### Vue d'ensemble des unités

| Unité | Responsabilité | Dépend de |
|---|---|---|
| `pages/Carte.tsx` | Orchestration : charge données, compose chrome + carte | hook + composants ci-dessous |
| `components/map/MapCanvas.tsx` | Instancie MapLibre, applique le restyle, gère source GeoJSON + couches pins/clusters + marqueurs avatar | `lib/map-style`, MapLibre |
| `components/map/EventPanel.tsx` | Liste les events du cadre visible (droite desktop / tiroir bas mobile), synchro bounds | données |
| `components/map/MapFilters.tsx` | Recherche (ville/festival) + chips catégories | tags |
| `lib/map-style.ts` | `applyParchmentColors(map, theme)` : 2 palettes (nuit/jour), recolore les couches du style | — (pur sauf l'appel MapLibre) |
| `lib/map-data.ts` | **Pur** : events → GeoJSON `FeatureCollection`, résolution couleur tag, flag « accepté » | `getTagLandingColor` |
| `hooks/use-map-events.ts` | Charge events `latitude not null` + participations de l'acteur actif → données prêtes carte | supabase |

### 1. Rendu carte (`MapCanvas` + `map-style`)

- **MapLibre GL JS vendoré** (`pnpm add maplibre-gl`, pas de CDN en prod — le proto chargeait depuis unpkg sans SRI, à proscrire en prod).
- Style de base : `https://tiles.openfreemap.org/styles/positron` (vectoriel, minimal → facile à recolorer).
- `applyParchmentColors(map, theme)` parcourt `map.getStyle().layers` et réécrit la peinture selon le type (`background`/`fill`/`line`/`symbol`) et le pattern d'`id` (water/forest/building/road/boundary/label). Deux jeux de constantes :
  - **Nuit** : land `#1a120f`, water `#100c0b`, forêt `#1f261d`, routes `#3a2a20`/`#5a3c26`, labels `#cbb9a8` halo `#120b09`, frontières cuivre `rgba(232,131,58,.18)`.
  - **Jour** : équivalents crème/parchemin (terres `#efe7d8`, eau `#dcc7ad`, labels brun, frontières cuivre douce) — à finaliser à l'implémentation sur la base des tokens `.light` ([[reference_da_css_tokens]], [[reference_da_daynight_gotchas]]).
- Appelé sur `style.load`, et **ré-appliqué quand le thème app change** (s'abonner à `src/lib/theme`).
- Caméra initiale : `center [2.6, 46.7], zoom ~5.15`, `dragRotate:false`. Vignette = overlay CSS radial (hors MapLibre).

### 2. Pins, clusters, avatars (`map-data` + `MapCanvas`)

- `use-map-events` → `eventsToGeoJSON(events, participations, activeActorId)` (**pur**) produit une `FeatureCollection` ; chaque feature porte `{ id, slug, name, city, start_date, end_date, primaryTag, color, accepted }` où `color = getTagLandingColor(primaryTag)` et `accepted = participations.some(p => p.event_id === id && p.status === 'confirme')`.
- **Source GeoJSON avec `cluster: true`** (clustering natif MapLibre/supercluster). Les features `accepted` sont **sorties de la source clusterisée** et rendues comme **marqueurs DOM avatar** séparés (toujours visibles, non agrégés).
- Couches :
  - `clusters` : cercle cuivre `#e8833a` + `count` (texte) — taille selon `point_count`.
  - `unclustered-point` : cercle `['get','color']` (couleur tag), bord crème, halo.
  - **marqueurs avatar** (DOM `maplibregl.Marker`) : photo de l'acteur actif (cerclée cuivre, ~36px, pulse), pour les events `accepted`. Avatar résolu via la vue `actor_public.avatar_url` (clé `activeActorId`) ; fallback = initiale sur pastille cuivre.
- Interactions : **clic cluster** → `easeTo` zoom dedans ; **clic pin / avatar** → mini-fiche (popup MapLibre stylée : nom, date `formatDateRange`, ville, tag) avec lien vers `/e/{slug}` ([[project_festival_page_done]]).

### 3. Chrome & layout (`MapFilters` + `EventPanel`)

- **Topbar** : champ recherche (ville/festival) + chips catégories (filtrent la source via `setFilter` sur le tag) — réutilise la liste de tags (`useTags`).
- **EventPanel** : liste les events **dans les bounds visibles** (écoute `moveend`, filtre `map-data` par bounds — fonction **pure**). Droite en desktop, **tiroir bas** en mobile (`pointer: coarse`). Survol liste ↔ pin (highlight). Clic item → centre + ouvre la fiche.
- **Légende** (Festival / ● chiffre = plusieurs / ⬤ avatar = tu es accepté) + contrôles zoom (`NavigationControl`, sans compass).

### 4. Couche Pro « qui y va » (teasée)

Calque optionnel : pour un abonné Pro, agrège **les participations visibles de son réseau** (followers/amis pro — [[project_visibility_model]]) par event → badge « N de ton réseau y vont » sur les pins/fiches. Gratuit : l'option apparaît avec un **cadenas** (push abo). **Réutilise les données réseau/participations existantes**, aucune nouvelle table. *Détail d'agrégation spécifié au plan ; v1 peut livrer la carte + le teaser cadenassé et câbler l'agrégat juste après.*

### 5. Nav, route, guard

- `navModel.ts` : nouvelle clé `carte` (`to:'/carte'`, `label:'Carte'`, `icon:'Map'`, `pro:false`, `built:true`), ajoutée à `PERSON_NAV` et `EXPOSANT_NAV`.
- `App.tsx` : `<Route path="/carte" element={<AuthenticatedApp><Carte /></AuthenticatedApp>} />`.
- **Whitelister `/carte`** dans le guard `AppLayout` (sinon redirection — [[reference_applayout_route_guard]]).

## Données & flux

```
use-map-events
  ├─ select events where latitude not null  → events[]
  └─ participations de l'acteur actif (existant) → parts[]
        ↓ eventsToGeoJSON(events, parts, activeActorId)   [pur]
   FeatureCollection (color par tag, accepted flag)
        ↓
  MapCanvas : source clusterisée (non-accepted) + marqueurs avatar (accepted)
        ↕ bounds (moveend)
  EventPanel : eventsInBounds(features, bounds)   [pur]
```

## Gestion d'erreurs

- Tuiles OpenFreeMap indisponibles → MapLibre affiche le fond (couleur land) ; bandeau discret « carte momentanément indisponible », le panneau liste reste utilisable.
- Avatar acteur introuvable → fallback initiale cuivre (jamais de marqueur cassé).
- Event sans coords → simplement absent de la carte (déjà géré : `latitude not null`).
- WebGL non supporté (rare) → message de repli + lien vers Explorer.

## Tests (TDD)

Fonctions **pures** de `map-data.ts`, pattern test pur vitest ([[reference_react_test_infra]]) :
- `eventsToGeoJSON` : structure GeoJSON, `color` = couleur du tag primaire (fallback `#e8a06a`), inversion `[lng,lat]` respectée.
- flag `accepted` : vrai seulement si une participation de l'acteur actif sur cet event a `status === 'confirme'` (pas `interesse`/autres).
- `eventsInBounds` : ne garde que les features dans la bbox.
- résolution couleur par tag inconnu → fallback.
Le rendu MapLibre/avatars = **vérification manuelle** (contrainte RTL).

## Hors scope (explicitement)

- **Globe 3D / planète** (écarté).
- **Activation d'un pays étranger** : la carte est mondiale techniquement, mais on n'a de pins qu'en France ; « allumer » la Belgique = juste y avoir des events (zéro refonte). Pas de gestion d'état pays en v1.
- **Filtres Pro avancés** au-delà du « qui de ton réseau y va » (calques météo/distance… plus tard).
- **Temps réel** (les positions ne bougent pas ; refetch au chargement suffit).
- **Logo « . »** : amélioration de wordmark séparée, commit indépendant (capturée hors de ce spec).

## Fichiers touchés

**Nouveaux**
- `src/pages/Carte.tsx`
- `src/components/map/MapCanvas.tsx`
- `src/components/map/EventPanel.tsx`
- `src/components/map/MapFilters.tsx`
- `src/lib/map-style.ts`
- `src/lib/map-data.ts`
- `src/lib/map-data.test.ts`
- `src/hooks/use-map-events.ts`

**Édités**
- `src/lib/navModel.ts` (clé `carte` + listes nav)
- `src/App.tsx` (route)
- `src/components/layout/AppLayout.tsx` (whitelist `/carte` dans le guard)
- `package.json` (`maplibre-gl`)

## Caveats honnêtes

- **OpenFreeMap** est un service communautaire gratuit ; prévoir le repli visuel si lent/down (pas un bloqueur, mais à monitorer).
- La **recoloration** dépend des `id` de couches du style positron ; si OpenFreeMap change son style, revérifier les patterns. Acceptable (le style est stable, et le repli est juste « moins joli »).
- **Poids bundle** : MapLibre ~200 kB gzip. À charger en **lazy/route-split** (`React.lazy` sur `/carte`) pour ne pas alourdir le reste de l'app.
