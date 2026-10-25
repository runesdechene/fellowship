-- POURQUOI — les liens des fiches doivent se lire (« /evenements/fenrir-2027 ») : des orgas se
-- plaignent de partager une adresse illisible. Spec : docs/superpowers/specs/2026-10-23-fiches-pour-google-design.md
--
-- Le slug devient « nom-année » (la ville seulement en cas de collision, puis -2, -3…).
-- Il ne suit pas le nom, mais suit l'année de start_date. Tout slug qu'une fiche a porté reste
-- dans event_slug_history, pour qu'aucun lien déjà partagé ne casse.
--
-- Les fiches privées suivent la même règle (régénération : 20261025110000) ; leur suffixe aléatoire
-- servait de clé au modèle « par lien »,
-- mort depuis 20261019120000 (la base ferme une fiche privée à tout autre que son créateur).

-- 1. L'historique des slugs : se lit exactement comme la fiche qu'il désigne (RLS d'events).
CREATE TABLE event_slug_history (
  slug        text PRIMARY KEY,
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  replaced_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE event_slug_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY event_slug_history_select ON event_slug_history FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id));
GRANT SELECT ON event_slug_history TO anon, authenticated;

-- 2. La base « nom-année », sans doubler une année déjà à la fin du nom (« Fenrir 2027 »).
DROP FUNCTION events_base_slug(text, text);
CREATE FUNCTION events_base_slug(p_name text, p_year int)
RETURNS text LANGUAGE sql STABLE AS $$
  WITH s AS (
    SELECT trim(both '-' from regexp_replace(lower(extensions.unaccent(p_name)), '[^a-z0-9]+', '-', 'g')) AS n
  )
  SELECT CASE
    WHEN n = '' THEN 'festival-' || p_year
    WHEN n ~ ('(^|-)' || p_year || '$') THEN n
    ELSE n || '-' || p_year
  END
  FROM s;
$$;

-- 3. Le premier slug libre : la base, sinon base-ville, sinon base-ville-2, -3…
CREATE FUNCTION events_free_slug(p_id uuid, p_name text, p_city text, p_year int)
RETURNS text LANGUAGE plpgsql STABLE AS $$
DECLARE
  base text := events_base_slug(p_name, p_year);
  city text := trim(both '-' from regexp_replace(lower(extensions.unaccent(p_city)), '[^a-z0-9]+', '-', 'g'));
  candidate text := base;
  n int := 1;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM events WHERE slug = candidate AND id <> p_id) THEN RETURN candidate; END IF;
  IF city <> '' THEN base := base || '-' || city; candidate := base; END IF;
  WHILE EXISTS (SELECT 1 FROM events WHERE slug = candidate AND id <> p_id) LOOP
    n := n + 1; candidate := base || '-' || n;
  END LOOP;
  RETURN candidate;
END;
$$;

-- 4. Le trigger : slug posé à la création, recalculé quand l'année de start_date change.
-- SECURITY DEFINER : il doit voir les slugs des fiches privées des autres (sinon l'index unique
-- casse l'insertion) et écrire dans l'historique, que personne n'écrit directement.
CREATE OR REPLACE FUNCTION events_set_slug() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND extract(year FROM NEW.start_date) = extract(year FROM OLD.start_date) THEN
    RETURN NEW;
  END IF;
  NEW.slug := events_free_slug(NEW.id, NEW.name, NEW.city, extract(year FROM NEW.start_date)::int);
  IF TG_OP = 'UPDATE' AND OLD.slug IS NOT NULL AND OLD.slug <> NEW.slug THEN
    INSERT INTO event_slug_history (slug, event_id) VALUES (OLD.slug, OLD.id)
      ON CONFLICT (slug) DO UPDATE SET event_id = EXCLUDED.event_id, replaced_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER trg_events_set_slug ON events;
CREATE TRIGGER trg_events_set_slug BEFORE INSERT OR UPDATE OF start_date ON events
  FOR EACH ROW EXECUTE FUNCTION events_set_slug();

-- 5. Le slug actuel d'une fiche, trouvée par son slug actuel, un ancien slug ou son id.
-- SECURITY INVOKER : la RLS d'events décide (anon : fiches publiques ; le créateur : les siennes).
CREATE FUNCTION slug_actuel(p_slug text) RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT e.slug FROM events e
  WHERE e.slug = p_slug
     OR e.id = (SELECT h.event_id FROM event_slug_history h WHERE h.slug = p_slug)
     OR e.id::text = p_slug
  ORDER BY (e.slug = p_slug) DESC
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION slug_actuel(text) TO anon, authenticated;
