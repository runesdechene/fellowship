-- POURQUOI : lot 10b (11/10/2026). Les doublons de la création d'une date montrent leur affiche,
--   leurs catégories et « N exposants inscrits » (maquette 2082:2). Les participations ne se lisent
--   qu'entre amis : le compte se fait ici, en SECURITY DEFINER, sans rien ouvrir d'autre.
--   La V1 appelle aussi cette fonction : elle ignore les colonnes en plus.
-- Définition reprise entière du live ; le type de retour change, d'où le DROP.
DROP FUNCTION IF EXISTS public.search_similar_events(text, integer, double precision);

CREATE FUNCTION public.search_similar_events(
  search_name text,
  search_year integer DEFAULT NULL::integer,
  threshold double precision DEFAULT 0.25
)
 RETURNS TABLE(
   id uuid, name text, city text, department text, start_date date, end_date date,
   score double precision, image_url text, tags text[], exhibitors integer
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT e.id, e.name, e.city, e.department, e.start_date, e.end_date,
         similarity(lower(e.name), lower(search_name)) AS score,
         e.image_url, e.tags,
         (SELECT count(*)::integer
            FROM participations p
            JOIN entities en ON en.actor_id = p.actor_id
           WHERE p.event_id = e.id AND p.status IN ('inscrit', 'confirme')) AS exhibitors
  FROM events e
  WHERE e.is_private = false
    AND similarity(lower(e.name), lower(search_name)) > threshold
    AND (search_year IS NULL OR EXTRACT(YEAR FROM e.start_date) = search_year)
  ORDER BY score DESC
  LIMIT 5;
$function$;

-- Les droits d'avant, à l'identique (lus le 11/10/2026).
GRANT EXECUTE ON FUNCTION public.search_similar_events(text, integer, double precision)
  TO PUBLIC, anon, authenticated, service_role;
