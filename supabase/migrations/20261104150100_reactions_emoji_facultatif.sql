-- 20261104150100_reactions_emoji_facultatif.sql
--
-- POURQUOI — retirer sa réaction, c'est appeler reagir_message sans emoji. Les types générés ne
-- laissent omettre un paramètre que s'il a une valeur par défaut (même raison que
-- 20261104140000_discussions_parametres_facultatifs.sql). Définition reprise entière de
-- 20261104150000, seule la valeur par défaut change.

CREATE OR REPLACE FUNCTION public.reagir_message(p_actor UUID, p_message UUID, p_emoji TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_conversation UUID;
  v_kind public.conversation_kind;
BEGIN
  IF NOT can_act_as(p_actor) THEN RAISE EXCEPTION 'Action non autorisée.'; END IF;

  SELECT m.conversation_id, c.kind INTO v_conversation, v_kind
  FROM messages m JOIN conversations c ON c.id = m.conversation_id
  WHERE m.id = p_message;
  IF v_conversation IS NULL OR NOT can_see_conversation(v_conversation) THEN
    RAISE EXCEPTION 'Message introuvable.';
  END IF;
  IF v_kind = 'sujet' AND NOT sujet_is_open(v_conversation) THEN
    RAISE EXCEPTION 'Ce sujet est clôturé.';
  END IF;

  INSERT INTO message_reactions (message_id, actor_id, conversation_id, emoji)
  VALUES (p_message, p_actor, v_conversation, p_emoji)
  ON CONFLICT (message_id, actor_id)
  DO UPDATE SET emoji = EXCLUDED.emoji, updated_at = now();
END;
$$;
