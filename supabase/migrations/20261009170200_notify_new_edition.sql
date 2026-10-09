-- POURQUOI : quand l'édition suivante d'un festival est ajoutée (previous_edition_id posé à
-- l'insertion), prévenir les enseignes PRO qui étaient inscrites à l'édition précédente — alerte
-- du Pro (Dev.md, 07/10/2026). Ne réagit QU'À L'INSERTION : le rattrapage des liens (UPDATE) ne
-- prévient personne (piège des notifications en masse, docs/db/gotchas.md). Le créateur ne se
-- prévient pas, ni sous une autre casquette (même garde que notify_thread_question).
CREATE OR REPLACE FUNCTION public.notify_new_edition()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  prev_start date;
BEGIN
  IF NEW.is_private THEN RETURN NEW; END IF;

  SELECT e.start_date INTO prev_start FROM events e WHERE e.id = NEW.previous_edition_id;
  IF prev_start IS NULL THEN RETURN NEW; END IF;

  INSERT INTO notifications (actor_id, type, data)
  SELECT p.actor_id, 'new_edition',
    jsonb_build_object(
      'event_id', NEW.id, 'event_name', NEW.name,
      'start_date', NEW.start_date, 'end_date', NEW.end_date,
      'previous_event_id', NEW.previous_edition_id,
      'previous_year', extract(year FROM prev_start)::int
    )
  FROM participations p
  JOIN entities en ON en.actor_id = p.actor_id
  WHERE p.event_id = NEW.previous_edition_id
    AND p.status IN ('inscrit', 'confirme')
    AND (en.plan = 'pro' OR en.comped_pro_until > now())
    AND p.actor_id IS DISTINCT FROM NEW.created_by_actor
    AND NOT EXISTS (
      SELECT 1 FROM memberships mb
      WHERE mb.entity_actor_id = p.actor_id
        AND mb.user_actor_id IN (NEW.created_by_actor, NEW.acted_by_user_id)
    );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_new_edition ON events;
CREATE TRIGGER on_new_edition
  AFTER INSERT ON events
  FOR EACH ROW
  WHEN (NEW.previous_edition_id IS NOT NULL)
  EXECUTE FUNCTION notify_new_edition();
