-- Affine get_coevent_suggestions : ne jamais se suggérer un acteur qu'on contrôle déjà
-- (ex. suggérer sa propre personne à son entité, ou l'inverse). can_act_as(p2.actor_id)
-- est vrai pour tous les acteurs du même utilisateur → on les exclut.
CREATE OR REPLACE FUNCTION get_coevent_suggestions(p_actor_id uuid)
RETURNS TABLE (suggested_actor uuid, shared_events bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p2.actor_id, count(DISTINCT p2.event_id)::bigint
  FROM participations p1
  JOIN participations p2 ON p2.event_id = p1.event_id
  WHERE can_act_as(p_actor_id)
    AND p1.actor_id = p_actor_id
    AND p1.status <> 'refuse'
    AND p2.actor_id IS NOT NULL
    AND p2.actor_id <> p_actor_id
    AND NOT can_act_as(p2.actor_id)
    AND p2.status <> 'refuse'
    AND p2.visibility = 'public'
    AND p2.actor_id NOT IN (
      SELECT following_actor FROM follows
      WHERE follower_actor = p_actor_id AND following_actor IS NOT NULL
    )
  GROUP BY p2.actor_id
  ORDER BY count(DISTINCT p2.event_id) DESC
  LIMIT 12;
$$;
