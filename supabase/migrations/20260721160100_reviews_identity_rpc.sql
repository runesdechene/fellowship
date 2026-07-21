-- Avis à identité protégée — partie 2 : RPC de lecture qui décide de révéler l'identité.
-- Règle : identité visible SSI (soi-même) OU (avis non-anonyme ET lecteur non-festival ET ami mutuel).
-- p_viewer_actor = acteur actif du lecteur, validé par can_act_as (anti-usurpation).

CREATE OR REPLACE FUNCTION public.get_event_reviews(p_event_id uuid, p_viewer_actor uuid)
RETURNS TABLE (
  review_id uuid, event_id uuid,
  affluence smallint, organisation smallint, rentabilite smallint,
  comment text, created_at timestamptz, anonymous boolean,
  is_self boolean, identity_visible boolean,
  author_actor_id uuid, author_label text, author_avatar_url text, author_slug text
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_viewer uuid;
  v_is_festival boolean;
BEGIN
  IF p_viewer_actor IS NOT NULL AND can_act_as(p_viewer_actor) THEN
    v_viewer := p_viewer_actor;
  ELSE
    v_viewer := NULL;                 -- acteur non contrôlé -> traité en lecteur anonyme
  END IF;
  v_is_festival := v_viewer IS NOT NULL AND EXISTS (
    SELECT 1 FROM entities e WHERE e.actor_id = v_viewer AND e.type = 'festival'
  );

  RETURN QUERY
  SELECT
    r.id, r.event_id, r.affluence, r.organisation, r.rentabilite,
    r.comment, r.created_at, r.anonymous,
    vis.self AS is_self,
    vis.visible AS identity_visible,
    CASE WHEN vis.visible THEN r.actor_id END,
    CASE WHEN vis.visible THEN ap.label END,
    CASE WHEN vis.visible THEN ap.avatar_url END,
    CASE WHEN vis.visible THEN ap.public_slug END
  FROM reviews r
  LEFT JOIN actor_public ap ON ap.actor_id = r.actor_id
  CROSS JOIN LATERAL (
    SELECT
      (v_viewer IS NOT NULL AND can_act_as(r.actor_id)) AS self,
      (
        (v_viewer IS NOT NULL AND can_act_as(r.actor_id))
        OR ( r.anonymous = false AND NOT v_is_festival
             AND v_viewer IS NOT NULL AND are_friends(v_viewer, r.actor_id) )
      ) AS visible
  ) vis
  WHERE r.event_id = p_event_id
  ORDER BY r.created_at DESC;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_event_reviews(uuid, uuid) TO authenticated;

-- Réponses aux avis : même logique d'identité (pas de badge "présent" côté front, géré à l'affichage).
CREATE OR REPLACE FUNCTION public.get_review_replies(p_review_id uuid, p_viewer_actor uuid)
RETURNS TABLE (
  reply_id uuid, review_id uuid, body text, created_at timestamptz, updated_at timestamptz,
  is_self boolean, identity_visible boolean,
  author_actor_id uuid, author_label text, author_avatar_url text, author_slug text
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_viewer uuid;
  v_is_festival boolean;
BEGIN
  IF p_viewer_actor IS NOT NULL AND can_act_as(p_viewer_actor) THEN
    v_viewer := p_viewer_actor;
  ELSE
    v_viewer := NULL;
  END IF;
  v_is_festival := v_viewer IS NOT NULL AND EXISTS (
    SELECT 1 FROM entities e WHERE e.actor_id = v_viewer AND e.type = 'festival'
  );

  RETURN QUERY
  SELECT
    rr.id, rr.review_id, rr.body, rr.created_at, rr.updated_at,
    vis.self, vis.visible,
    CASE WHEN vis.visible THEN rr.actor_id END,
    CASE WHEN vis.visible THEN ap.label END,
    CASE WHEN vis.visible THEN ap.avatar_url END,
    CASE WHEN vis.visible THEN ap.public_slug END
  FROM review_replies rr
  LEFT JOIN actor_public ap ON ap.actor_id = rr.actor_id
  CROSS JOIN LATERAL (
    SELECT
      (v_viewer IS NOT NULL AND can_act_as(rr.actor_id)) AS self,
      (
        (v_viewer IS NOT NULL AND can_act_as(rr.actor_id))
        OR ( NOT v_is_festival AND v_viewer IS NOT NULL AND are_friends(v_viewer, rr.actor_id) )
      ) AS visible
  ) vis
  WHERE rr.review_id = p_review_id
  ORDER BY rr.created_at ASC;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_review_replies(uuid, uuid) TO authenticated;
