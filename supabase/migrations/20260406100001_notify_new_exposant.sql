-- Add new_exposant notification type
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_exposant';

-- Trigger: notify all users when a new exposant creates their account
CREATE OR REPLACE FUNCTION notify_new_exposant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  exposant_name text;
  user_record RECORD;
BEGIN
  -- Only fire for exposant profiles that just set their type (onboarding complete)
  IF NEW.type != 'exposant' THEN
    RETURN NEW;
  END IF;
  IF OLD IS NOT NULL AND OLD.type = 'exposant' THEN
    RETURN NEW;
  END IF;

  exposant_name := COALESCE(NEW.brand_name, NEW.display_name, 'Un nouvel exposant');

  FOR user_record IN
    SELECT id FROM profiles WHERE id != NEW.id
  LOOP
    INSERT INTO notifications (user_id, type, data)
    VALUES (
      user_record.id,
      'new_exposant',
      jsonb_build_object(
        'actor_id', NEW.id,
        'actor_name', exposant_name
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_exposant ON profiles;
CREATE TRIGGER on_new_exposant
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_exposant();
