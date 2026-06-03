# Slugs d'événements — liens partageables `/e/nom-du-festival`

- **Date :** 2026-06-02
- **Participants :** Uriel (CEO) · Claude (XO)
- **Statut :** `validé` (décisions prises, prêt pour plan)
- **Lié à :** [ShareModal](2026-06-02-bilan-enrichi-mes-bilans-design.md) (partage), modèle vitrine `flw.sh/@slug`.

## Objectif

Remplacer les liens d'événement laids (`/evenement/<uuid>`) par des liens **propres et
partageables** : `flw.sh/e/foire-medievale-de-provins`. Améliore le partage (mémorisable,
pro, inspire confiance) sans casser les liens existants.

## Décisions (cette session)

1. **Format du slug = nom + ville**, en kebab sans accents : `slugify(name)-slugify(city)`
   (ex. `foire-medievale-de-provins`). Quasi pas de collisions ; suffixe `-2`, `-3`… seulement
   en dernier recours. **La ville n'est ajoutée que si elle n'est PAS déjà dans le titre**
   (match par segments entiers — évite `medievale-brignoles-brignoles`). Cf. migration
   `20260603120000_event_slug_dedupe_city.sql`.
2. **Slug figé à la création** : généré une fois, ne change JAMAIS, même si le festival est
   renommé. Les liens partagés restent valides à vie. (Pas de redirection de vieux slugs à gérer.)
3. **Nouvelle route `/e/:slug`** qui résout vers l'événement. **`/evenement/:uuid` conservée**
   (back-compat : QR, embeds et liens déjà partagés continuent de marcher).
4. **Lien canonique = `window.location.origin` + `/e/{slug}`** → devient `flw.sh/e/…` en prod
   si flw.sh sert l'app (robuste : marche sur n'importe quel domaine).

## Réalités data (vérifiées)

- `events` **n'a PAS de colonne slug** (seuls `tags` et `entities.public_slug` en ont).
- `flw.sh` est déjà câblé comme **domaine court** dans le code (Embed, QRCode, vitrines
  `flw.sh/@slug`, et `flw.sh/evenement/…` dans Embed.tsx). → Dépendance ops : flw.sh doit
  pointer sur le déploiement Netlify pour que le branding « flw.sh » soit réel (sinon le lien
  est juste `<domaine-actuel>/e/slug`, fonctionnel mais pas brandé).
- Route actuelle : `/evenement/:id` (App.tsx) ; `EventPage` charge l'événement par l'`id` UUID.
- `FeedEventRef` (`src/lib/community.ts`) — utilisé par les convergences — ne porte PAS le slug
  (id/name/city/startDate/endDate/imageUrl). À étendre pour le partage côté Compagnons.

## Données

