-- Fil Communauté : source "avis" à identité gatée (cohérence avec get_event_reviews).
-- Ne renvoie que les avis ATTRIBUABLES au lecteur : auteur = ami mutuel, avis non-anonyme,
-- lecteur non-festival. Les avis non-attribuables sont exclus du feed (un item anonyme dans
-- un fil personnel est inutile et légèrement dé-anonymisant). Remplace la lecture directe
-- `from('reviews').in('actor_id', followingIds)` qui laissait fuiter l'actor_id d'autrui.
CREATE OR REPLACE FUNCTION public.get_network_reviews(p_actor_id uuid, p_since timestamptz)
RETURNS TABLE (
  id uuid, actor_id uuid, event_id uuid,
  affluence smallint, organisation smallint, rentabilite smallint,
  comment text, created_at timestamptz
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_viewer uuid;
BEGIN
  IF p_actor_id IS NULL OR NOT can_act_as(p_actor_id) THEN
    RETURN;                          -- acteur non contrôlé -> rien
  END IF;
  v_viewer := p_actor_id;

  -- Un compte organisateur (festival) ne voit jamais l'identité -> pas de source avis nommée.
  IF EXISTS (SELECT 1 FROM entities e WHERE e.actor_id = v_viewer AND e.type = 'festival') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT r.id, r.actor_id, r.event_id, r.affluence, r.organisation, r.rentabilite, r.comment, r.created_at
  FROM reviews r
  WHERE r.created_at >= p_since
    AND r.anonymous = false
    AND are_friends(v_viewer, r.actor_id)   -- ami mutuel uniquement (feed = activité nommée)
  ORDER BY r.created_at DESC
  LIMIT 50;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_network_reviews(uuid, timestamptz) TO authenticated;
