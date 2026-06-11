-- Suggestions de follow : ne JAMAIS proposer un festivalier (actors.kind = 'person').
-- Une suggestion mène à une vitrine (/@slug) que seules les entités possèdent ; un
-- compte personne y casserait le lien. On filtre donc kind = 'entity' AVANT le LIMIT 12
-- (sinon des personnes consommeraient des places de candidats puis seraient retirées).
-- Concerne les DEUX sources : amis d'amis (get_follow_suggestions) + co-participation
-- (get_coevent_suggestions).

CREATE OR REPLACE FUNCTION get_follow_suggestions(p_actor_id uuid)
RETURNS TABLE (suggested_actor uuid, shared_followers bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.following_actor, count(*)::bigint
  FROM follows f
  JOIN actors a ON a.id = f.following_actor AND a.kind = 'entity'
  WHERE can_act_as(p_actor_id)
    AND f.following_actor IS NOT NULL
    AND f.following_actor <> p_actor_id
    AND f.follower_actor IN (
      SELECT following_actor FROM follows
      WHERE follower_actor = p_actor_id AND following_actor IS NOT NULL
    )
    AND f.following_actor NOT IN (
      SELECT following_actor FROM follows
      WHERE follower_actor = p_actor_id AND following_actor IS NOT NULL
    )
  GROUP BY f.following_actor
  ORDER BY count(*) DESC
  LIMIT 12;
$$;

CREATE OR REPLACE FUNCTION get_coevent_suggestions(p_actor_id uuid)
RETURNS TABLE (suggested_actor uuid, shared_events bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p2.actor_id, count(DISTINCT p2.event_id)::bigint
  FROM participations p1
  JOIN participations p2 ON p2.event_id = p1.event_id
  JOIN actors a2 ON a2.id = p2.actor_id AND a2.kind = 'entity'
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

GRANT EXECUTE ON FUNCTION get_follow_suggestions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_coevent_suggestions(uuid) TO authenticated;
