-- POURQUOI : lot 8c (09/10/2026) — quand un ami (suivi dans les deux sens, vue `friends`) ajoute
-- une date publique, ses amis le savent tout de suite. Pas un broadcast : l'ancien
-- notify_event_created (une notification par utilisateur et par événement) a été retiré le
-- 11/06/2026 pour son volume ; ici, seuls les amis du créateur sont prévenus. Une enseigne dont le
-- créateur est membre ne se prévient pas elle-même (garde de notify_new_edition).
CREATE OR REPLACE FUNCTION public.notify_friend_added_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  creator_name text;
BEGIN
  IF NEW.is_private OR NEW.created_by_actor IS NULL THEN RETURN NEW; END IF;
  SELECT label INTO creator_name FROM actor_public WHERE actor_id = NEW.created_by_actor;
  IF creator_name IS NULL THEN RETURN NEW; END IF;

  INSERT INTO notifications (actor_id, type, data)
  SELECT f.friend_id, 'friend_added_event',
    jsonb_build_object(
      'actor_id', NEW.created_by_actor, 'actor_name', creator_name,
      'event_id', NEW.id, 'event_name', NEW.name, 'city', NEW.city,
      'start_date', NEW.start_date, 'end_date', NEW.end_date
    )
  FROM friends f
  WHERE f.user_id = NEW.created_by_actor
    AND f.friend_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM memberships mb
      WHERE mb.entity_actor_id = f.friend_id
        AND mb.user_actor_id IN (NEW.created_by_actor, NEW.acted_by_user_id)
    );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_event_added_notify_friends ON public.events;
CREATE TRIGGER on_event_added_notify_friends
  AFTER INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.notify_friend_added_event();
