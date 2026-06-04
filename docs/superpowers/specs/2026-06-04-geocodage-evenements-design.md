# Géocodage des événements — design

**Date :** 2026-06-04
**Statut :** validé (brainstorming)
**Objectif nord :** doter chaque événement de coordonnées `(lat, lng)` pour, à terme, afficher une **carte des événements** dans l'app.

## Contexte

La table `events` ne stocke aujourd'hui que `city` (texte, requis) et `department` (ex. `"77"`, requis). Aucune adresse rue, aucun lieu précis, aucune coordonnée. Le formulaire de création (`EventForm.tsx`, étape « Lieu ») ne saisit que ville + département en texte libre. Le champ `location` libre existe seulement sur `entities` (vitrine exposant), pas sur les événements.

On part donc quasiment de zéro côté géo pour les événements. Ce lot pose les fondations : **récupérer et stocker les coordonnées**. Le rendu de carte est hors scope (voir « Hors scope »).

## Décisions validées

1. **Précision : les deux.** Coordonnée précise de l'adresse quand l'organisateur la saisit, sinon fallback centre-ville depuis `city` + `department`.
2. **Géocodeur : BAN** (`api-adresse.data.gouv.fr`, Base Adresse Nationale). Gratuit, sans clé API, sans quota, autorise le stockage des coordonnées, CORS ouvert (appelable depuis le navigateur). Couvre la France uniquement — cohérent avec une app France-centric (départements FR). Aligné sur la philosophie « sans clé, sans coût » du stack carto maison (MapLibre + OpenFreeMap, réutilisé plus tard pour le rendu).
3. **Capture nouveaux events : autocomplete BAN dès maintenant.** Quand l'organisateur choisit une suggestion, BAN renvoie directement les coordonnées → le géocodage se fait pendant la saisie, pas de second appel.
4. **`geo_precision` à 2 valeurs** (`precise` / `city`) — permet à la future carte de distinguer un pin exact d'un « à peu près » (centre-ville).
5. **Adresse optionnelle** — l'orga peut ne saisir que la ville ; on retombe sur le centre-ville.
6. **Backfill de l'existant inclus dans ce lot.**

## Architecture

Quatre briques, du plus stable au plus visuel.

### 1. Modèle de données

Migration additive et rétrocompatible sur `events` (colonnes nullable, ignorées par le code existant) :

| Colonne | Type | Rôle |
|---|---|---|
| `latitude` | `double precision` | coordonnée, `null` tant que non géocodé |
| `longitude` | `double precision` | coordonnée |
| `geo_precision` | `text` `CHECK (geo_precision IN ('precise','city'))` | pin exact (adresse) vs centre-ville (fallback) |
| `address` | `text` | libellé BAN choisi (« 12 rue X, 75001 Paris »), `null` si saisie minimale |

`city` / `department` restent **requis et inchangés** ; BAN les remplit automatiquement quand l'orga choisit une adresse. Pas d'index géo pour l'instant (volume faible, YAGNI) ; à ajouter quand la requête carte « events dans cette zone » existera.

### 2. Client BAN — `src/lib/geocode.ts`

Module mince, **fonctions pures + un fetch isolé**, testable :

- `searchAddresses(q: string): Promise<GeocodeResult[]>`
  `GET https://api-adresse.data.gouv.fr/search/?q={q}&limit=5`
  → parse les `features` GeoJSON en `{ label, city, postcode, citycode, lat, lng, score }`.
- `geocodeCity(city: string, department: string): Promise<GeocodeResult | null>`
  Fallback centre-ville : `search/?q={city}&type=municipality&limit=5`, puis **filtre les résultats dont `citycode` commence par `department`** (désambiguïse les villes homonymes : `citycode` = code INSEE dont les 2 premiers chiffres = département). Renvoie le meilleur match restant ou `null`.

Le parsing GeoJSON → `GeocodeResult` et le filtre `citycode → department` sont des **fonctions pures** extraites (`parseBanFeature`, `filterByDepartment`) → testées sans réseau.

Type `GeocodeResult` :
```ts
type GeocodeResult = {
  label: string        // properties.label
  city: string         // properties.city
  postcode: string     // properties.postcode
  citycode: string     // properties.citycode (INSEE)
  lat: number          // geometry.coordinates[1]
  lng: number          // geometry.coordinates[0]
  score: number        // properties.score
}
```
> ⚠️ BAN renvoie les coordonnées en `[lng, lat]` (ordre GeoJSON). Le parsing inverse explicitement.

