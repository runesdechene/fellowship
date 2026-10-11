-- POURQUOI — relecture du lot 10b : « ORDER BY score DESC LIMIT 5 » laissait Postgres choisir
-- entre des festivals de même ressemblance (deux éditions du même nom ont le même score) : la
-- liste des doublons pouvait changer d'un appel à l'autre. Départage : l'édition la plus récente
-- d'abord, puis l'identifiant. Définition live du 11/10/2026 reprise entière ; même signature,
-- mêmes colonnes : CREATE OR REPLACE garde les droits.
CREATE OR REPLACE FUNCTION public.search_similar_events(search_name text, search_year integer DEFAULT NULL::integer, threshold double precision DEFAULT 0.25)
 RETURNS TABLE(id uuid, name text, city text, department text, start_date date, end_date date, score double precision, image_url text, tags text[], exhibitors integer)
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
  ORDER BY score DESC, e.start_date DESC, e.id
  LIMIT 5;
$function$;