### Migration `events.slug`
```sql
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

ALTER TABLE events ADD COLUMN IF NOT EXISTS slug TEXT;

-- Génère un slug de base "nom-ville" sans accents, alphanumérique + tirets.
CREATE OR REPLACE FUNCTION events_base_slug(p_name text, p_city text)
RETURNS text LANGUAGE sql STABLE AS $$  -- STABLE (pas IMMUTABLE) : unaccent() est STABLE
  SELECT trim(both '-' from regexp_replace(
    lower(extensions.unaccent(coalesce(p_name,'') || '-' || coalesce(p_city,''))),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

-- Avant insert : si slug NULL, génère un slug unique (suffixe -2, -3… si collision).
CREATE OR REPLACE FUNCTION events_set_slug() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE base text; candidate text; n int := 1;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN RETURN NEW; END IF;
  base := events_base_slug(NEW.name, NEW.city);
  IF base = '' THEN base := 'festival'; END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM events WHERE slug = candidate AND id <> NEW.id) LOOP
    n := n + 1; candidate := base || '-' || n;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_events_set_slug BEFORE INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION events_set_slug();

-- Backfill des événements existants (slug NULL), du plus ancien au plus récent pour
-- une numérotation déterministe en cas de collision.
DO $$
DECLARE r record; base text; candidate text; n int;
BEGIN
  FOR r IN SELECT id, name, city FROM events WHERE slug IS NULL ORDER BY created_at LOOP
    base := events_base_slug(r.name, r.city);
    IF base = '' THEN base := 'festival'; END IF;
    candidate := base; n := 1;
    WHILE EXISTS (SELECT 1 FROM events WHERE slug = candidate) LOOP
      n := n + 1; candidate := base || '-' || n;
    END LOOP;
    UPDATE events SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
```
Slug **stable** : le trigger ne se déclenche qu'à l'INSERT (pas à l'UPDATE) → un renommage ne
change pas le slug. La colonne reste nullable au niveau type (back-compat), mais en pratique
tout événement en aura un (trigger + backfill).

## Routing

- **`/e/:slug`** (App.tsx) → résout le slug en événement et rend `EventPage`.
- `EventPage` accepte désormais soit `:id` (route `/evenement/:id`) soit `:slug` (route
  `/e/:slug`) : si `slug`, charger l'événement via `.eq('slug', slug)` ; sinon via `.eq('id', id)`.
- `/evenement/:id` reste intacte. Comme l'EventPage vit dans `AuthenticatedApp` (AppLayout),
  le route-guard d'AppLayout doit accepter `/e/...` : ajouter **`/e/` à `SHARED_PREFIXES`**
  (comme `/evenement`) **et** **`e` à `RESERVED_TOP`** dans `navModel.ts` (pour ne pas prendre
  `/e/...` pour une vitrine `/:slug`). ⚠️ utiliser le préfixe `/e/` (avec le slash final), PAS
  `/e` — sinon `startsWith('/e')` matcherait aussi `/explorer`, `/evenement`… (cf. mémoire
  `reference_applayout_route_guard`).

## Liens partagés

- `ShareModal` consumers : construire `${window.location.origin}/e/${slug}`.
  - **Prochain festival** : `ev.slug` (dispo après migration + régénération des types).
  - **Convergences (Compagnons)** : ajouter `slug` à `FeedEventRef` + au `select` events de
    `use-community.ts` + au mapping, pour disposer du slug.
- Liens internes de navigation (cartes, listes) : peuvent rester sur `/evenement/:id` (interne,
  pas besoin d'être jolis) — on ne change QUE les liens **partagés** en V1 pour limiter le diff.
  (Bascule générale `/e/:slug` partout = amélioration ultérieure.)

## Architecture / découpage

- 1 migration DB (`unaccent` + colonne + fonctions + trigger + backfill + index unique).
- `src/lib/event-link.ts` (pur, testé) : `eventShareUrl(slug, origin)` → `${origin}/e/${slug}`,
  + éventuel `slugify` côté client si besoin (sinon tout est DB).
- `App.tsx` : route `/e/:slug`. `navModel.ts` : `e` dans `RESERVED_TOP`.
- `EventPage` : résoudre par slug OU id.
- `use-community.ts` + `community.ts` : slug dans `FeedEventRef`.
- `ProchainFestival` / `CompagnonsDeRoute` : lien de partage en `/e/{slug}`.
- Types régénérés (events.slug).

## Tests (TDD — pur)

- `eventShareUrl(slug, origin)` → URL propre.
- (La génération du slug est en SQL ; testée par l'observation du backfill en prod + un cas
  manuel. La logique JS testable reste `eventShareUrl`.)

## Explicitement différé

- Bascule de TOUS les liens internes vers `/e/:slug` (V1 = liens partagés uniquement).
- Redirections de vieux slugs après renommage (inutile : slug figé).
- Configuration DNS de `flw.sh` (ops, hors code) — à confirmer.

## Risque / dépendance

- **Migration prod** (additive : colonne + fonctions + trigger + backfill + index). Sous ton
  contrôle, comme pour les bilans (cf. [[reference_supabase_cli]] push non-interactif).
- **`unaccent`** : extension Postgres à activer (dispo sur Supabase).
- **flw.sh** : le branding « flw.sh » suppose que le domaine sert l'app — à confirmer.
