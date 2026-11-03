-- POURQUOI : Uriel (03/11/2026) : « Activité de la plateforme » doit montrer quand les gens viennent,
-- pour donner de la vie — au moins pour les amis. Une visite n'est pas une chose qu'on publie : elle
-- ne se montre donc qu'aux amis (abonnements mutuels, are_friends), jamais aux inconnus.
-- Nouvelle ligne `visit` (portée « plateforme » seulement) : une par ami, sa dernière visite
-- (users.last_seen_at, tenu par noter_visite). Une enseigne prend la dernière visite de ses membres.
-- Même signature : CREATE OR REPLACE sur la définition live du 03/11/2026 (= 20261101100000).
-- Le front déployé ignore les lignes d'un genre qu'il ne connaît pas (readLine → isKind).

CREATE OR REPLACE FUNCTION public.community_feed(p_actor uuid, p_before timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 40, p_scope text DEFAULT 'reseau'::text)
 RETURNS TABLE(id text, kind text, occurred_at timestamp with time zone, who_id uuid, who_name text, who_avatar text, who_slug text, target_id uuid, target_name text, target_slug text, event_id uuid, event_name text, event_city text, event_department text, event_start date, event_end date, event_image text, event_tags text[], stars integer, comment text, detail text, companions jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  -- Une page : les nouvelles d'avant `p_before` (maintenant pour la première), un an au plus.
  until timestamptz := coalesce(p_before, now());
  since timestamptz := now() - interval '1 year';
  today date := (now() AT TIME ZONE 'Europe/Paris')::date;
  reader_is_festival boolean;
  whole_platform boolean := p_scope = 'plateforme';
BEGIN
  IF NOT coalesce(can_act_as(p_actor), false) THEN
    RAISE EXCEPTION 'community_feed: acteur non autorisé' USING ERRCODE = '42501';
  END IF;
  IF p_scope NOT IN ('reseau', 'plateforme') THEN
    RAISE EXCEPTION 'community_feed: portée inconnue %', p_scope USING ERRCODE = '22023';
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
    WHERE whole_platform
      AND en.type = 'exposant' AND a.created_at >= since AND a.created_at < until
      AND NOT coalesce(can_act_as(a.id), false)
    UNION ALL
    SELECT 'going:' || p.id, 'going', p.created_at, p.actor_id, NULL, p.event_id, NULL, NULL, NULL, true
    FROM participations p JOIN events e ON e.id = p.event_id
    WHERE p.status IN ('inscrit', 'confirme', 'en_cours')
      AND NOT e.is_private AND p.created_at >= since AND p.created_at < until
      AND CASE WHEN whole_platform
        -- La plateforme ne montre que les dates publiques, jamais celles réservées aux amis.
        THEN p.visibility = 'public' AND NOT coalesce(can_act_as(p.actor_id), false)
        ELSE p.actor_id IN (SELECT actor_id FROM followed)
          AND (p.visibility = 'public' OR (p.visibility = 'amis' AND coalesce(are_friends(p_actor, p.actor_id), false)))
      END
    UNION ALL
    SELECT 'added:' || e.id, 'added', e.created_at, e.created_by_actor, NULL, e.id, NULL, NULL, NULL, true
    FROM events e
    WHERE NOT e.is_private AND e.created_at >= since AND e.created_at < until
      AND CASE WHEN whole_platform
        THEN e.created_by_actor IS NULL OR NOT coalesce(can_act_as(e.created_by_actor), false)
        ELSE e.created_by_actor IN (SELECT actor_id FROM followed)
      END
    UNION ALL
    SELECT r.line_id, 'review', r.created_at, r.actor_id, NULL, r.event_id,
      r.line_stars, r.comment, NULL, r.named
    FROM (
      SELECT 'review:' || r.id AS line_id, r.created_at, r.actor_id, r.event_id, r.comment,
        round((r.affluence + r.organisation + r.rentabilite) / 3.0)::integer AS line_stars,
        (NOT r.anonymous AND NOT reader_is_festival AND coalesce(are_friends(p_actor, r.actor_id), false)) AS named
      FROM reviews r JOIN events e ON e.id = r.event_id
      WHERE NOT e.is_private AND r.created_at >= since AND r.created_at < until
        AND NOT coalesce(can_act_as(r.actor_id), false)
    ) r
    -- Dans le réseau, un avis anonyme désignerait un proche : il n'y entre que signé.
    WHERE whole_platform OR (r.named AND r.actor_id IN (SELECT actor_id FROM followed))
    UNION ALL
    SELECT 'follow:' || f.id, 'follow', f.created_at, f.follower_actor, f.following_actor, NULL, NULL, NULL, NULL, true
    FROM follows f
    WHERE NOT whole_platform
      AND f.follower_actor IN (SELECT actor_id FROM followed)
      AND f.following_actor IS NOT NULL
      AND NOT coalesce(can_act_as(f.following_actor), false)
      AND f.created_at >= since AND f.created_at < until
    UNION ALL
    -- La dernière visite d'un ami : la personne, ou l'enseigne dont un membre est venu.
    SELECT 'visit:' || v.who, 'visit', v.at, v.who, NULL, NULL, NULL, NULL, NULL, true
    FROM (
      SELECT u.actor_id AS who, u.last_seen_at AS at FROM users u
      WHERE u.suspended_at IS NULL
      UNION ALL
      SELECT m.entity_actor_id, max(u.last_seen_at) FROM memberships m
      JOIN users u ON u.actor_id = m.user_actor_id
      WHERE u.suspended_at IS NULL
      GROUP BY m.entity_actor_id
    ) v
    WHERE whole_platform
      AND v.who IN (SELECT actor_id FROM followed)
      AND coalesce(are_friends(p_actor, v.who), false)
      AND v.at >= since AND v.at < until
  ),
  feed AS (
    SELECT * FROM lines ORDER BY at DESC, line_id LIMIT least(greatest(p_limit, 1), 100)
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
  -- « Ça se rassemble » : le réseau seulement, et sur la première page.
  WHERE p_before IS NULL AND NOT whole_platform
  -- Les jointures ne gardent pas l'ordre du CTE : on retrie, « Ça se rassemble » (now()) en tête.
  ORDER BY 3 DESC, 1;
END; $function$
;

REVOKE EXECUTE ON FUNCTION public.community_feed(uuid, timestamptz, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_feed(uuid, timestamptz, integer, text) TO authenticated;
