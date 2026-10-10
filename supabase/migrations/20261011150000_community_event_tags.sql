-- POURQUOI : lot 9a, Uriel (11/10/2026) : une affiche absente montre l'icône de sa catégorie,
-- étouffée, sur un fond de sa couleur. Le fil et « Où vous vous croiserez » rendent donc aussi les
-- catégories du festival (`event_tags`). Le type de retour change : DROP puis CREATE, définitions
-- reprises de 20261011140000 (source propre), droits remis à l'identique.

DROP FUNCTION public.community_feed(uuid);
DROP FUNCTION public.crossing_dates(uuid);

CREATE OR REPLACE FUNCTION public.community_feed(p_actor uuid)
RETURNS TABLE (
  id text, kind text, occurred_at timestamptz,
  who_id uuid, who_name text, who_avatar text, who_slug text,
  target_id uuid, target_name text, target_slug text,
  event_id uuid, event_name text, event_city text, event_department text,
  event_start date, event_end date, event_image text, event_tags text[],
  stars integer, comment text, detail text, companions jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  since timestamptz := now() - interval '30 days';
  today date := (now() AT TIME ZONE 'Europe/Paris')::date;
  reader_is_festival boolean;
BEGIN
  IF NOT coalesce(can_act_as(p_actor), false) THEN
    RAISE EXCEPTION 'community_feed: acteur non autorisé' USING ERRCODE = '42501';
  END IF;
  reader_is_festival := EXISTS (
    SELECT 1 FROM entities en WHERE en.actor_id = p_actor AND en.type = 'festival'
  );

  RETURN QUERY
  WITH followed AS (
    SELECT f.following_actor AS actor_id FROM follows f
    WHERE f.follower_actor = p_actor AND f.following_actor IS NOT NULL
      AND NOT coalesce(can_act_as(f.following_actor), false)
  ),
  lines AS (
    SELECT 'arrival:' || a.id AS line_id, 'arrival' AS line_kind, a.created_at AS at,
      a.id AS who, NULL::uuid AS target, NULL::uuid AS event,
      NULL::integer AS line_stars, NULL::text AS line_comment,
      nullif(concat_ws(', ', nullif(btrim(en.craft_type), ''), nullif(btrim(en.city), '')), '') AS line_detail,
      true AS named
    FROM actors a JOIN entities en ON en.actor_id = a.id
    WHERE en.type = 'exposant' AND a.created_at >= since
      AND NOT coalesce(can_act_as(a.id), false)
    UNION ALL
    SELECT 'going:' || p.id, 'going', p.created_at, p.actor_id, NULL, p.event_id, NULL, NULL, NULL, true
    FROM participations p JOIN events e ON e.id = p.event_id
    WHERE p.actor_id IN (SELECT actor_id FROM followed)
      AND p.status IN ('inscrit', 'confirme', 'en_cours')
      AND (p.visibility = 'public' OR (p.visibility = 'amis' AND coalesce(are_friends(p_actor, p.actor_id), false)))
      AND NOT e.is_private AND p.created_at >= since
    UNION ALL
    SELECT 'added:' || e.id, 'added', e.created_at, e.created_by_actor, NULL, e.id, NULL, NULL, NULL, true
    FROM events e
    WHERE NOT e.is_private AND e.created_at >= since
      AND (e.created_by_actor IS NULL OR NOT coalesce(can_act_as(e.created_by_actor), false))
    UNION ALL
    SELECT 'review:' || r.id, 'review', r.created_at, r.actor_id, NULL, r.event_id,
      round((r.affluence + r.organisation + r.rentabilite) / 3.0)::integer, r.comment, NULL,
      (NOT r.anonymous AND NOT reader_is_festival AND coalesce(are_friends(p_actor, r.actor_id), false))
    FROM reviews r JOIN events e ON e.id = r.event_id
    WHERE NOT e.is_private AND r.created_at >= since
      AND NOT coalesce(can_act_as(r.actor_id), false)
    UNION ALL
    SELECT 'follow:' || f.id, 'follow', f.created_at, f.follower_actor, f.following_actor, NULL, NULL, NULL, NULL, true
    FROM follows f
    WHERE f.follower_actor IN (SELECT actor_id FROM followed)
      AND f.following_actor IS NOT NULL
      AND NOT coalesce(can_act_as(f.following_actor), false)
      AND f.created_at >= since
  ),
  feed AS (
    SELECT * FROM lines ORDER BY at DESC, line_id LIMIT 80
  ),
  best AS (
    SELECT p.event_id AS event, count(DISTINCT p.actor_id)::integer AS n, min(e.start_date) AS starts
    FROM participations p JOIN events e ON e.id = p.event_id
    WHERE p.actor_id IN (SELECT actor_id FROM followed)
      AND p.status IN ('inscrit', 'confirme', 'en_cours')
      AND (p.visibility = 'public' OR (p.visibility = 'amis' AND coalesce(are_friends(p_actor, p.actor_id), false)))
      AND NOT e.is_private AND e.start_date >= today
      AND NOT EXISTS (SELECT 1 FROM participations mine WHERE mine.actor_id = p_actor AND mine.event_id = p.event_id)
    GROUP BY p.event_id
    HAVING count(DISTINCT p.actor_id) >= 2
    ORDER BY n DESC, starts, p.event_id
    LIMIT 1
  )
  SELECT f.line_id, f.line_kind, f.at,
    CASE WHEN f.named THEN f.who END,
    CASE WHEN f.named THEN btrim(ap.label) END,
    CASE WHEN f.named THEN ap.avatar_url END,
    CASE WHEN f.named THEN ap.public_slug END,
    f.target, btrim(tp.label), tp.public_slug,
    e.id, e.name, e.city, e.department, e.start_date, e.end_date, e.image_url, e.tags,
    f.line_stars, f.line_comment, f.line_detail, NULL::jsonb
  FROM feed f
  LEFT JOIN actor_public ap ON ap.actor_id = f.who
  LEFT JOIN actor_public tp ON tp.actor_id = f.target
  LEFT JOIN events e ON e.id = f.event
  UNION ALL
  SELECT 'gathering:' || b.event, 'gathering', now(),
    NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    e.id, e.name, e.city, e.department, e.start_date, e.end_date, e.image_url, e.tags,
    NULL, NULL, b.n::text,
    (SELECT jsonb_agg(c ORDER BY c->>'name') FROM (
       SELECT DISTINCT jsonb_build_object('id', ap.actor_id, 'name', btrim(ap.label), 'avatar', ap.avatar_url) AS c
       FROM participations p JOIN actor_public ap ON ap.actor_id = p.actor_id
       WHERE p.event_id = b.event AND p.actor_id IN (SELECT actor_id FROM followed)
         AND p.status IN ('inscrit', 'confirme', 'en_cours') AND (p.visibility = 'public' OR (p.visibility = 'amis' AND coalesce(are_friends(p_actor, p.actor_id), false)))
         AND btrim(ap.label) <> ''
       ORDER BY 1
       LIMIT 4
     ) four)
  FROM best b JOIN events e ON e.id = b.event
  -- Les jointures ne gardent pas l'ordre du CTE : on retrie, « Ça se rassemble » (now()) en tête.
  ORDER BY 3 DESC, 1;
END; $$;


CREATE OR REPLACE FUNCTION public.crossing_dates(p_actor uuid)
RETURNS TABLE (event_id uuid, event_name text, event_start date, event_end date, event_image text, event_tags text[], companions integer, faces jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  IF NOT coalesce(can_act_as(p_actor), false) THEN
    RAISE EXCEPTION 'crossing_dates: acteur non autorisé' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT e.id, e.name, e.start_date, e.end_date, e.image_url, e.tags, count(DISTINCT p.actor_id)::integer,
    (SELECT jsonb_agg(jsonb_build_object('id', x.actor_id, 'name', x.name, 'avatar', x.avatar_url) ORDER BY x.name)
     FROM (
       SELECT DISTINCT ap.actor_id, btrim(ap.label) AS name, ap.avatar_url
       FROM participations q JOIN actor_public ap ON ap.actor_id = q.actor_id
       WHERE q.event_id = e.id
         AND q.actor_id IN (
           SELECT f.following_actor FROM follows f
           WHERE f.follower_actor = p_actor AND NOT coalesce(can_act_as(f.following_actor), false)
         )
         AND q.status IN ('inscrit', 'confirme', 'en_cours')
         AND (q.visibility = 'public' OR (q.visibility = 'amis' AND coalesce(are_friends(p_actor, q.actor_id), false)))
         AND btrim(ap.label) <> ''
       ORDER BY 2
       LIMIT 3
     ) x)
  FROM participations mine
  JOIN events e ON e.id = mine.event_id
  JOIN participations p ON p.event_id = e.id
  WHERE mine.actor_id = p_actor
    AND mine.status IN ('inscrit', 'confirme', 'en_cours')
    AND e.start_date >= (now() AT TIME ZONE 'Europe/Paris')::date
    AND p.actor_id IN (
      SELECT f.following_actor FROM follows f
      WHERE f.follower_actor = p_actor AND NOT coalesce(can_act_as(f.following_actor), false)
    )
    AND p.status IN ('inscrit', 'confirme', 'en_cours')
    AND (p.visibility = 'public' OR (p.visibility = 'amis' AND coalesce(are_friends(p_actor, p.actor_id), false)))
  GROUP BY e.id
  ORDER BY e.start_date, e.id
  LIMIT 3;
END; $$;


REVOKE EXECUTE ON FUNCTION public.community_feed(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_feed(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.crossing_dates(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crossing_dates(uuid) TO authenticated;
