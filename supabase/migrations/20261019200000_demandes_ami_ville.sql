-- POURQUOI : Uriel, 19/10/2026 — les demandes d'ami arrivent aussi dans la cloche, avec la ville de
--    l'exposant sous son nom (« Rennes ») pour qu'on le reconnaisse. friend_requests rend donc la
--    ville. Changer les colonnes rendues oblige à recréer la fonction ; le reste est la définition
--    live de 20261019190000, inchangée.

DROP FUNCTION public.friend_requests(uuid);

CREATE FUNCTION public.friend_requests(p_actor uuid)
RETURNS TABLE (id uuid, name text, avatar text, slug text, city text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  IF NOT coalesce(can_act_as(p_actor), false) THEN
    RAISE EXCEPTION 'friend_requests: acteur non autorisé' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT en.actor_id, btrim(en.brand_name), en.avatar_url, en.public_slug, en.city
  FROM follows f
  JOIN entities en ON en.actor_id = f.follower_actor AND en.type = 'exposant'
  WHERE f.following_actor = p_actor
    AND NOT coalesce(can_act_as(f.follower_actor), false)
    AND NOT EXISTS (SELECT 1 FROM declined_follows d WHERE d.follow_id = f.id)
    AND NOT EXISTS (
      SELECT 1 FROM follows back
      WHERE back.follower_actor = p_actor AND back.following_actor = f.follower_actor
    )
  ORDER BY f.created_at DESC, f.id;
END; $$;

REVOKE EXECUTE ON FUNCTION public.friend_requests(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.friend_requests(uuid) TO authenticated;