### 3. Capture dans le formulaire — `AddressAutocomplete.tsx`

Nouveau composant `src/components/events/AddressAutocomplete.tsx` :

- input + dropdown de suggestions, **débouncé** (~300 ms, ≥ 3 caractères), stylé aux tokens DA du projet (cohérent avec les inputs existants du form).
- À la sélection d'une suggestion : remonte au parent `{ address, lat, lng, city, department, postcode, precision: 'precise' }`. Le `department` se dérive des 2 premiers chiffres du `citycode`.
- L'orga peut ignorer le champ et ne remplir que la ville (champ ville conservé).

Intégration dans `EventForm.tsx` (étape « Lieu ») :

- Le state du form gagne `address`, `latitude`, `longitude`, `geo_precision`.
- **Au submit** (`handleSubmit`) : si `geo_precision !== 'precise'` mais `city` + `department` présents → appel `geocodeCity()` → `geo_precision = 'city'` (ou `null` si BAN ne renvoie rien, non bloquant). Résultat : un event a quasi toujours des coordonnées.
- `EventInsert` (`src/types/database` + `src/types/supabase.ts`) gagne les 4 colonnes ; `createEvent` les passe telles quelles.

### 4. Backfill de l'existant — `scripts/backfill-geocode.mts`

Script one-shot Node (TS), clé **service-role** lue depuis `.env` :

1. `select` des events où `latitude is null`.
2. Pour chaque : `geocodeCity(city, department)` (volume faible → boucle ligne à ligne, suffisant ; endpoint CSV bulk de BAN en option si le volume grossit).
3. `update events set latitude, longitude, geo_precision = 'city'`.

Lancé **manuellement une fois**. Idempotent (ne touche que les lignes sans coords).

## Flux de données

```
Création event (form)
  orga tape une adresse → searchAddresses() [BAN] → dropdown
  orga choisit          → lat/lng/city/dept/postcode remplis, precision='precise'
  orga ignore l'adresse → au submit: geocodeCity(city,dept) [BAN] → precision='city'
  createEvent(EventInsert + lat/lng/address/geo_precision) → DB

Backfill (one-shot)
  events sans coords → geocodeCity() [BAN] → update precision='city'

(plus tard) Carte
  select events where latitude is not null → pins MapLibre, halo si geo_precision='city'
```

## Gestion d'erreurs

- BAN indisponible / timeout pendant l'autocomplete → dropdown vide, l'orga continue avec ville seule (dégradation douce, non bloquante).
- `geocodeCity()` au submit échoue ou ne renvoie rien → event créé **sans coords** (`latitude null`), jamais de blocage de la création. Le backfill pourra repasser.
- Réponse BAN sans feature → `[]` / `null`, jamais d'exception remontée à l'UI.

## Tests (TDD)

Fonctions pures de `geocode.ts`, pattern test pur du projet (pas de `render()` RTL) :

- `parseBanFeature` : feature GeoJSON BAN → `GeocodeResult`, **ordre `[lng, lat]` correctement inversé**.
- `filterByDepartment` : liste de résultats + `"77"` → ne garde que les `citycode` préfixés `77`, trie par score.
- `geocodeCity` : ville homonyme sur 2 départements → renvoie le bon ; aucun match → `null`.
- Fetch BAN mocké pour les fonctions async.

## Hors scope (explicitement)

- **Rendu de la carte** (MapLibre GL JS + tuiles OpenFreeMap/Esri, halo `geo_precision`) — lot suivant. Le stack carto maison « sans clé / sans coût » est connu et sera réutilisé.
- Autocomplete dans **AdminEvents** : si l'admin crée des events hors formulaire, ils naissent sans coords → rattrapés par le backfill (acceptable). À recâbler plus tard si besoin.
- Index géospatial / requêtes par zone (arrivent avec la carte).
- International (BAN = France seulement).

## Fichiers touchés

**Nouveaux**
- `supabase/migrations/<ts>_events_geocoding.sql`
- `src/lib/geocode.ts`
- `src/lib/geocode.test.ts`
- `src/components/events/AddressAutocomplete.tsx`
- `scripts/backfill-geocode.mts`

**Édités**
- `src/components/events/EventForm.tsx` (étape Lieu + state + submit fallback)
- `src/types/database.ts` / `src/types/supabase.ts` (4 colonnes sur `events`)
- `src/hooks/use-events.ts` (`createEvent` passe les nouveaux champs)
