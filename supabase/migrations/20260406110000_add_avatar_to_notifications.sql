-- Add actor_avatar_url to all notification triggers

-- 1. New follower
CREATE OR REPLACE FUNCTION notify_new_follower()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follower_name text;
  follower_avatar text;
BEGIN
  SELECT COALESCE(brand_name, display_name, 'Quelqu''un'), avatar_url
    INTO follower_name, follower_avatar
    FROM profiles WHERE id = NEW.follower_id;

  INSERT INTO notifications (user_id, type, data)
  VALUES (
    NEW.following_id,
    'new_follower',
    jsonb_build_object(
      'actor_id', NEW.follower_id,
      'actor_name', follower_name,
      'actor_avatar_url', follower_avatar,
      'follower_name', follower_name
    )
  );
  RETURN NEW;
END;
$$;

-- 2. Friend going
CREATE OR REPLACE FUNCTION notify_friend_going()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant_name text;
  participant_avatar text;
  event_name text;
  follower_record RECORD;
BEGIN
  SELECT COALESCE(brand_name, display_name, 'Un ami'), avatar_url
    INTO participant_name, participant_avatar
    FROM profiles WHERE id = NEW.user_id;

  SELECT name INTO event_name
    FROM events WHERE id = NEW.event_id;

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
        'actor_avatar_url', participant_avatar,
        'friend_name', participant_name,
        'event_id', NEW.event_id,
        'event_name', event_name
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- 3. Event created
CREATE OR REPLACE FUNCTION notify_event_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_name text;
  creator_avatar text;
  user_record RECORD;
BEGIN
  SELECT COALESCE(brand_name, display_name, 'Quelqu''un'), avatar_url
    INTO creator_name, creator_avatar
    FROM profiles WHERE id = NEW.created_by;

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
        'actor_avatar_url', creator_avatar,
        'event_id', NEW.id,
        'event_name', NEW.name
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- 4. Friend note
CREATE OR REPLACE FUNCTION notify_friend_note()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  author_name text;
  author_avatar text;
  event_name text;
  follower_record RECORD;
BEGIN
  SELECT COALESCE(brand_name, display_name, 'Un ami'), avatar_url
    INTO author_name, author_avatar
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
        'actor_avatar_url', author_avatar,
        'friend_name', author_name,
        'event_id', NEW.event_id,
        'event_name', event_name
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- 5. New exposant
CREATE OR REPLACE FUNCTION notify_new_exposant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  exposant_name text;
  exposant_avatar text;
  user_record RECORD;
BEGIN
  IF NEW.type != 'exposant' THEN
    RETURN NEW;
  END IF;
  IF OLD IS NOT NULL AND OLD.type = 'exposant' THEN
    RETURN NEW;
  END IF;

  exposant_name := COALESCE(NEW.brand_name, NEW.display_name, 'Un nouvel exposant');
  exposant_avatar := NEW.avatar_url;

  FOR user_record IN
    SELECT id FROM profiles WHERE id != NEW.id
  LOOP
    INSERT INTO notifications (user_id, type, data)
    VALUES (
      user_record.id,
      'new_exposant',
      jsonb_build_object(
        'actor_id', NEW.id,
        'actor_name', exposant_name,
        'actor_avatar_url', exposant_avatar
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;
