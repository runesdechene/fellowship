-- POURQUOI : Uriel, 19/10/2026 (maquette Figma 2363:25) — sur la Communauté, chaque carte de « Tu
--    connais peut-être » montre les amis en commun : leur nombre et trois visages. Un ami en commun
--    est l'ami de l'acteur ET l'ami du compte suggéré (vue friends : deux suivis réciproques).
--    Fonction neuve et additive : accounts_to_follow ne change pas, le site déployé non plus.

CREATE FUNCTION public.mutual_friends(p_actor uuid, p_others uuid[])
RETURNS TABLE (other_id uuid, total integer, faces jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  IF NOT coalesce(can_act_as(p_actor), false) THEN
    RAISE EXCEPTION 'mutual_friends: acteur non autorisé' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT o.other_id,
    count(*)::integer,
    -- Trois visages au plus, ceux qui ont une photo d'abord.
    to_jsonb((array_agg(
      jsonb_build_object('id', ap.actor_id, 'name', btrim(ap.label), 'avatar', ap.avatar_url)
      ORDER BY (ap.avatar_url IS NULL), btrim(ap.label)
    ))[1:3])
  FROM unnest(p_others) AS o(other_id)
  JOIN friends mine ON mine.user_id = p_actor
  JOIN friends theirs ON theirs.user_id = o.other_id AND theirs.friend_id = mine.friend_id
  JOIN actor_public ap ON ap.actor_id = mine.friend_id
  WHERE mine.friend_id <> o.other_id AND btrim(ap.label) <> ''
  GROUP BY o.other_id;
END; $$;

REVOKE EXECUTE ON FUNCTION public.mutual_friends(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mutual_friends(uuid, uuid[]) TO authenticated;
