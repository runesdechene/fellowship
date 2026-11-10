-- POURQUOI — le fil de Ma communauté engage la conversation (Uriel, 10/11/2026, maquette 2815:233) :
-- 1. « Écrire » sur la ligne d'un ami ouvre la conversation à deux, le festival joint au message.
--    Un message peut donc porter un festival (messages.event_id) ; envoyer_message le prend en
--    paramètre facultatif (le front déployé, qui ne l'envoie pas, continue de marcher).
--    Seule une fiche publique se joint : une fiche privée ne se montre pas par un message.
-- 2. Une arrivée reçoit « Souhaiter la bienvenue » : un abonnement, mais annoncé autrement. Le drapeau
--    vit sur l'abonnement (follows.welcome) ; le déclencheur des abonnés écrit alors une notification
--    « welcome » au lieu de « new_follower » : une seule notification, un seul push.
-- envoyer_message et notify_new_follower partent de leur définition live du 10/11/2026.

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'welcome';

ALTER TABLE public.follows ADD COLUMN welcome boolean NOT NULL DEFAULT false;

ALTER TABLE public.messages
  ADD COLUMN event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;

DROP FUNCTION public.envoyer_message(uuid, uuid, text, text, public.message_media);

CREATE FUNCTION public.envoyer_message(p_actor uuid, p_conversation uuid, p_body text DEFAULT NULL::text, p_media_path text DEFAULT NULL::text, p_media_kind message_media DEFAULT NULL::message_media, p_event uuid DEFAULT NULL::uuid)
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

  INSERT INTO messages (conversation_id, author_actor, body, media_path, media_kind, event_id)
  VALUES (p_conversation, p_actor, NULLIF(btrim(p_body), ''), p_media_path, p_media_kind, p_event)
  RETURNING id INTO v_id;
  UPDATE conversations SET last_message_at = now() WHERE id = p_conversation;
  UPDATE conversation_members SET last_read_at = now()
  WHERE conversation_id = p_conversation AND actor_id = p_actor;
  RETURN v_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.envoyer_message(uuid, uuid, text, text, public.message_media, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.envoyer_message(uuid, uuid, text, text, public.message_media, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_new_follower()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE follower_name text; follower_avatar text;
BEGIN
  SELECT COALESCE(label, 'Quelqu''un'), avatar_url INTO follower_name, follower_avatar
    FROM actor_public WHERE actor_id = NEW.follower_actor;
  INSERT INTO notifications (actor_id, type, data)
  VALUES (
    NEW.following_actor,
    (CASE WHEN NEW.welcome THEN 'welcome' ELSE 'new_follower' END)::notification_type,
    jsonb_build_object(
      'actor_id', NEW.follower_actor, 'actor_name', follower_name,
      'actor_avatar_url', follower_avatar, 'follower_name', follower_name
    )
  );
  RETURN NEW;
END; $function$;
