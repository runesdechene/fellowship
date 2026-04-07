-- Add participation status to friend_going notification data
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
  SELECT COALESCE(brand_name, display_name) INTO participant_name
    FROM profiles WHERE id = NEW.user_id;

  SELECT avatar_url INTO participant_avatar
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
        'event_name', event_name,
        'status', NEW.status
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;
