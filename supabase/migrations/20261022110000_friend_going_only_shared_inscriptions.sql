-- POURQUOI — « X s'est inscrit à Y, où tu vas aussi » partait vers TOUS les abonnés de X dès qu'il
-- ajoutait une participation, quel que soit son statut : un simple « intéressé » ou un dossier en
-- cours se lisait « inscrit », et la notification arrivait à des comptes qui n'allaient pas à Y
-- (Uriel, 22/10/2026 : « Je ne vais pas à Stars Books »). Elle ignorait aussi la visibilité : une
-- participation « amis » ou « privée » était annoncée à tous les abonnés.
--
-- Désormais la notification part quand X devient inscrit (inscrit ou confirmé), à l'insertion ou
-- au changement de statut, et seulement vers ses abonnés eux-mêmes inscrits à Y. Ces deux statuts
-- sont toujours publics (déclencheur participations_inscrit_public) : rien de caché n'est révélé.
--
-- Partie de la définition live de notify_friend_going (pg_get_functiondef, 22/10/2026).

CREATE OR REPLACE FUNCTION public.notify_friend_going()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE participant_name text; participant_avatar text; event_name text; event_is_private boolean; follower_record RECORD;
BEGIN
  IF NEW.status NOT IN ('inscrit', 'confirme') THEN RETURN NEW; END IF;
  -- Passer d'inscrit à confirmé n'est pas une nouvelle inscription.
  IF TG_OP = 'UPDATE' AND OLD.status IN ('inscrit', 'confirme') THEN RETURN NEW; END IF;
  SELECT name, is_private INTO event_name, event_is_private FROM events WHERE id = NEW.event_id;
  IF event_is_private THEN RETURN NEW; END IF;  -- events privés : aucune notif sociale
  SELECT COALESCE(label, 'Un ami'), avatar_url INTO participant_name, participant_avatar
    FROM actor_public WHERE actor_id = NEW.actor_id;
  FOR follower_record IN
    SELECT f.follower_actor FROM follows f
    WHERE f.following_actor = NEW.actor_id
      AND EXISTS (
        SELECT 1 FROM participations mine
        WHERE mine.actor_id = f.follower_actor
          AND mine.event_id = NEW.event_id
          AND mine.status IN ('inscrit', 'confirme')
      )
  LOOP
    INSERT INTO notifications (actor_id, type, data)
    VALUES (
      follower_record.follower_actor, 'friend_going',
      jsonb_build_object(
        'actor_id', NEW.actor_id, 'actor_name', participant_name,
        'actor_avatar_url', participant_avatar, 'friend_name', participant_name,
        'event_id', NEW.event_id, 'event_name', event_name, 'status', NEW.status
      )
    );
  END LOOP;
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS on_new_participation ON public.participations;
CREATE TRIGGER on_new_participation
  AFTER INSERT OR UPDATE OF status ON public.participations
  FOR EACH ROW EXECUTE FUNCTION notify_friend_going();
