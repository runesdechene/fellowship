-- Plan 4 / Phase 2 : sous-systeme notifications -> modele acteur, drop notifications.user_id.
--
-- Constat : les triggers lisaient les colonnes legacy (NEW.user_id sur participations/notes,
-- NEW.follower_id/following_id sur follows) que l'app NE REMPLIT PLUS (elle ecrit actor_id /
-- follower_actor / following_actor). Resultat : friend_going / friend_note / new_follower
-- inseraient des notifs avec destinataire NULL = invisibles. Cette migration REPARE ca en plus
-- de nettoyer : les triggers lisent les colonnes acteur et ecrivent notifications.actor_id.
--
-- Destinataire = actor_id (personne OU entite). Le nom de l'acteur est resolu via actor_public.

-- 1. New follower (on follows AFTER INSERT) : notifier l'acteur suivi.
CREATE OR REPLACE FUNCTION notify_new_follower()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE follower_name text; follower_avatar text;
BEGIN
  SELECT COALESCE(label, 'Quelqu''un'), avatar_url INTO follower_name, follower_avatar
    FROM actor_public WHERE actor_id = NEW.follower_actor;
  INSERT INTO notifications (actor_id, type, data)
  VALUES (
    NEW.following_actor, 'new_follower',
    jsonb_build_object(
      'actor_id', NEW.follower_actor, 'actor_name', follower_name,
      'actor_avatar_url', follower_avatar, 'follower_name', follower_name
    )
  );
  RETURN NEW;
END; $$;

-- 2. Friend going (on participations AFTER INSERT) : notifier les abonnes de l'acteur participant.
CREATE OR REPLACE FUNCTION notify_friend_going()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE participant_name text; participant_avatar text; event_name text; follower_record RECORD;
BEGIN
  SELECT COALESCE(label, 'Un ami'), avatar_url INTO participant_name, participant_avatar
    FROM actor_public WHERE actor_id = NEW.actor_id;
  SELECT name INTO event_name FROM events WHERE id = NEW.event_id;
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

-- 3. Event created (on events AFTER INSERT) : broadcast a toutes les personnes sauf le createur.
CREATE OR REPLACE FUNCTION notify_event_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE creator_name text; creator_avatar text; user_record RECORD;
BEGIN
  SELECT COALESCE(label, 'Quelqu''un'), avatar_url INTO creator_name, creator_avatar
    FROM actor_public WHERE actor_id = NEW.created_by_actor;
  FOR user_record IN
    SELECT actor_id FROM users WHERE actor_id <> NEW.acted_by_user_id
  LOOP
    INSERT INTO notifications (actor_id, type, data)
    VALUES (
      user_record.actor_id, 'event_created',
      jsonb_build_object(
        'actor_id', NEW.created_by_actor, 'actor_name', creator_name,
        'actor_avatar_url', creator_avatar, 'event_id', NEW.id, 'event_name', NEW.name
      )
    );
  END LOOP;
  RETURN NEW;
END; $$;

-- 4. Friend note (on notes AFTER INSERT) : notifier les abonnes de l'acteur auteur.
CREATE OR REPLACE FUNCTION notify_friend_note()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE author_name text; author_avatar text; event_name text; follower_record RECORD;
BEGIN
  SELECT COALESCE(label, 'Un ami'), avatar_url INTO author_name, author_avatar
    FROM actor_public WHERE actor_id = NEW.actor_id;
  SELECT name INTO event_name FROM events WHERE id = NEW.event_id;
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

-- 5. Event updated (on events AFTER UPDATE) : notifier les acteurs participants sauf l'updater.
CREATE OR REPLACE FUNCTION notify_event_updated()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE participant RECORD; updater_name text; updater_avatar text;
BEGIN
  IF OLD.name = NEW.name AND OLD.city = NEW.city AND OLD.department = NEW.department
    AND OLD.start_date = NEW.start_date AND OLD.end_date = NEW.end_date
    AND OLD.description IS NOT DISTINCT FROM NEW.description
    AND OLD.registration_deadline IS NOT DISTINCT FROM NEW.registration_deadline
    AND OLD.registration_url IS NOT DISTINCT FROM NEW.registration_url
    AND OLD.external_url IS NOT DISTINCT FROM NEW.external_url
    AND OLD.image_url IS NOT DISTINCT FROM NEW.image_url
  THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(label, 'Quelqu''un'), avatar_url INTO updater_name, updater_avatar
    FROM actor_public WHERE actor_id = auth.uid();
  FOR participant IN
    SELECT DISTINCT actor_id FROM participations WHERE event_id = NEW.id AND actor_id <> auth.uid()
  LOOP
    INSERT INTO notifications (actor_id, type, data)
    VALUES (
      participant.actor_id, 'event_updated',
      jsonb_build_object(
        'actor_id', auth.uid(), 'actor_name', updater_name,
        'actor_avatar_url', updater_avatar, 'event_id', NEW.id, 'event_name', NEW.name
      )
    );
  END LOOP;
  RETURN NEW;
END; $$;

-- 6. new_exposant : trigger MORT (plus aucun chemin ne met profiles.type='exposant' ; les
--    exposants sont des entities via create_owned_entity). On le retire ; il sera reimplemente
--    sur entities en Phase 5. Permet de dropper notifications.user_id (il y ecrivait).
DROP TRIGGER IF EXISTS on_new_exposant ON profiles;
DROP FUNCTION IF EXISTS notify_new_exposant();

-- RLS : possession au niveau acteur.
DROP POLICY IF EXISTS notifications_owner_only ON notifications;
CREATE POLICY notifications_owner_only ON notifications FOR ALL TO authenticated
  USING (can_act_as(actor_id)) WITH CHECK (can_act_as(actor_id));

-- Backfill defensif + purge des orphelins (notifs jamais visibles : actor_id NULL).
UPDATE notifications SET actor_id = user_id WHERE actor_id IS NULL AND user_id IS NOT NULL;
DELETE FROM notifications WHERE actor_id IS NULL;
ALTER TABLE notifications ALTER COLUMN actor_id SET NOT NULL;

-- Drop de la colonne legacy (la FK notifications_user_id_fkey -> profiles part avec).
ALTER TABLE notifications DROP COLUMN user_id;
