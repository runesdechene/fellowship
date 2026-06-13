-- Événements privés (non répertoriés). Modèle unlisted : RLS lecture inchangée,
-- exclusion au niveau applicatif + RPC ; confidentialité = pas de listage + slug suffixé.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

-- Requêtes du créateur sur ses events privés (calendrier/cockpit lisent via participations,
-- mais l'index aide les éventuels scans created_by_actor).
CREATE INDEX IF NOT EXISTS idx_events_private_creator
  ON public.events (created_by_actor) WHERE is_private = true;

-- Slug : pour un event privé, suffixe hexa aléatoire non devinable (la capability du lien).
-- On réécrit events_set_slug en gardant le comportement public à l'identique.
CREATE OR REPLACE FUNCTION events_set_slug() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE base text; candidate text; n int := 1;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN RETURN NEW; END IF;
  base := events_base_slug(NEW.name, NEW.city);
  IF base = '' THEN base := 'festival'; END IF;
  IF NEW.is_private THEN
    -- Slug privé = la capability du lien (modèle unlisted) : ~122 bits d'entropie
    -- (UUID v4 sans tirets), JAMAIS de compteur prévisible. On régénère un suffixe
    -- frais en cas de collision. gen_random_uuid() est core (pas de dépendance pgcrypto).
    LOOP
      candidate := base || '-' || replace(gen_random_uuid()::text, '-', '');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM events WHERE slug = candidate AND id <> NEW.id);
    END LOOP;
    NEW.slug := candidate;
    RETURN NEW;
  END IF;
  -- Public : slug lisible « nom-ville » + compteur d'unicité (comportement existant inchangé).
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM events WHERE slug = candidate AND id <> NEW.id) LOOP
    n := n + 1; candidate := base || '-' || n;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

-- Dédup à la création : NE DOIT PAS révéler d'event privé. Recréée avec le garde.
CREATE OR REPLACE FUNCTION search_similar_events(
  search_name text,
  search_year int DEFAULT NULL,
  threshold float DEFAULT 0.25
)
RETURNS TABLE(id uuid, name text, city text, department text, start_date date, end_date date, score float)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id, e.name, e.city, e.department, e.start_date, e.end_date,
         similarity(lower(e.name), lower(search_name)) AS score
  FROM events e
  WHERE e.is_private = false
    AND similarity(lower(e.name), lower(search_name)) > threshold
    AND (search_year IS NULL OR EXTRACT(YEAR FROM e.start_date) = search_year)
  ORDER BY score DESC
  LIMIT 5;
$$;

-- Suggestions co-event : défensif (les privés sont solo, donc aucun co-participant,
-- mais on garde l'invariant explicite).
CREATE OR REPLACE FUNCTION get_coevent_suggestions(p_actor_id uuid)
RETURNS TABLE (suggested_actor uuid, shared_events bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p2.actor_id, count(DISTINCT p2.event_id)::bigint
  FROM participations p1
  JOIN events ev ON ev.id = p1.event_id AND ev.is_private = false
  JOIN participations p2 ON p2.event_id = p1.event_id
  JOIN actors a2 ON a2.id = p2.actor_id AND a2.kind = 'entity'
  WHERE can_act_as(p_actor_id)
    AND p1.actor_id = p_actor_id
    AND p1.status <> 'refuse'
    AND p2.actor_id IS NOT NULL
    AND p2.actor_id <> p_actor_id
    AND NOT can_act_as(p2.actor_id)
    AND p2.status <> 'refuse'
    AND p2.visibility = 'public'
    AND p2.actor_id NOT IN (
      SELECT following_actor FROM follows
      WHERE follower_actor = p_actor_id AND following_actor IS NOT NULL
    )
  GROUP BY p2.actor_id
  ORDER BY count(DISTINCT p2.event_id) DESC
  LIMIT 12;
$$;
GRANT EXECUTE ON FUNCTION get_coevent_suggestions(uuid) TO authenticated;
