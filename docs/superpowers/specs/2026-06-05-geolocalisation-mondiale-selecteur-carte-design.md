# Géolocalisation mondiale + sélecteur de point sur carte

**Date** : 2026-06-05
**Statut** : validé (brainstorm)
**Origine** : bug terrain — ARBOR PAGAN FEST (Fribourg, Suisse) placé à Fribourg/Lorraine (France). Le géocodeur ne couvre que la France.

## Problème

1. **Géocodeur France-only.** `src/lib/geocode.ts` tape uniquement la Base Adresse Nationale (`api-adresse.data.gouv.fr`). Tout événement hors France est condamné à un mauvais placement (homonyme FR ou échec). Cas concret : ARBOR (Fribourg CH) → coords en Lorraine ; second cas trouvé : Domfront (Orne) → placé sur le Domfront de l'Oise.
2. **Désambiguïsation fragile.** Le filtre par département (`citycode.startsWith(dep)`) suppose un code à 2 chiffres. Le champ `department` est souvent saisi en toutes lettres (`"Orne (61)"`, `"Gironde"`) → le filtre ne matche rien → on prend le 1ᵉʳ résultat BAN au hasard.
3. **Aucun contrôle visuel.** À la création, le géocodage est automatique sans confirmation. À l'**édition** (`EventPage.tsx`), le formulaire ne touche **pas du tout** aux coordonnées : impossible de corriger un pin erroné depuis l'UI.

Les deux events cassés (ARBOR, Domfront) ont été corrigés à la main en base. Cette spec couvre la solution durable.

## Décisions (validées)

- **Moteur** : BAN d'abord (précision adresse FR), **Photon/komoot en secours** pour le reste du monde (gratuit, sans clé, CORS, format GeoJSON proche). Pas de Nominatim (politique d'usage trop stricte pour de l'autocomplete client).
- **UX** : la recherche d'adresse reste la voie rapide ; la carte sert à **ajuster/corriger** le pin et de filet quand la recherche échoue. Pas d'étape carte obligatoire.
- **Layout du sélecteur** : **hybride responsive** — inline déplaçable sur desktop, bottom-sheet plein écran sur mobile (PWA mobile-first, geste au pouce).
- **Existants** : on **laisse** les 77 events en place (les 2 cassés sont corrigés). Pas de re-géocodage en masse.

## Architecture

Quatre unités à responsabilité unique.

### 1. Couche géocodage — `src/lib/geocode.ts` (étendu)

On conserve les fonctions pures existantes et le pattern injectable (`fetchFn`).

