-- 20261104140000_discussions_parametres_facultatifs.sql
--
-- POURQUOI — la date liée, le média et le nom d'un groupe sont facultatifs : sans défaut, les types
-- générés les rendent obligatoires et le front ne peut pas passer « rien » sans tricher sur le type.
-- Définitions reprises telles quelles de 20261104130000, seuls les défauts s'ajoutent.

CREATE OR REPLACE FUNCTION public.publier_sujet(
  p_actor UUID, p_mot TEXT, p_audience public.sujet_audience, p_event UUID DEFAULT NULL,
  p_media_path TEXT DEFAULT NULL, p_media_kind public.message_media DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT can_act_as(p_actor) THEN RAISE EXCEPTION 'Action non autorisée.'; END IF;
  IF NOT media_belongs_to(p_media_path, p_actor) THEN RAISE EXCEPTION 'Média invalide.'; END IF;

  INSERT INTO conversations (kind, created_by, mot, audience, event_id, media_path, media_kind, expires_at)
  VALUES ('sujet', p_actor, btrim(p_mot), p_audience, p_event, p_media_path, p_media_kind,
          now() + interval '7 days')
  RETURNING id INTO v_id;

  INSERT INTO conversation_members (conversation_id, actor_id) VALUES (v_id, p_actor);
  -- Le mot est aussi le premier message du fil, avec son média.
  INSERT INTO messages (conversation_id, author_actor, body, media_path, media_kind)
  VALUES (v_id, p_actor, btrim(p_mot), p_media_path, p_media_kind);
  INSERT INTO sujet_views (conversation_id, actor_id) VALUES (v_id, p_actor);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.envoyer_message(
  p_actor UUID, p_conversation UUID, p_body TEXT DEFAULT NULL, p_media_path TEXT DEFAULT NULL,
  p_media_kind public.message_media DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_kind public.conversation_kind;
  v_member BOOLEAN;
  v_id UUID;
BEGIN
  IF NOT can_act_as(p_actor) THEN RAISE EXCEPTION 'Action non autorisée.'; END IF;
  IF NOT media_belongs_to(p_media_path, p_actor) THEN RAISE EXCEPTION 'Média invalide.'; END IF;

  SELECT kind INTO v_kind FROM conversations WHERE id = p_conversation;
  IF v_kind IS NULL THEN RAISE EXCEPTION 'Conversation introuvable.'; END IF;
  v_member := EXISTS (SELECT 1 FROM conversation_members
                      WHERE conversation_id = p_conversation AND actor_id = p_actor);

  IF v_kind = 'sujet' THEN
    IF NOT sujet_is_open(p_conversation) THEN RAISE EXCEPTION 'Ce sujet est clôturé.'; END IF;
    IF NOT v_member THEN
      IF NOT actor_sees_sujet(p_actor, p_conversation) THEN
        RAISE EXCEPTION 'Conversation introuvable.';
      END IF;
      -- Écrire dans un sujet en fait un participant : il rejoint sa boîte Messages.
      INSERT INTO conversation_members (conversation_id, actor_id) VALUES (p_conversation, p_actor);
    END IF;
  ELSIF NOT v_member THEN
    RAISE EXCEPTION 'Conversation introuvable.';
  END IF;

  INSERT INTO messages (conversation_id, author_actor, body, media_path, media_kind)
  VALUES (p_conversation, p_actor, NULLIF(btrim(p_body), ''), p_media_path, p_media_kind)
  RETURNING id INTO v_id;
  UPDATE conversations SET last_message_at = now() WHERE id = p_conversation;
  UPDATE conversation_members SET last_read_at = now()
  WHERE conversation_id = p_conversation AND actor_id = p_actor;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ouvrir_conversation(p_actor UUID, p_others UUID[], p_title TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
$$;

