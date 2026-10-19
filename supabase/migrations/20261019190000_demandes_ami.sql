-- POURQUOI : Uriel, 19/10/2026 — « Ta communauté » montre les demandes d'ami en attente : un
--    exposant qui te suit sans que tu le suives. Deux règles s'y ajoutent :
--    1. une demande se refuse. Le refus la retire de « Ta communauté » et de la pastille ; l'abonné
--       reste abonné (refuser l'amitié n'est pas bloquer). Le refus vit dans sa propre table, sans
--       politique : l'abonné ne peut pas lire qu'on l'a refusé, ce qu'il pourrait sur `follows`.
--       Il tient à la ligne de `follows` : se désabonner puis se réabonner refait une demande ;
--    2. seul un exposant fait une demande : un compte festivalier reste un abonné.
--    Les deux fonctions passent par can_act_as, comme accounts_to_follow, et écartent ses propres
--    comptes (la personne qui suit son enseigne n'est pas une demande).

CREATE TABLE public.declined_follows (
  follow_id uuid PRIMARY KEY REFERENCES public.follows(id) ON DELETE CASCADE,
  declined_at timestamptz NOT NULL DEFAULT now()
);

-- Aucune politique : on n'y passe que par les deux fonctions ci-dessous.
ALTER TABLE public.declined_follows ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.friend_requests(p_actor uuid)
RETURNS TABLE (id uuid, name text, avatar text, slug text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  IF NOT coalesce(can_act_as(p_actor), false) THEN
    RAISE EXCEPTION 'friend_requests: acteur non autorisé' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT en.actor_id, btrim(en.brand_name), en.avatar_url, en.public_slug
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

CREATE FUNCTION public.decline_friend_request(p_actor uuid, p_follower uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT coalesce(can_act_as(p_actor), false) THEN
    RAISE EXCEPTION 'decline_friend_request: acteur non autorisé' USING ERRCODE = '42501';
  END IF;
  INSERT INTO declined_follows (follow_id)
  SELECT f.id FROM follows f
  WHERE f.follower_actor = p_follower AND f.following_actor = p_actor
  ON CONFLICT (follow_id) DO NOTHING;
END; $$;

REVOKE EXECUTE ON FUNCTION public.friend_requests(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.friend_requests(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.decline_friend_request(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decline_friend_request(uuid, uuid) TO authenticated;
