-- POURQUOI : relecture du 19/10/2026. Un compte sans prénom (display_name nul) rendait la signature
-- nulle ; la cloche n'affiche pas une notification sans nom : l'admin n'apprenait jamais ce commentaire.
-- Définition live copiée entière, seule la signature change.
CREATE OR REPLACE FUNCTION public.notify_app_update_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  said jsonb;
BEGIN
  SELECT jsonb_build_object(
           'update_id', NEW.update_id,
           'comment_id', NEW.id,
           'title', (SELECT title FROM app_updates WHERE id = NEW.update_id),
           'actor_name', coalesce(u.display_name, 'Un exposant') || coalesce(' (' || e.brand_name || ')', ''))
    INTO said
    FROM users u LEFT JOIN entities e ON e.actor_id = NEW.entity_actor_id
    WHERE u.actor_id = NEW.actor_id;

  IF NEW.parent_id IS NULL THEN
    INSERT INTO notifications (actor_id, type, data)
    SELECT u.actor_id, 'app_update_comment', said
    FROM users u WHERE u.role = 'admin' AND u.actor_id <> NEW.actor_id;
  ELSE
    INSERT INTO notifications (actor_id, type, data)
    SELECT c.actor_id, 'app_update_reply', said
    FROM app_update_comments c WHERE c.id = NEW.parent_id AND c.actor_id <> NEW.actor_id;
  END IF;
  RETURN NEW;
END; $function$;