- **Type `GeocodeResult`** : ajout d'un champ optionnel `country?: string` (code pays ISO, ex. `'fr'`, `'ch'`). `citycode` (INSEE) reste FR-only ; vide pour l'étranger.
- **`parsePhotonFeature(f)`** : normalise une feature Photon vers `GeocodeResult`.
  - `geometry.coordinates` = `[lng, lat]` (on inverse, comme BAN).
  - `properties` : `name`/`street` + `housenumber` → `label` ; `city` ; `postcode` ; `state` ou `county` → `department` (texte, pour l'étranger) ; `countrycode` → `country` ; pas de `citycode` ; `score` absent → dériver un score décroissant par rang.
- **`searchAddresses(q, fetchFn)`** : interroge **BAN et Photon en parallèle** (`Promise.allSettled`), normalise, fusionne, dédoublonne (clé = label normalisé + coords arrondies). Ordre : résultats BAN (FR) en tête, puis Photon. Une source en échec ne casse pas l'autre.
- **`geocodeCity(city, department, fetchFn)`** : BAN d'abord (filtré par département FR si applicable) ; si aucun résultat, fallback Photon (`q=city`, `osm_tag` localité). Retourne le meilleur.
- **`reverseGeocode(lat, lng, fetchFn)`** : *non implémenté dans ce périmètre* (différé). Documenté comme extension future. Le placement manuel n'appelle pas le reverse et **n'écrase pas** les champs texte saisis.

Endpoints Photon :
- Recherche : `https://photon.komoot.io/api/?q=<q>&limit=5`
- (Futur reverse : `https://photon.komoot.io/reverse?lat=<lat>&lon=<lng>`)

### 2. Carte de sélection — `src/components/map/PointPickerMap.tsx` (nouveau)

MapLibre GL (déjà en dépendance), réutilise le style de `src/lib/map-style.ts`.

- **Principe** : un **pin fixe au centre** de la vue, la carte glisse dessous (pas de marqueur draggable — plus robuste au pouce et au hit-testing mobile).
- **Props** : `value: { lat: number; lng: number } | null`, `onChange(coords)`, `mode: 'inline' | 'sheet'`.
- **Centre initial** : `value` s'il existe → sinon coords de la ville (via `geocodeCity`) → sinon centroïde France (`46.6, 2.2`, zoom ~5).
- **Lecture** : à la validation (mode sheet) ou en continu (mode inline, debounce sur `moveend`), `map.getCenter()` → `onChange({ lat, lng })`.
- Nettoyage MapLibre (`map.remove()`) au démontage.

### 3. Champ localisation partagé — `src/components/events/LocationField.tsx` (nouveau)

Le cœur réutilisable, consommé par les **deux** formulaires.

- **Compose** `AddressAutocomplete` + bouton **« Ajuster sur la carte »**.
- **Hybride responsive** : `inline` (carte dépliable sous le champ) sur ≥ desktop ; `sheet` (bottom-sheet plein écran avec bouton « Valider cette position ») sur mobile. Détection via media query / largeur.
- **État géré et exposé** via une valeur unique :
  ```ts
  type LocationValue = {
    address: string
    city: string
    department: string
    postcode: string
    latitude: number | null
    longitude: number | null
    geo_precision: 'precise' | 'city' | null
  }
  ```
- **Comportement** :
  - Sélection d'une suggestion d'adresse → remplit address/city/department/postcode/coords, `geo_precision = 'precise'`.
  - Édition manuelle du texte d'adresse après sélection → invalide les coords précises (comportement actuel conservé).
  - Ouverture carte + validation d'un point → met à jour `latitude/longitude`, `geo_precision = 'precise'` ; **ne modifie pas** les champs texte (city/department restent ceux saisis).
- **Props** : `value: LocationValue`, `onChange(value)`, `inputClass?`.

### 4. Branchements

- **Création — `EventForm.tsx`** : remplacer le bloc adresse de l'étape 1 par `<LocationField>`. L'état `geo` + `handleAddressSelect`/`handleAddressChange` se replient dans `LocationValue`. Le fallback `geocodeCity` à la soumission (`handleSubmit`) reste, désormais mondial.
- **Édition — `EventPage.tsx`** : ajouter `<LocationField>` au formulaire d'édition (init depuis `event.address/city/department` + `latitude/longitude/geo_precision`) et **persister** `latitude`, `longitude`, `geo_precision` dans l'objet `updates` de `handleSaveEdit`. C'est le correctif central : rendre un pin erroné corrigeable depuis l'UI.

## Flux de données

```
Recherche adresse ──► city/dept/postcode/coords, precision='precise'
        │
        └─(échec / hors couverture)─► saisie ville/dept manuelle
                                            │
Ouverture carte ──► glisse ──► Valider ──► coords mises à jour, precision='precise'
                                            (textes inchangés)
        │
Aucune adresse ni pin ──► à la soumission : geocodeCity(city, dept) ──► precision='city'
                          (BAN puis Photon)
```

## Tests (TDD)

Tout le testable vit dans `geocode.ts` (fonctions pures) → on étend `src/lib/geocode.test.ts` :
- `parsePhotonFeature` : mapping coords (inversion lng/lat), city/postcode/department/country, label avec/sans numéro.
- Fusion/dédup `searchAddresses` : BAN en tête, Photon ensuite, dédoublonnage, robustesse à une source en échec (`allSettled`).
- `geocodeCity` : fallback Photon quand BAN vide.

`PointPickerMap` et `LocationField` reposent sur MapLibre/canvas → non testables en jsdom (cf. infra de test du projet) → **vérification manuelle** : (a) corriger ARBOR depuis l'édition, (b) créer un event suisse, (c) ajuster un pin sur mobile.

## Hors périmètre (YAGNI)

- Re-géocodage en masse des 77 events existants.
- Reverse-geocoding automatique au placement manuel.
- Sélecteur de pays / restriction de couverture.

## Critères d'acceptation

1. Créer un event à Fribourg (Suisse) le place bien en Suisse (≠ France).
2. Depuis l'édition d'un event, déplacer le pin et enregistrer met à jour `latitude/longitude/geo_precision` en base et sur la carte.
3. Sur mobile, le sélecteur s'ouvre en plein écran ; sur desktop, il est inline.
4. La saisie d'un département en toutes lettres ne provoque plus de placement sur un homonyme.
5. `pnpm build` + tests `geocode.test.ts` passent.
