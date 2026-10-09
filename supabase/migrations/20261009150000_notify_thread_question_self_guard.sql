-- POURQUOI : relecture du lot 8a (09/10/2026) — l'auteur d'une question pouvait se prévenir
-- lui-même : posée comme personne, la question alertait sa propre enseigne inscrite (la V2 lit
-- toutes les casquettes de l'utilisateur). Définition reprise ENTIÈRE de la version appliquée
-- (20261009120200), seule la garde « memberships » est ajoutée.
CREATE OR REPLACE FUNCTION public.notify_thread_question()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ev_name text; ev_private boolean;
  asker_name text; asker_avatar text;
BEGIN
  SELECT e.name, e.is_private INTO ev_name, ev_private FROM events e WHERE e.id = NEW.event_id;
  IF ev_name IS NULL OR ev_private THEN RETURN NEW; END IF;

  SELECT COALESCE(label, 'Quelqu''un'), avatar_url INTO asker_name, asker_avatar
    FROM actor_public WHERE actor_id = NEW.actor_id;

  INSERT INTO notifications (actor_id, type, data)
  SELECT p.actor_id, 'thread_question',
    jsonb_build_object(
      'actor_id', NEW.actor_id, 'actor_name', asker_name, 'actor_avatar_url', asker_avatar,
      'event_id', NEW.event_id, 'event_name', ev_name,
      'thread_id', NEW.id, 'thread_title', NEW.title
    )
  FROM participations p
  JOIN entities en ON en.actor_id = p.actor_id AND en.type = 'exposant'
  WHERE p.event_id = NEW.event_id
    AND p.status IN ('en_cours', 'inscrit', 'confirme')
    AND p.actor_id <> NEW.actor_id
    -- L'auteur ne se prévient pas lui-même, même sous une autre casquette : une question posée
    -- comme personne n'alerte pas les enseignes de cette personne (ni l'inverse).
    AND NOT EXISTS (
      SELECT 1 FROM memberships mb
      WHERE mb.entity_actor_id = p.actor_id
        AND mb.user_actor_id IN (NEW.actor_id, NEW.acted_by_user_id)
    )
    AND NOT EXISTS (
      SELECT 1 FROM discussion_mutes m
      WHERE m.actor_id = p.actor_id AND m.event_id = NEW.event_id
    );
  RETURN NEW;
END; $$;

