-- 20261105210000_modifier_supprimer_message.sql
--
-- POURQUOI — Uriel veut pouvoir modifier ou supprimer un message envoyé, comme sur WhatsApp
-- (05/11/2026). Modifier réécrit le texte et note `edited_at` (« modifié » à côté de l'heure).
-- Supprimer efface la ligne pour tout le monde, réactions comprises (ON DELETE CASCADE) ; la photo
-- jointe devient illisible, puisque can_see_discussion_media ne trouve plus de message qui la porte.
-- Seul l'auteur le fait, au nom de l'acteur qui a écrit. Dans un sujet clôturé, plus personne
-- n'écrit : on ne modifie ni ne supprime plus rien non plus.
-- Additif : le code déployé ne lit pas `edited_at`.

ALTER TABLE public.messages ADD COLUMN edited_at TIMESTAMPTZ;

-- L'acteur peut-il toucher ce message ? Rend sa conversation, ou lève l'erreur à dire.
CREATE OR REPLACE FUNCTION public.message_modifiable(p_actor UUID, p_message UUID)
RETURNS UUID LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_conversation UUID;
  v_kind public.conversation_kind;
BEGIN
  IF NOT can_act_as(p_actor) THEN RAISE EXCEPTION 'Action non autorisée.'; END IF;
  SELECT m.conversation_id, c.kind INTO v_conversation, v_kind
  FROM messages m JOIN conversations c ON c.id = m.conversation_id
  WHERE m.id = p_message AND m.author_actor = p_actor;
  IF v_conversation IS NULL THEN RAISE EXCEPTION 'Message introuvable.'; END IF;
  IF v_kind = 'sujet' AND NOT sujet_is_open(v_conversation) THEN
    RAISE EXCEPTION 'Ce sujet est clôturé.';
  END IF;
  RETURN v_conversation;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.message_modifiable(UUID, UUID) FROM PUBLIC, anon, authenticated;

-- Un texte vide n'est permis que si le message garde sa photo (messages_non_vide).
CREATE OR REPLACE FUNCTION public.modifier_message(p_actor UUID, p_message UUID, p_body TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM message_modifiable(p_actor, p_message);
  UPDATE messages SET body = NULLIF(btrim(p_body), ''), edited_at = now() WHERE id = p_message;
END;
$$;

CREATE OR REPLACE FUNCTION public.supprimer_message(p_actor UUID, p_message UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM message_modifiable(p_actor, p_message);
  DELETE FROM messages WHERE id = p_message;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.modifier_message(UUID, UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.supprimer_message(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.modifier_message(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.supprimer_message(UUID, UUID) TO authenticated;
