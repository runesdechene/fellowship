-- Fuzzy search for event deduplication using pg_trgm
CREATE OR REPLACE FUNCTION search_similar_events(
  search_name text,
  search_year int DEFAULT NULL,
  threshold float DEFAULT 0.25
)
RETURNS TABLE(
  id uuid,
  name text,
  city text,
  department text,
  start_date date,
  end_date date,
  score float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.name,
    e.city,
    e.department,
    e.start_date,
    e.end_date,
    similarity(lower(e.name), lower(search_name)) AS score
  FROM events e
  WHERE similarity(lower(e.name), lower(search_name)) > threshold
    AND (search_year IS NULL OR EXTRACT(YEAR FROM e.start_date) = search_year)
  ORDER BY score DESC
  LIMIT 5;
$$;
