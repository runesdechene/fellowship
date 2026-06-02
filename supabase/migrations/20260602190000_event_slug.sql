-- Slugs d'événements : nom-ville, figés à la création.
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

ALTER TABLE events ADD COLUMN IF NOT EXISTS slug TEXT;

-- Slug de base "nom-ville" sans accents, alphanumérique + tirets.
-- STABLE (pas IMMUTABLE) car unaccent() est STABLE ; on ne l'utilise PAS dans un index.
CREATE OR REPLACE FUNCTION events_base_slug(p_name text, p_city text)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT trim(both '-' from regexp_replace(
    lower(extensions.unaccent(coalesce(p_name, '') || '-' || coalesce(p_city, ''))),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

-- BEFORE INSERT : remplit slug s'il est vide, en garantissant l'unicité (-2, -3…).
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

DROP TRIGGER IF EXISTS trg_events_set_slug ON events;
CREATE TRIGGER trg_events_set_slug BEFORE INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION events_set_slug();

-- Backfill déterministe (du plus ancien au plus récent).
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
