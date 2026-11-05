-- POURQUOI — les messages sont réservés aux amis, c'est-à-dire aux comptes qui se suivent dans les
-- deux sens (Uriel, 05/11/2026). Jusqu'ici, n'importe qui pouvait écrire à n'importe qui, par la
-- recherche du « Nouveau message » ou par « Écrire » sur une vitrine.
-- Les deux portes d'entrée refusent désormais un non-ami : ouvrir une conversation (à deux ou en
-- groupe) et ajouter quelqu'un à un groupe. Les conversations déjà ouvertes restent lisibles, et
-- les sujets gardent leur propre public (Amis, Abonnés, Public).
-- CREATE OR REPLACE sur les définitions live du 05/11/2026 (= 20261104140000, 20261104130000).

CREATE OR REPLACE FUNCTION public.ouvrir_conversation(p_actor uuid, p_others uuid[], p_title text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_others UUID[];
  v_id UUID;
  v_key TEXT;
  v_title TEXT := NULLIF(btrim(p_title), '');
BEGIN
  IF NOT can_act_as(p_actor) THEN RAISE EXCEPTION 'Action non autorisée.'; END IF;
  SELECT array_agg(DISTINCT a.id) INTO v_others
  FROM actors a WHERE a.id = ANY (p_others) AND a.id <> p_actor;
  IF v_others IS NULL THEN RAISE EXCEPTION 'Choisis au moins une personne.'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_others) AS x WHERE NOT coalesce(are_friends(p_actor, x), false)) THEN
    RAISE EXCEPTION 'Tu ne peux écrire qu’à tes amis.';
  END IF;

  IF cardinality(v_others) = 1 AND v_title IS NULL THEN
    v_key := least(p_actor, v_others[1])::text || ':' || greatest(p_actor, v_others[1])::text;
    SELECT id INTO v_id FROM conversations WHERE pair_key = v_key;
    IF v_id IS NULL THEN
      INSERT INTO conversations (kind, created_by, pair_key) VALUES ('direct', p_actor, v_key)
      ON CONFLICT (pair_key) DO NOTHING RETURNING id INTO v_id;
      IF v_id IS NULL THEN SELECT id INTO v_id FROM conversations WHERE pair_key = v_key; END IF;
    END IF;
  ELSE
    INSERT INTO conversations (kind, created_by, title) VALUES ('groupe', p_actor, v_title)
    RETURNING id INTO v_id;
  END IF;

  INSERT INTO conversation_members (conversation_id, actor_id)
  SELECT v_id, x FROM unnest(array_append(v_others, p_actor)) AS x
  ON CONFLICT DO NOTHING;
  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ajouter_membres(p_actor uuid, p_conversation uuid, p_others uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT can_act_as(p_actor) THEN RAISE EXCEPTION 'Action non autorisée.'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM conversation_members m JOIN conversations c ON c.id = m.conversation_id
    WHERE m.conversation_id = p_conversation AND m.actor_id = p_actor AND c.kind = 'groupe'
  ) THEN RAISE EXCEPTION 'Groupe introuvable.'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_others) AS x WHERE NOT coalesce(are_friends(p_actor, x), false)) THEN
    RAISE EXCEPTION 'Tu ne peux ajouter que tes amis.';
  END IF;
  INSERT INTO conversation_members (conversation_id, actor_id)
  SELECT p_conversation, a.id FROM actors a WHERE a.id = ANY (p_others)
  ON CONFLICT DO NOTHING;
END;
$function$;
