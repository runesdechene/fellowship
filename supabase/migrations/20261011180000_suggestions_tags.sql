-- POURQUOI : Uriel, 11/10/2026 — une affiche absente de « Pour toi » prend la couleur et l'icône
--   de sa catégorie, comme partout ailleurs. Le tableau de bord relisait les tags par une requête
--   de plus ; suggestions_for les rend désormais avec chaque festival.
-- Définition reprise entière du live, seule la ligne 'tags' s'ajoute.
CREATE OR REPLACE FUNCTION public.suggestions_for(p_actor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      'image_url', e.image_url, 'tags', e.tags, 'reason', best.reason
    ) ORDER BY best.score DESC, best.start_date, e.id), '[]'::jsonb)
  INTO items
  FROM (
    SELECT * FROM suggestion_candidates(p_actor)
    ORDER BY score DESC, start_date, event_id
    LIMIT 3
  ) best
  JOIN events e ON e.id = best.event_id;

  RETURN jsonb_build_object('count', found, 'items', items);
END; $function$;
