-- POURQUOI : lot 8c (09/10/2026) — deux alertes qu'aucun geste ne déclenche :
--  · le rappel de clôture (Pro), chaque matin : la date limite tombe dans les 7 jours, l'enseigne
--    a laissé l'interrupteur allumé, elle est Pro ce jour-là ; une seule fois par festival et par
--    enseigne (une date limite saisie tard est rappelée le lendemain) ;
--  · le récapitulatif du mardi (Uriel : le lundi, les exposants roulent), toute la France, une
--    notification par personne, rien s'il n'y a aucune date nouvelle.
-- Les deux fonctions sont rejouables sans doublon (gardes « déjà envoyé »), et fermées à l'API.
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.send_deadline_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  today date := (now() AT TIME ZONE 'Europe/Paris')::date;
  sent integer;
BEGIN
  INSERT INTO notifications (actor_id, type, data)
  SELECT p.actor_id, 'deadline_reminder',
    jsonb_build_object(
      'event_id', e.id, 'event_name', e.name,
      'deadline', e.registration_deadline,
      'days_left', e.registration_deadline - today
    )
  FROM participations p
  JOIN events e ON e.id = p.event_id
  JOIN entities en ON en.actor_id = p.actor_id
  WHERE p.remind_deadline
    AND NOT e.is_private
    AND e.registration_deadline BETWEEN today AND today + 7
    AND (en.plan = 'pro' OR en.comped_pro_until > now())
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.actor_id = p.actor_id
        AND n.type = 'deadline_reminder'
        AND n.data->>'event_id' = e.id::text
    );
  GET DIAGNOSTICS sent = ROW_COUNT;
  RETURN sent;
END; $$;

CREATE OR REPLACE FUNCTION public.send_weekly_new_events()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  added integer;
  sent integer;
BEGIN
  SELECT count(*) INTO added
    FROM events
    WHERE NOT is_private AND created_at >= now() - interval '7 days';
  IF added = 0 THEN RETURN 0; END IF;

  INSERT INTO notifications (actor_id, type, data)
  SELECT a.id, 'weekly_new_events', jsonb_build_object('count', added)
  FROM actors a
  WHERE a.kind = 'person'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.actor_id = a.id
        AND n.type = 'weekly_new_events'
        AND n.created_at >= now() - interval '6 days'
    );
  GET DIAGNOSTICS sent = ROW_COUNT;
  RETURN sent;
END; $$;

REVOKE EXECUTE ON FUNCTION public.send_deadline_reminders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_weekly_new_events() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('rappels-de-cloture', '0 7 * * *', $$SELECT public.send_deadline_reminders()$$);
SELECT cron.schedule('recapitulatif-du-mardi', '0 7 * * 2', $$SELECT public.send_weekly_new_events()$$);
