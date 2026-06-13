-- Sécurité événements privés : les triggers de notification sociale NE DOIVENT PAS
-- fan-out le nom + lien d'un event privé aux abonnés du créateur.
-- Fuite trouvée en revue finale : l'auto-participation du créateur (création d'un event
-- privé) déclenchait notify_friend_going → notif « X participe à <event privé> » à tous
-- ses abonnés, avec lien cliquable. Idem notify_friend_note pour une note sur event privé.
-- Fix : recréer les 2 fonctions (versions de 20260602130000, inchangées) + garde is_private.

-- 2. Friend going (on participations AFTER INSERT) : notifier les abonnes de l'acteur participant.
CREATE OR REPLACE FUNCTION notify_friend_going()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE participant_name text; participant_avatar text; event_name text; event_is_private boolean; follower_record RECORD;
BEGIN
  SELECT name, is_private INTO event_name, event_is_private FROM events WHERE id = NEW.event_id;
  IF event_is_private THEN RETURN NEW; END IF;  -- events privés : aucune notif sociale
  SELECT COALESCE(label, 'Un ami'), avatar_url INTO participant_name, participant_avatar
    FROM actor_public WHERE actor_id = NEW.actor_id;
  FOR follower_record IN
    SELECT follower_actor FROM follows WHERE following_actor = NEW.actor_id
  LOOP
    INSERT INTO notifications (actor_id, type, data)
    VALUES (
      follower_record.follower_actor, 'friend_going',
      jsonb_build_object(
        'actor_id', NEW.actor_id, 'actor_name', participant_name,
        'actor_avatar_url', participant_avatar, 'friend_name', participant_name,
        'event_id', NEW.event_id, 'event_name', event_name, 'status', NEW.status
      )
    );
  END LOOP;
  RETURN NEW;
END; $$;

-- 4. Friend note (on notes AFTER INSERT) : notifier les abonnes de l'acteur auteur.
CREATE OR REPLACE FUNCTION notify_friend_note()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE author_name text; author_avatar text; event_name text; event_is_private boolean; follower_record RECORD;
BEGIN
  SELECT name, is_private INTO event_name, event_is_private FROM events WHERE id = NEW.event_id;
  IF event_is_private THEN RETURN NEW; END IF;  -- events privés : aucune notif sociale
  SELECT COALESCE(label, 'Un ami'), avatar_url INTO author_name, author_avatar
    FROM actor_public WHERE actor_id = NEW.actor_id;
  FOR follower_record IN
    SELECT follower_actor FROM follows WHERE following_actor = NEW.actor_id
  LOOP
    INSERT INTO notifications (actor_id, type, data)
    VALUES (
      follower_record.follower_actor, 'friend_note',
      jsonb_build_object(
        'actor_id', NEW.actor_id, 'actor_name', author_name,
        'actor_avatar_url', author_avatar, 'friend_name', author_name,
        'event_id', NEW.event_id, 'event_name', event_name
      )
    );
  END LOOP;
  RETURN NEW;
END; $$;
