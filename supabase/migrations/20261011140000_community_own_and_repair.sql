-- POURQUOI : relecture du lot 9a (11/10/2026), et une réparation.
--  · Ses propres enseignes n'étaient pas exclues des comptes « suivis » : une personne qui suit sa
--    boutique voyait « Runes de Chêne va à … », sa boutique comptait comme compagnon, et « À
--    suivre » pouvait dire « suivi par Runes de Chêne ». Les CTE « suivis » écartent can_act_as.
--  · Les deux versions précédentes de community_feed et crossing_dates avaient été recopiées depuis
--    la base par un tuyau qui a abîmé les accents (un « é » devenu deux caractères) : les trois
--    fonctions sont reconstruites ici depuis la source du dépôt (20261011090000), avec toutes les
--    corrections depuis : amis seulement (20261011100000), tri final (20261011120000), visages
--    des compagnons (20261011130000) — compagnons triés AVANT la coupe.

CREATE OR REPLACE FUNCTION public.community_feed(p_actor uuid)
RETURNS TABLE (
  id text, kind text, occurred_at timestamptz,
  who_id uuid, who_name text, who_avatar text, who_slug text,
  target_id uuid, target_name text, target_slug text,
  event_id uuid, event_name text, event_city text, event_department text,
  event_start date, event_end date, event_image text,
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
    e.id, e.name, e.city, e.department, e.start_date, e.end_date, e.image_url,
    f.line_stars, f.line_comment, f.line_detail, NULL::jsonb
  FROM feed f
  LEFT JOIN actor_public ap ON ap.actor_id = f.who
  LEFT JOIN actor_public tp ON tp.actor_id = f.target
  LEFT JOIN events e ON e.id = f.event
  UNION ALL
  SELECT 'gathering:' || b.event, 'gathering', now(),
    NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    e.id, e.name, e.city, e.department, e.start_date, e.end_date, e.image_url,
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

DROP FUNCTION public.crossing_dates(uuid);

CREATE OR REPLACE FUNCTION public.crossing_dates(p_actor uuid)
RETURNS TABLE (event_id uuid, event_name text, event_start date, event_end date, event_image text, companions integer, faces jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  IF NOT coalesce(can_act_as(p_actor), false) THEN
    RAISE EXCEPTION 'crossing_dates: acteur non autorisé' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT e.id, e.name, e.start_date, e.end_date, e.image_url, count(DISTINCT p.actor_id)::integer,
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

CREATE OR REPLACE FUNCTION public.accounts_to_follow(p_actor uuid)
RETURNS TABLE (id uuid, name text, avatar text, slug text, city text, reason jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  IF NOT coalesce(can_act_as(p_actor), false) THEN
    RAISE EXCEPTION 'accounts_to_follow: acteur non autorisé' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH followed AS (
    SELECT f.following_actor AS actor_id FROM follows f
    WHERE f.follower_actor = p_actor AND f.following_actor IS NOT NULL
      AND NOT coalesce(can_act_as(f.following_actor), false)
  ),
  home AS (
    SELECT department_code(coalesce(en.department, u.department)) AS code
    FROM actors a
    LEFT JOIN entities en ON en.actor_id = a.id
    LEFT JOIN users u ON u.actor_id = a.id
    WHERE a.id = p_actor
  ),
  by_follow AS (
    SELECT f.following_actor AS candidate, count(*)::integer AS n,
      (array_agg(btrim(ap.label) ORDER BY btrim(ap.label)))[1] AS first_name
    FROM follows f JOIN actor_public ap ON ap.actor_id = f.follower_actor
    WHERE f.follower_actor IN (SELECT actor_id FROM followed)
      AND f.following_actor IS NOT NULL AND btrim(ap.label) <> ''
    GROUP BY f.following_actor
  ),
  pool AS (
    SELECT candidate, 1 AS rank, n AS weight,
      jsonb_build_object('kind', 'followed_by', 'name', first_name, 'others', n - 1) AS why
    FROM by_follow
    UNION ALL
    SELECT s.suggested_actor, 2, s.shared_events::integer,
      jsonb_build_object('kind', 'shared_dates', 'count', s.shared_events)
    FROM get_coevent_suggestions(p_actor) s
    UNION ALL
    SELECT a.id, 3, 0, jsonb_build_object('kind', 'nearby')
    FROM actors a JOIN entities en ON en.actor_id = a.id CROSS JOIN home h
    WHERE en.type = 'exposant' AND a.created_at >= now() - interval '60 days'
      AND h.code IS NOT NULL AND department_code(en.department) = h.code
  ),
  best AS (
    SELECT DISTINCT ON (pool.candidate) pool.*
    FROM pool
    JOIN entities en ON en.actor_id = pool.candidate AND en.type = 'exposant'
    WHERE pool.candidate <> p_actor
      AND NOT coalesce(can_act_as(pool.candidate), false)
      AND pool.candidate NOT IN (SELECT actor_id FROM followed)
    ORDER BY pool.candidate, pool.rank, pool.weight DESC
  )
  SELECT b.candidate, btrim(ap.label), ap.avatar_url, ap.public_slug, en.city, b.why
  FROM best b
  JOIN actor_public ap ON ap.actor_id = b.candidate
  JOIN entities en ON en.actor_id = b.candidate
  WHERE btrim(ap.label) <> ''
  ORDER BY b.rank, b.weight DESC, btrim(ap.label)
  LIMIT 3;
END; $$;

REVOKE EXECUTE ON FUNCTION public.community_feed(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_feed(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.crossing_dates(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crossing_dates(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.accounts_to_follow(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accounts_to_follow(uuid) TO authenticated;
