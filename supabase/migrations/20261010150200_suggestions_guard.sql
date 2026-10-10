-- POURQUOI : relecture du lot 8d (10/10/2026), vérifiée en base :
--  · sans session, can_act_as rend NULL (et non false) : « IF NOT NULL » laissait passer la garde
--    de suggestions_for. Elle est fermée à anon, mais une garde ne compte pas sur ses voisines ;
--  · des noms d'enseigne finissent par une espace (« originen2o2 ») : la raison « X y va » les
--    rendait telles quelles.
-- Définitions reprises entières de 20261010150100 (live), seules ces deux lignes changent.

CREATE OR REPLACE FUNCTION public.suggestion_candidates(p_actor uuid)
RETURNS TABLE (event_id uuid, score integer, strong boolean, reason jsonb, start_date date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH refs AS (
    SELECT e.id, e.name, e.tags, e.latitude AS lat, e.longitude AS lng, bool_or(r.reported) AS reported
    FROM (
      SELECT p.event_id, false AS reported FROM participations p
        WHERE p.actor_id = p_actor AND p.status IN ('interesse', 'inscrit', 'confirme', 'en_cours')
      UNION ALL
      SELECT er.event_id, true FROM event_reports er WHERE er.actor_id = p_actor
    ) r
    JOIN events e ON e.id = r.event_id
    GROUP BY e.id
  ),
  center AS (
    SELECT avg(lat) AS lat, avg(lng) AS lng FROM refs WHERE lat IS NOT NULL AND lng IS NOT NULL
  ),
  zone AS (
    SELECT c.lat, c.lng, greatest(100, coalesce(
      percentile_cont(0.8) WITHIN GROUP (ORDER BY km_between(c.lat, c.lng, r.lat, r.lng)), 0
    )) AS radius
    FROM center c LEFT JOIN refs r ON r.lat IS NOT NULL AND r.lng IS NOT NULL
    GROUP BY c.lat, c.lng
  ),
  home AS (
    SELECT department_code(coalesce(en.department, u.department)) AS code
    FROM actors a
    LEFT JOIN entities en ON en.actor_id = a.id
    LEFT JOIN users u ON u.actor_id = a.id
    WHERE a.id = p_actor
  ),
  candidates AS (
    SELECT e.* FROM events e
    WHERE NOT e.is_private
      AND e.start_date BETWEEN (now() AT TIME ZONE 'Europe/Paris')::date
                           AND (now() AT TIME ZONE 'Europe/Paris')::date + interval '12 months'
      AND NOT EXISTS (SELECT 1 FROM participations p WHERE p.actor_id = p_actor AND p.event_id = e.id)
      AND NOT EXISTS (SELECT 1 FROM event_reports er WHERE er.actor_id = p_actor AND er.event_id = e.id)
      AND NOT EXISTS (SELECT 1 FROM suggestion_dismissals s WHERE s.actor_id = p_actor AND s.event_id = e.id)
  ),
  alike AS (
    SELECT DISTINCT ON (c.id) c.id, r.name AS ref_name,
      cardinality(ARRAY(SELECT unnest(c.tags) INTERSECT SELECT unnest(r.tags)))
        * CASE WHEN r.reported THEN 2 ELSE 1 END AS points
    FROM candidates c JOIN refs r ON c.tags && r.tags
    ORDER BY c.id, points DESC, r.name
  ),
  reported_match AS (
    SELECT DISTINCT c.id FROM candidates c JOIN refs r ON r.reported AND c.tags && r.tags
  ),
  friendly AS (
    SELECT p.event_id AS id, count(DISTINCT p.actor_id)::integer AS n,
      (array_agg(btrim(ap.label) ORDER BY btrim(ap.label)))[1] AS first_name
    FROM friends f
    JOIN participations p ON p.actor_id = f.friend_id
    JOIN actor_public ap ON ap.actor_id = f.friend_id
    WHERE f.user_id = p_actor
      AND p.status IN ('inscrit', 'confirme', 'en_cours')
      AND p.visibility IN ('amis', 'public')
      AND btrim(ap.label) <> ''
    GROUP BY p.event_id
  ),
  scored AS (
    SELECT c.id, c.start_date,
      coalesce(s.points, 0) AS universe,
      coalesce(fr.n, 0) AS friends,
      (z.lat IS NOT NULL AND c.latitude IS NOT NULL AND c.longitude IS NOT NULL
        AND km_between(z.lat, z.lng, c.latitude, c.longitude) <= z.radius) AS in_zone,
      (h.code IS NOT NULL AND department_code(c.department) = h.code) AS in_home,
      s.ref_name, fr.first_name, rm.id IS NOT NULL AS reported_match
    FROM candidates c
    CROSS JOIN zone z
    CROSS JOIN home h
    LEFT JOIN alike s ON s.id = c.id
    LEFT JOIN friendly fr ON fr.id = c.id
    LEFT JOIN reported_match rm ON rm.id = c.id
  )
  SELECT id,
    universe * 10 + friends * 25 + CASE WHEN in_home THEN 1 ELSE 0 END,
    universe > 0 AND in_zone AND (friends > 0 OR reported_match),
    CASE
      WHEN friends > 0 THEN jsonb_build_object('kind', 'friends', 'friend_name', first_name, 'others', friends - 1)
      WHEN universe > 0 THEN jsonb_build_object('kind', 'similar', 'ref_name', ref_name)
      ELSE jsonb_build_object('kind', 'near')
    END,
    start_date
  FROM scored
  WHERE friends > 0
     OR (universe > 0 AND in_zone)
     OR (NOT EXISTS (SELECT 1 FROM refs) AND in_home)
$$;

CREATE OR REPLACE FUNCTION public.suggestions_for(p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  found integer;
  is_pro boolean;
  items jsonb;
BEGIN
  IF NOT coalesce(can_act_as(p_actor), false) THEN
    RAISE EXCEPTION 'suggestions_for: acteur non autorisé' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO found FROM suggestion_candidates(p_actor);
  SELECT coalesce(bool_or(en.plan = 'pro' OR en.comped_pro_until > now()), false) INTO is_pro
    FROM entities en WHERE en.actor_id = p_actor;
  IF NOT is_pro THEN
    RETURN jsonb_build_object('count', found, 'items', '[]'::jsonb);
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'event_id', e.id, 'name', e.name, 'city', e.city,
      'start_date', e.start_date, 'end_date', e.end_date,
      'image_url', e.image_url, 'reason', best.reason
    ) ORDER BY best.score DESC, best.start_date, e.id), '[]'::jsonb)
  INTO items
  FROM (
    SELECT * FROM suggestion_candidates(p_actor)
    ORDER BY score DESC, start_date, event_id
    LIMIT 3
  ) best
  JOIN events e ON e.id = best.event_id;

  RETURN jsonb_build_object('count', found, 'items', items);
END; $$;
