-- POURQUOI : lot 9a, Uriel (11/10/2026) : « Où vous vous croiserez » montre les visages des
-- compagnons en petites bulles, pas seulement leur nombre. crossing_dates rend en plus `faces`
-- (3 au plus, même règle de visibilité que le compte). Le type de retour change : DROP puis
-- CREATE (aucune dépendance), droits remis à l'identique.

DROP FUNCTION public.crossing_dates(uuid);

CREATE OR REPLACE FUNCTION public.crossing_dates(p_actor uuid)
 RETURNS TABLE(event_id uuid, event_name text, event_start date, event_end date, event_image text, companions integer, faces jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
BEGIN
  IF NOT coalesce(can_act_as(p_actor), false) THEN
    RAISE EXCEPTION 'crossing_dates: acteur non autorisÃ©' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT e.id, e.name, e.start_date, e.end_date, e.image_url, count(DISTINCT p.actor_id)::integer,
    (SELECT jsonb_agg(c ORDER BY c->>'name') FROM (
       SELECT DISTINCT jsonb_build_object('id', ap.actor_id, 'name', btrim(ap.label), 'avatar', ap.avatar_url) AS c
       FROM participations q JOIN actor_public ap ON ap.actor_id = q.actor_id
       WHERE q.event_id = e.id
         AND q.actor_id IN (SELECT f.following_actor FROM follows f WHERE f.follower_actor = p_actor)
         AND q.status IN ('inscrit', 'confirme', 'en_cours')
         AND (q.visibility = 'public' OR (q.visibility = 'amis' AND coalesce(are_friends(p_actor, q.actor_id), false)))
         AND btrim(ap.label) <> ''
       LIMIT 3
     ) three)
  FROM participations mine
  JOIN events e ON e.id = mine.event_id
  JOIN participations p ON p.event_id = e.id
  WHERE mine.actor_id = p_actor
    AND mine.status IN ('inscrit', 'confirme', 'en_cours')
    AND e.start_date >= (now() AT TIME ZONE 'Europe/Paris')::date
    AND p.actor_id IN (SELECT f.following_actor FROM follows f WHERE f.follower_actor = p_actor)
    AND p.status IN ('inscrit', 'confirme', 'en_cours')
    AND (p.visibility = 'public' OR (p.visibility = 'amis' AND coalesce(are_friends(p_actor, p.actor_id), false)))
  GROUP BY e.id
  ORDER BY e.start_date, e.id
  LIMIT 3;
END; $function$;

REVOKE EXECUTE ON FUNCTION public.crossing_dates(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crossing_dates(uuid) TO authenticated;
