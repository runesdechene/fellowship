-- 20261104150000_reactions_messages.sql
--
-- POURQUOI — Uriel veut réagir aux messages comme sur WhatsApp (04/11/2026, maquette Story) : un
-- appui long sur une bulle, un emoji, et la pastille s'affiche sous la bulle pour tout le monde.
--
-- Une réaction par personne et par message : en choisir une autre la remplace, toucher la même la
-- retire. La retirer met `emoji` à NULL au lieu d'effacer la ligne : le temps réel ne sait pas
-- filtrer un DELETE par conversation, il sait filtrer un UPDATE.
-- `conversation_id` est recopié depuis le message, pour la même raison (le filtre du temps réel)
-- et pour la policy de lecture.
-- Tout est additif : aucune table lue par le code déployé ne change.

CREATE TABLE public.message_reactions (
  message_id      UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  actor_id        UUID NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  -- Un emoji tel que le clavier le donne (un drapeau ou une famille tient sur plusieurs points de code).
  emoji           TEXT CHECK (emoji IS NULL OR emoji ~ '^\S{1,16}$'),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, actor_id)
);
CREATE INDEX idx_message_reactions_conversation ON public.message_reactions(conversation_id);
CREATE INDEX idx_message_reactions_actor ON public.message_reactions(actor_id);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.message_reactions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.message_reactions FROM authenticated;

-- On voit les réactions des conversations qu'on peut lire, comme les messages.
CREATE POLICY message_reactions_select ON public.message_reactions FOR SELECT TO authenticated
  USING (can_see_conversation(conversation_id));

-- Réagit au nom de l'acteur actif ; p_emoji NULL retire la réaction.
CREATE OR REPLACE FUNCTION public.reagir_message(p_actor UUID, p_message UUID, p_emoji TEXT)
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

REVOKE EXECUTE ON FUNCTION public.reagir_message(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reagir_message(UUID, UUID, TEXT) TO authenticated;

-- Les pastilles se mettent à jour chez tout le monde sans recharger.
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
