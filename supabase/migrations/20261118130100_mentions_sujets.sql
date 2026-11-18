-- POURQUOI : on tague avec @ un compte exposant dans le mot d'un sujet et dans ses messages
-- (Uriel, 18/11/2026, maquette Story 2844:1023 et 2844:1123). Le tagué est prévenu (cloche et
-- push) et le tag lui ouvre le sujet, même hors de son audience.
--
-- Les mentions vivent dans le message lui-même (`messages.mentions`, [{id, name, slug}]) : le
-- temps réel transmet la ligne brute, la bulle arrive donc avec ses @ sans seconde lecture. Le texte
-- garde un simple « @Nom » lisible partout (push, aperçus) et ne pèse pas sur les limites de
-- longueur. Le client envoie les identifiants choisis ; la base ne garde que les comptes
-- exposants dont le « @Nom » figure encore dans le texte, et écrit elle-même noms et adresses.

ALTER TABLE public.messages ADD COLUMN mentions JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Les mentions d'un texte : les exposants choisis dont le « @Nom » y figure encore.
CREATE OR REPLACE FUNCTION public.mentions_de(p_body TEXT, p_others UUID[])
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('id', ap.actor_id, 'name', ap.label, 'slug', ap.public_slug)
              ORDER BY ap.label),
    '[]'::jsonb)
  FROM actor_public ap
  WHERE p_body IS NOT NULL AND p_others IS NOT NULL
    AND ap.actor_id = ANY (p_others)
    AND ap.public_slug IS NOT NULL
    AND strpos(p_body, '@' || ap.label) > 0;
$$;

-- Prévient les tagués d'un message de sujet qui ne l'étaient pas avant (`p_before`), sauf l'auteur.
CREATE OR REPLACE FUNCTION public.prevenir_mentions(p_message UUID, p_before JSONB)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO notifications (actor_id, type, data)
  SELECT (x ->> 'id')::uuid, 'mention'::notification_type,
         jsonb_build_object(
           'actor_id', m.author_actor, 'actor_name', COALESCE(ap.label, 'Quelqu''un'),
           'actor_avatar_url', ap.avatar_url, 'conversation_id', m.conversation_id, 'mot', c.mot)
  FROM messages m
  JOIN conversations c ON c.id = m.conversation_id
  LEFT JOIN actor_public ap ON ap.actor_id = m.author_actor
  CROSS JOIN LATERAL jsonb_array_elements(m.mentions) x
  WHERE m.id = p_message
    AND c.kind = 'sujet'
    AND (x ->> 'id')::uuid <> m.author_actor
    AND NOT p_before @> jsonb_build_array(jsonb_build_object('id', x ->> 'id'));
$$;

