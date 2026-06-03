-- Slug d'événement : n'ajouter la ville que si elle n'est PAS déjà dans le titre.
-- (Évite "medievale-brignoles-brignoles".) Match par segments entiers pour ne pas
-- qu'une ville "arles" matche un titre contenant "charles".

CREATE OR REPLACE FUNCTION events_base_slug(p_name text, p_city text)
RETURNS text LANGUAGE sql STABLE AS $$
  WITH s AS (
    SELECT
      trim(both '-' from regexp_replace(lower(extensions.unaccent(coalesce(p_name, ''))), '[^a-z0-9]+', '-', 'g')) AS name_slug,
      trim(both '-' from regexp_replace(lower(extensions.unaccent(coalesce(p_city, ''))), '[^a-z0-9]+', '-', 'g')) AS city_slug
  )
  SELECT CASE
    WHEN city_slug = '' THEN name_slug
    -- ville déjà présente dans le titre (segments entiers) → on ne la répète pas
    WHEN ('-' || name_slug || '-') LIKE ('%-' || city_slug || '-%') THEN name_slug
    WHEN name_slug = '' THEN city_slug
    ELSE name_slug || '-' || city_slug
  END
  FROM s;
$$;

-- Re-génère TOUS les slugs avec la nouvelle règle (one-time : slugs créés aujourd'hui,
-- pas encore partagés). On repart de zéro pour recalculer l'unicité globale proprement.
DO $$
DECLARE r record; base text; candidate text; n int;
BEGIN
  UPDATE events SET slug = NULL;
  FOR r IN SELECT id, name, city FROM events ORDER BY created_at LOOP
    base := events_base_slug(r.name, r.city);
    IF base = '' THEN base := 'festival'; END IF;
    candidate := base; n := 1;
    WHILE EXISTS (SELECT 1 FROM events WHERE slug = candidate) LOOP
      n := n + 1; candidate := base || '-' || n;
    END LOOP;
    UPDATE events SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;
