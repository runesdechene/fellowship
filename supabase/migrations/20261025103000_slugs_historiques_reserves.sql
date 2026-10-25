-- POURQUOI — un slug qu'une fiche a porté circule encore (liens partagés, sites d'orgas). Sans
-- réserve, une nouvelle fiche pouvait le reprendre, et slug_actuel, qui préfère le slug actuel,
-- envoyait ces liens vers elle ; l'historique pouvait aussi changer de propriétaire. Désormais un
-- slug de l'historique reste à sa fiche. Définitions reprises de 20261025100000, appliquée ce jour.

-- Pris : porté par une autre fiche, aujourd'hui ou par le passé.
CREATE FUNCTION events_slug_taken(p_slug text, p_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM events WHERE slug = p_slug AND id <> p_id)
      OR EXISTS (SELECT 1 FROM event_slug_history WHERE slug = p_slug AND event_id <> p_id);
$$;

CREATE OR REPLACE FUNCTION events_free_slug(p_id uuid, p_name text, p_city text, p_year int)
RETURNS text LANGUAGE plpgsql STABLE AS $$
DECLARE
  base text := events_base_slug(p_name, p_year);
  city text := trim(both '-' from regexp_replace(lower(extensions.unaccent(p_city)), '[^a-z0-9]+', '-', 'g'));
  candidate text := base;
  n int := 1;
BEGIN
  IF NOT events_slug_taken(candidate, p_id) THEN RETURN candidate; END IF;
  IF city <> '' THEN base := base || '-' || city; candidate := base; END IF;
  WHILE events_slug_taken(candidate, p_id) LOOP
    n := n + 1; candidate := base || '-' || n;
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION events_set_slug() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND extract(year FROM NEW.start_date) = extract(year FROM OLD.start_date) THEN
    RETURN NEW;
  END IF;
  NEW.slug := events_free_slug(NEW.id, NEW.name, NEW.city, extract(year FROM NEW.start_date)::int);
  IF TG_OP = 'UPDATE' AND OLD.slug IS NOT NULL AND OLD.slug <> NEW.slug THEN
    INSERT INTO event_slug_history (slug, event_id) VALUES (OLD.slug, OLD.id)
      ON CONFLICT (slug) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