REVOKE ALL ON FUNCTION public.mentions_de(TEXT, UUID[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevenir_mentions(UUID, JSONB) FROM PUBLIC, anon, authenticated;

-- Être tagué dans un sujet ouvre sa lecture : sinon la notification mènerait à un sujet invisible.
-- Définition live du 18/11/2026, plus la dernière clause.
CREATE OR REPLACE FUNCTION public.actor_sees_sujet(p_actor uuid, p_conversation uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = p_conversation AND c.kind = 'sujet' AND (
      c.created_by = p_actor
      OR c.audience = 'public'
      OR (c.audience = 'abonnes' AND EXISTS (
            SELECT 1 FROM follows WHERE follower_actor = p_actor AND following_actor = c.created_by))
      OR (c.audience = 'amis'
          AND EXISTS (SELECT 1 FROM follows WHERE follower_actor = p_actor AND following_actor = c.created_by)
          AND EXISTS (SELECT 1 FROM follows WHERE follower_actor = c.created_by AND following_actor = p_actor))
      OR EXISTS (
            SELECT 1 FROM messages m
            WHERE m.conversation_id = c.id
              AND m.mentions @> jsonb_build_array(jsonb_build_object('id', p_actor)))
    )
  );
$function$;

-- Les trois écritures prennent les mentions choisies. Un paramètre de plus change la signature :
-- on retire l'ancienne, sinon deux versions coexisteraient. Définitions live du 18/11/2026.
DROP FUNCTION public.envoyer_message(uuid, uuid, text, text, message_media, uuid);
CREATE FUNCTION public.envoyer_message(p_actor uuid, p_conversation uuid, p_body text DEFAULT NULL::text, p_media_path text DEFAULT NULL::text, p_media_kind message_media DEFAULT NULL::message_media, p_event uuid DEFAULT NULL::uuid, p_mentions uuid[] DEFAULT NULL::uuid[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_kind public.conversation_kind;
  v_member BOOLEAN;
  v_id UUID;
BEGIN
  IF NOT can_act_as(p_actor) THEN RAISE EXCEPTION 'Action non autorisée.'; END IF;
  IF NOT media_belongs_to(p_media_path, p_actor) THEN RAISE EXCEPTION 'Média invalide.'; END IF;
  IF p_event IS NOT NULL AND NOT EXISTS (SELECT 1 FROM events WHERE id = p_event AND NOT is_private) THEN
    RAISE EXCEPTION 'Festival introuvable.';
  END IF;

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

  INSERT INTO messages (conversation_id, author_actor, body, media_path, media_kind, event_id, mentions)
  VALUES (p_conversation, p_actor, NULLIF(btrim(p_body), ''), p_media_path, p_media_kind, p_event,
          CASE WHEN v_kind = 'sujet' THEN mentions_de(p_body, p_mentions) ELSE '[]'::jsonb END)
  RETURNING id INTO v_id;
  PERFORM prevenir_mentions(v_id, '[]'::jsonb);
  UPDATE conversations SET last_message_at = now() WHERE id = p_conversation;
  UPDATE conversation_members SET last_read_at = now()
  WHERE conversation_id = p_conversation AND actor_id = p_actor;
  RETURN v_id;
END;
$function$;

DROP FUNCTION public.publier_sujet(uuid, text, sujet_audience, uuid, text, message_media, boolean);
CREATE FUNCTION public.publier_sujet(p_actor uuid, p_mot text, p_audience sujet_audience, p_event uuid DEFAULT NULL::uuid, p_media_path text DEFAULT NULL::text, p_media_kind message_media DEFAULT NULL::message_media, p_media_fond boolean DEFAULT false, p_mentions uuid[] DEFAULT NULL::uuid[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id UUID;
  v_message UUID;
BEGIN
  IF NOT can_act_as(p_actor) THEN RAISE EXCEPTION 'Action non autorisée.'; END IF;
  IF NOT media_belongs_to(p_media_path, p_actor) THEN RAISE EXCEPTION 'Média invalide.'; END IF;

  INSERT INTO conversations (kind, created_by, mot, audience, event_id, media_path, media_kind,
                             media_fond, expires_at)
  VALUES ('sujet', p_actor, btrim(p_mot), p_audience, p_event, p_media_path, p_media_kind,
          p_media_fond, now() + interval '7 days')
  RETURNING id INTO v_id;

  INSERT INTO conversation_members (conversation_id, actor_id) VALUES (v_id, p_actor);
  -- Le mot est aussi le premier message du fil, avec son média et ses mentions.
  INSERT INTO messages (conversation_id, author_actor, body, media_path, media_kind, mentions)
  VALUES (v_id, p_actor, btrim(p_mot), p_media_path, p_media_kind, mentions_de(p_mot, p_mentions))
  RETURNING id INTO v_message;
  PERFORM prevenir_mentions(v_message, '[]'::jsonb);
  INSERT INTO sujet_views (conversation_id, actor_id) VALUES (v_id, p_actor);
  RETURN v_id;
END;
$function$;

DROP FUNCTION public.modifier_message(uuid, uuid, text);
CREATE FUNCTION public.modifier_message(p_actor uuid, p_message uuid, p_body text, p_mentions uuid[] DEFAULT NULL::uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_before JSONB;
  v_kind public.conversation_kind;
BEGIN
  PERFORM message_modifiable(p_actor, p_message);
  SELECT m.mentions, c.kind INTO v_before, v_kind
  FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE m.id = p_message;
  UPDATE messages
  SET body = NULLIF(btrim(p_body), ''), edited_at = now(),
      mentions = CASE WHEN v_kind = 'sujet' THEN mentions_de(p_body, p_mentions) ELSE '[]'::jsonb END
  WHERE id = p_message;
  -- Seuls les nouveaux tagués sont prévenus : corriger une faute ne relance personne.
  PERFORM prevenir_mentions(p_message, v_before);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.envoyer_message(uuid, uuid, text, text, message_media, uuid, uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.publier_sujet(uuid, text, sujet_audience, uuid, text, message_media, boolean, uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.modifier_message(uuid, uuid, text, uuid[]) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.envoyer_message(uuid, uuid, text, text, message_media, uuid, uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.publier_sujet(uuid, text, sujet_audience, uuid, text, message_media, boolean, uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.modifier_message(uuid, uuid, text, uuid[]) FROM PUBLIC, anon;
