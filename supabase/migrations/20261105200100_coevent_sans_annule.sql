-- POURQUOI — get_coevent_suggestions écartait les dates refusées par `status <> 'refuse'` : une date
-- annulée (20261105200000) y aurait compté comme un festival partagé. Les deux sortent ensemble.
-- CREATE OR REPLACE sur la définition live du 05/11/2026, seules les deux lignes de statut changent.

CREATE OR REPLACE FUNCTION public.get_coevent_suggestions(p_actor_id uuid)
 RETURNS TABLE(suggested_actor uuid, shared_events bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p2.actor_id, count(DISTINCT p2.event_id)::bigint
  FROM participations p1
  JOIN events ev ON ev.id = p1.event_id AND ev.is_private = false
  JOIN participations p2 ON p2.event_id = p1.event_id
  JOIN actors a2 ON a2.id = p2.actor_id AND a2.kind = 'entity'
  WHERE can_act_as(p_actor_id)
    AND p1.actor_id = p_actor_id
    AND p1.status NOT IN ('refuse', 'annule')
    AND p2.actor_id IS NOT NULL
    AND p2.actor_id <> p_actor_id
    AND NOT can_act_as(p2.actor_id)
    AND p2.status NOT IN ('refuse', 'annule')
    AND p2.visibility = 'public'
    AND p2.actor_id NOT IN (
      SELECT following_actor FROM follows
      WHERE follower_actor = p_actor_id AND following_actor IS NOT NULL
    )
  GROUP BY p2.actor_id
  ORDER BY count(DISTINCT p2.event_id) DESC
  LIMIT 12;
$function$;
