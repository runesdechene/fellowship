-- Plan 4 / Phase 1 : retrait de events.created_by (legacy -> profiles).
--
-- Apres le fix v0.7.198, plus aucun lecteur applicatif. Cote DB il ne reste que
-- notify_event_created() (lit NEW.created_by + resout le nom via profiles) et la FK.
-- L'ancienne policy events_update_creator (USING created_by = auth.uid()) a deja ete
-- supprimee (20260405120001). Le createur humain d'origine est preserve dans
-- events.acted_by_user_id (backfill 20260525120002:59), l'acteur dans created_by_actor.
--
-- Reecriture MINIMALE et iso-comportement du trigger : on ne change que ce qui
-- reference created_by. Destinataires inchanges (toutes les personnes sauf le createur).

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
  -- Nom/avatar du createur resolus via le modele acteur (created_by_actor),
  -- au lieu de la table legacy profiles via created_by.
  SELECT COALESCE(label, 'Quelqu''un'), avatar_url
    INTO creator_name, creator_avatar
    FROM actor_public WHERE actor_id = NEW.created_by_actor;

  -- Broadcast inchange : toutes les personnes sauf le createur humain.
  -- Exclusion par acted_by_user_id (= l'ancien created_by) puisque created_by est droppe.
  FOR user_record IN
    SELECT id FROM profiles WHERE id <> NEW.acted_by_user_id
  LOOP
    INSERT INTO notifications (user_id, type, data)
    VALUES (
      user_record.id,
      'event_created',
      jsonb_build_object(
        'actor_id', NEW.created_by_actor,
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

-- Plus aucune dependance sur la colonne : on la drop (la FK events_created_by_fkey part avec).
ALTER TABLE events DROP COLUMN created_by;
