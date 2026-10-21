-- POURQUOI — l'arrivée d'une enseigne passe à sept étapes (spec
-- docs/superpowers/specs/2026-10-21-arrivee-sept-etapes-design.md, Uriel, 21/10/2026) :
--   * le code de parrainage se vérifie pendant la saisie, sans être attribué : referral_owner ;
--   * « Tu les connais peut-être » propose des exposants du même métier, puis du même
--     département : welcome_exhibitors (aucune suggestion par métier n'existait) ;
--   * « Ces festivals t'intéressent ? » propose les festivals publics de l'année à venir, ceux du
--     département d'abord, puis les plus fréquentés : welcome_festivals.
-- Trois fonctions de lecture, purement additives.

-- Le nom de l'enseigne qui porte un code, ou NULL. Même normalisation que attribute_referral.
-- N'expose qu'un nom d'enseigne déjà public.
CREATE OR REPLACE FUNCTION public.referral_owner(p_code text)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT btrim(ap.label)
  FROM referral_codes rc
  JOIN actor_public ap ON ap.actor_id = rc.owner_entity_id
  WHERE rc.code = regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g')
$$;

CREATE OR REPLACE FUNCTION public.welcome_exhibitors(p_actor uuid)
RETURNS TABLE (id uuid, name text, avatar text, slug text, city text, reason text)
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
  pool AS (
    SELECT en.actor_id,
      CASE
        WHEN me.craft <> '' AND lower(extensions.unaccent(btrim(coalesce(en.craft_type, '')))) = me.craft THEN 1
        WHEN me.dep IS NOT NULL AND department_code(en.department) = me.dep THEN 2
      END AS rank
    FROM entities en CROSS JOIN me
    WHERE en.type = 'exposant' AND en.actor_id <> p_actor
      AND NOT coalesce(can_act_as(en.actor_id), false)
      AND NOT EXISTS (
        SELECT 1 FROM follows f WHERE f.follower_actor = p_actor AND f.following_actor = en.actor_id
      )
  )
  SELECT p.actor_id, btrim(ap.label), ap.avatar_url, ap.public_slug, en.city,
    CASE p.rank WHEN 1 THEN 'craft' ELSE 'nearby' END
  FROM pool p
  JOIN actor_public ap ON ap.actor_id = p.actor_id
  JOIN entities en ON en.actor_id = p.actor_id
  WHERE p.rank IS NOT NULL AND btrim(ap.label) <> ''
  ORDER BY p.rank,
    (SELECT count(*) FROM follows f WHERE f.following_actor = p.actor_id) DESC,
    btrim(ap.label)
  LIMIT 12;
END; $$;

CREATE OR REPLACE FUNCTION public.welcome_festivals(p_actor uuid)
RETURNS TABLE (id uuid, name text, city text, start_date date, end_date date, image_url text, tags text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  v_dep text;
BEGIN
  IF NOT coalesce(can_act_as(p_actor), false) THEN
    RAISE EXCEPTION 'welcome_festivals: acteur non autorisé' USING ERRCODE = '42501';
  END IF;
  SELECT department_code(en.department) INTO v_dep FROM entities en WHERE en.actor_id = p_actor;
  RETURN QUERY
  SELECT ev.id, ev.name, ev.city, ev.start_date, ev.end_date, ev.image_url, ev.tags
  FROM events ev
  WHERE ev.is_private = false
    AND ev.start_date >= current_date
    AND ev.start_date < current_date + interval '12 months'
  ORDER BY
    (v_dep IS NOT NULL AND department_code(ev.department) = v_dep) DESC,
    (SELECT count(*) FROM participations pa
      WHERE pa.event_id = ev.id AND pa.status IN ('inscrit', 'confirme', 'interesse')) DESC,
    ev.start_date
  LIMIT 12;
END; $$;

REVOKE EXECUTE ON FUNCTION public.referral_owner(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.referral_owner(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.welcome_exhibitors(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.welcome_exhibitors(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.welcome_festivals(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.welcome_festivals(uuid) TO authenticated;
