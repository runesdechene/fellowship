-- ============================================================
-- Notification triggers — auto-create notifications on actions
-- ============================================================

-- 1. New follower → notify the person being followed
CREATE OR REPLACE FUNCTION notify_new_follower()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follower_name text;
BEGIN
  SELECT COALESCE(brand_name, display_name, 'Quelqu''un')
    INTO follower_name
    FROM profiles WHERE id = NEW.follower_id;

  INSERT INTO notifications (user_id, type, data)
  VALUES (
    NEW.following_id,
    'new_follower',
    jsonb_build_object(
      'actor_id', NEW.follower_id,
      'actor_name', follower_name,
      'follower_name', follower_name
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_follow ON follows;
CREATE TRIGGER on_new_follow
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_follower();

-- 2. New participation → notify followers of the participant (friend_going)
CREATE OR REPLACE FUNCTION notify_friend_going()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant_name text;
  event_name text;
  follower_record RECORD;
BEGIN
  SELECT COALESCE(brand_name, display_name, 'Un ami')
    INTO participant_name
    FROM profiles WHERE id = NEW.user_id;

  SELECT name INTO event_name
    FROM events WHERE id = NEW.event_id;

  -- Notify all followers of this user
  FOR follower_record IN
    SELECT follower_id FROM follows WHERE following_id = NEW.user_id
  LOOP
    INSERT INTO notifications (user_id, type, data)
    VALUES (
      follower_record.follower_id,
      'friend_going',
      jsonb_build_object(
        'actor_id', NEW.user_id,
        'actor_name', participant_name,
        'friend_name', participant_name,
        'event_id', NEW.event_id,
        'event_name', event_name
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_participation ON participations;
CREATE TRIGGER on_new_participation
  AFTER INSERT ON participations
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_going();

-- 3. New event → notify ALL users (broadcast for early-stage community)
CREATE OR REPLACE FUNCTION notify_event_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_name text;
  user_record RECORD;
BEGIN
  SELECT COALESCE(brand_name, display_name, 'Quelqu''un')
    INTO creator_name
    FROM profiles WHERE id = NEW.created_by;

  -- Notify all users except the creator
  FOR user_record IN
    SELECT id FROM profiles WHERE id != NEW.created_by
  LOOP
    INSERT INTO notifications (user_id, type, data)
    VALUES (
      user_record.id,
      'event_created',
      jsonb_build_object(
        'actor_id', NEW.created_by,
        'actor_name', creator_name,
        'event_id', NEW.id,
        'event_name', NEW.name
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_event_created ON events;
CREATE TRIGGER on_event_created
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION notify_event_created();

-- 4. New note on event → notify followers of the author (friend_note)
CREATE OR REPLACE FUNCTION notify_friend_note()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  author_name text;
  event_name text;
  follower_record RECORD;
BEGIN
  SELECT COALESCE(brand_name, display_name, 'Un ami')
    INTO author_name
    FROM profiles WHERE id = NEW.user_id;

  SELECT name INTO event_name
    FROM events WHERE id = NEW.event_id;

  FOR follower_record IN
    SELECT follower_id FROM follows WHERE following_id = NEW.user_id
  LOOP
    INSERT INTO notifications (user_id, type, data)
    VALUES (
      follower_record.follower_id,
      'friend_note',
      jsonb_build_object(
        'actor_id', NEW.user_id,
        'actor_name', author_name,
        'friend_name', author_name,
        'event_id', NEW.event_id,
        'event_name', event_name
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_note ON notes;
CREATE TRIGGER on_new_note
  AFTER INSERT ON notes
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_note();
