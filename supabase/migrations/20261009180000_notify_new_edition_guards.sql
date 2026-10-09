-- POURQUOI : revue de sécurité du lot 8b (09/10/2026) — n'importe qui pouvait créer un événement
-- se déclarant « nouvelle édition » de n'importe quel festival, et faire écrire aux exposants Pro
-- de ce festival une notification trompeuse. Relier reste ouvert à tous (dans l'annuaire, c'est
-- souvent un autre exposant qui ajoute l'année suivante) ; on resserre ce qui DÉCLENCHE l'alerte :
--   • l'édition précédente est publique ;
--   • la nouvelle commence entre 6 mois et 25 mois après elle ;
--   • les noms se ressemblent (pg_trgm, même outil que search_similar_events) ;
--   • une seule alerte par édition précédente : le premier lien prévient, les suivants non.
-- Définition reprise ENTIÈRE de 20261009170200, seules ces gardes sont ajoutées.
CREATE OR REPLACE FUNCTION public.notify_new_edition()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  prev_start date;
  prev_name text;
BEGIN
  IF NEW.is_private THEN RETURN NEW; END IF;

  SELECT e.start_date, e.name INTO prev_start, prev_name
    FROM events e
    WHERE e.id = NEW.previous_edition_id AND NOT e.is_private;
  IF prev_start IS NULL THEN RETURN NEW; END IF;

  IF NEW.start_date < prev_start + 180 OR NEW.start_date > prev_start + 760 THEN
    RETURN NEW;
  END IF;
  IF similarity(lower(NEW.name), lower(prev_name)) < 0.4 THEN
    RETURN NEW;
  END IF;
  -- Une seule alerte par édition : si un autre événement la désignait déjà, il a prévenu.
  IF EXISTS (
    SELECT 1 FROM events o
    WHERE o.previous_edition_id = NEW.previous_edition_id AND o.id <> NEW.id
  ) THEN
    RETURN NEW;
  END IF;

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
