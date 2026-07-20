-- Trigger de notif « review_reply » (la valeur d'enum est ajoutée par la migration
-- précédente 20260721100050, committée avant ce fichier).
-- Notifie l'auteur de l'AVIS quand quelqu'un y répond.
--  - garde anti-auto-notif : auteur de l'avis == répondeur -> rien.
--  - garde is_private : avis sur event privé -> rien (cohérence notify_friend_*).
CREATE OR REPLACE FUNCTION notify_review_reply()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  review_author uuid;
  ev_id uuid;
  ev_name text;
  ev_private boolean;
  replier_name text;
  replier_avatar text;
BEGIN
  SELECT r.actor_id, r.event_id INTO review_author, ev_id
    FROM reviews r WHERE r.id = NEW.review_id;
  IF review_author IS NULL OR review_author = NEW.actor_id THEN
    RETURN NEW;                          -- pas d'auteur, ou on répond à soi-même
  END IF;

  SELECT e.name, e.is_private INTO ev_name, ev_private FROM events e WHERE e.id = ev_id;
  IF ev_private THEN RETURN NEW; END IF; -- avis sur event privé : aucune notif

  SELECT COALESCE(label, 'Un exposant'), avatar_url INTO replier_name, replier_avatar
    FROM actor_public WHERE actor_id = NEW.actor_id;

  INSERT INTO notifications (actor_id, type, data)
  VALUES (
    review_author, 'review_reply',
    jsonb_build_object(
      'actor_id', NEW.actor_id, 'actor_name', replier_name,
      'actor_avatar_url', replier_avatar,
      'event_id', ev_id, 'event_name', ev_name, 'review_id', NEW.review_id
    )
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_review_reply ON review_replies;
CREATE TRIGGER on_review_reply
  AFTER INSERT ON review_replies
  FOR EACH ROW EXECUTE FUNCTION notify_review_reply();
