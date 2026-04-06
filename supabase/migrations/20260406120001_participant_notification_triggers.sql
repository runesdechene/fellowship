-- Notify participants when an event is updated (not everyone)
CREATE OR REPLACE FUNCTION notify_event_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant RECORD;
  updater_name text;
  updater_avatar text;
BEGIN
  -- Only fire on meaningful changes
  IF OLD.name = NEW.name
    AND OLD.city = NEW.city
    AND OLD.department = NEW.department
    AND OLD.start_date = NEW.start_date
    AND OLD.end_date = NEW.end_date
    AND OLD.description IS NOT DISTINCT FROM NEW.description
    AND OLD.registration_deadline IS NOT DISTINCT FROM NEW.registration_deadline
    AND OLD.registration_url IS NOT DISTINCT FROM NEW.registration_url
    AND OLD.external_url IS NOT DISTINCT FROM NEW.external_url
    AND OLD.image_url IS NOT DISTINCT FROM NEW.image_url
  THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(brand_name, display_name, 'Quelqu''un'), avatar_url
    INTO updater_name, updater_avatar
    FROM profiles WHERE id = auth.uid();

  -- Notify only participants of this event (not the updater)
  FOR participant IN
    SELECT DISTINCT user_id FROM participations WHERE event_id = NEW.id AND user_id != auth.uid()
  LOOP
    INSERT INTO notifications (user_id, type, data)
    VALUES (
      participant.user_id,
      'event_updated',
      jsonb_build_object(
        'actor_id', auth.uid(),
        'actor_name', updater_name,
        'actor_avatar_url', updater_avatar,
        'event_id', NEW.id,
        'event_name', NEW.name
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_event_updated ON events;
CREATE TRIGGER on_event_updated
  AFTER UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION notify_event_updated();
