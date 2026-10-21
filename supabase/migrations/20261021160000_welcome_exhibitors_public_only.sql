-- POURQUOI — fuite trouvée en relecture (21/10/2026) : « N festivals en commun » comptait les
-- participations des autres sans regarder leur visibilité. Une participation `prive` ou `amis` est
-- cachée par la RLS (participations_select) ; ici, SECURITY DEFINER passait outre, et marquer un
-- festival puis lire les exposants proposés révélait qui y allait en privé. Seules les
-- participations `public` comptent désormais, comme dans get_coevent_suggestions.
-- Définition copiée de 20261021150000 (la live), un seul filtre ajouté.

CREATE OR REPLACE FUNCTION public.welcome_exhibitors(p_actor uuid)
RETURNS TABLE (id uuid, name text, avatar text, slug text, city text, reason text, shared integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  IF NOT coalesce(can_act_as(p_actor), false) THEN
    RAISE EXCEPTION 'welcome_exhibitors: acteur non autorisé' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH me AS (
    SELECT lower(extensions.unaccent(btrim(coalesce(en.craft_type, '')))) AS craft,
      department_code(en.department) AS dep
    FROM entities en WHERE en.actor_id = p_actor
  ),
  candidates AS (
    SELECT en.actor_id, en.craft_type, en.department, a.created_at
    FROM entities en JOIN actors a ON a.id = en.actor_id
    WHERE en.type = 'exposant' AND en.actor_id <> p_actor
      AND NOT coalesce(can_act_as(en.actor_id), false)
      AND NOT EXISTS (
        SELECT 1 FROM follows f WHERE f.follower_actor = p_actor AND f.following_actor = en.actor_id
      )
  ),
  common AS (
    SELECT theirs.actor_id, count(DISTINCT theirs.event_id)::integer AS n
    FROM participations mine
    JOIN participations theirs ON theirs.event_id = mine.event_id AND theirs.actor_id <> p_actor
    JOIN events ev ON ev.id = mine.event_id AND ev.is_private = false
    WHERE mine.actor_id = p_actor
      AND mine.status IN ('interesse', 'inscrit', 'confirme', 'en_cours')
      AND theirs.status IN ('interesse', 'inscrit', 'confirme', 'en_cours')
      AND theirs.visibility = 'public'
    GROUP BY theirs.actor_id
  ),
  ranked AS (
    SELECT c.actor_id, coalesce(cm.n, 0) AS shared,
      CASE
        WHEN cm.n > 0 THEN 1
        WHEN me.craft <> ''
          AND lower(extensions.unaccent(btrim(coalesce(c.craft_type, '')))) = me.craft THEN 2
        WHEN me.dep IS NOT NULL AND department_code(c.department) = me.dep THEN 3
        ELSE 4
      END AS rank,
      c.created_at
    FROM candidates c CROSS JOIN me
    LEFT JOIN common cm ON cm.actor_id = c.actor_id
  )
  SELECT r.actor_id, btrim(ap.label), ap.avatar_url, ap.public_slug, en.city,
    CASE r.rank WHEN 1 THEN 'festivals' WHEN 2 THEN 'craft' WHEN 3 THEN 'nearby' ELSE 'recent' END,
    r.shared
  FROM ranked r
  JOIN actor_public ap ON ap.actor_id = r.actor_id
  JOIN entities en ON en.actor_id = r.actor_id
  WHERE btrim(ap.label) <> ''
  ORDER BY r.rank, r.shared DESC, r.created_at DESC, btrim(ap.label)
  LIMIT 12;
END; $$;

REVOKE EXECUTE ON FUNCTION public.welcome_exhibitors(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.welcome_exhibitors(uuid) TO authenticated;
