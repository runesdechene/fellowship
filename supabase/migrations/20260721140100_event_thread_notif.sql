-- Notif « thread_reply » : quelqu'un répond à ta question.
--  - garde anti-auto-notif : auteur du thread == répondeur -> rien.
--  - garde is_private : thread sur event privé -> rien.
CREATE OR REPLACE FUNCTION public.notify_thread_reply()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  thread_author uuid;
  thread_title  text;
  ev_id uuid; ev_name text; ev_private boolean;
  replier_name text; replier_avatar text;
BEGIN
  SELECT t.actor_id, t.title, t.event_id INTO thread_author, thread_title, ev_id
    FROM event_threads t WHERE t.id = NEW.thread_id;
  IF thread_author IS NULL OR thread_author = NEW.actor_id THEN
    RETURN NEW;
  END IF;

  SELECT e.name, e.is_private INTO ev_name, ev_private FROM events e WHERE e.id = ev_id;
  IF ev_private THEN RETURN NEW; END IF;

  SELECT COALESCE(label, 'Quelqu''un'), avatar_url INTO replier_name, replier_avatar
    FROM actor_public WHERE actor_id = NEW.actor_id;

  INSERT INTO notifications (actor_id, type, data)
  VALUES (
    thread_author, 'thread_reply',
    jsonb_build_object(
      'actor_id', NEW.actor_id, 'actor_name', replier_name, 'actor_avatar_url', replier_avatar,
      'event_id', ev_id, 'event_name', ev_name,
      'thread_id', NEW.thread_id, 'thread_title', thread_title
    )
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_thread_reply ON event_thread_replies;
CREATE TRIGGER on_thread_reply
  AFTER INSERT ON event_thread_replies
  FOR EACH ROW EXECUTE FUNCTION notify_thread_reply();

-- Notif « best_reply » : ta réponse a été élue meilleure réponse.
--  - déclenchée seulement quand best_reply_id passe à une valeur non nulle (ou change).
--  - garde anti-auto-notif : auteur de la réponse == auteur du thread -> rien.
--  - garde is_private.
CREATE OR REPLACE FUNCTION public.notify_best_reply()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  reply_author uuid;
  ev_name text; ev_private boolean;
  thread_author_name text;
BEGIN
  IF NEW.best_reply_id IS NULL OR NEW.best_reply_id IS NOT DISTINCT FROM OLD.best_reply_id THEN
    RETURN NEW;
  END IF;

  SELECT r.actor_id INTO reply_author
    FROM event_thread_replies r WHERE r.id = NEW.best_reply_id;
  IF reply_author IS NULL OR reply_author = NEW.actor_id THEN
    RETURN NEW;                         -- l'auteur du thread élit sa propre réponse
  END IF;

  SELECT e.name, e.is_private INTO ev_name, ev_private FROM events e WHERE e.id = NEW.event_id;
  IF ev_private THEN RETURN NEW; END IF;

  SELECT COALESCE(label, 'L''auteur') INTO thread_author_name
    FROM actor_public WHERE actor_id = NEW.actor_id;

  INSERT INTO notifications (actor_id, type, data)
  VALUES (
    reply_author, 'best_reply',
    jsonb_build_object(
      'actor_id', NEW.actor_id, 'actor_name', thread_author_name,
      'event_id', NEW.event_id, 'event_name', ev_name,
      'thread_id', NEW.id, 'thread_title', NEW.title
    )
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_best_reply ON event_threads;
CREATE TRIGGER on_best_reply
  AFTER UPDATE OF best_reply_id ON event_threads
  FOR EACH ROW EXECUTE FUNCTION notify_best_reply();
