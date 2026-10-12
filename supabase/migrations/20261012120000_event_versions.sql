-- POURQUOI — lot 10c (Uriel, 12/10/2026) : la fiche d'un événement est partagée ; une fiche
-- publique se modifie par tout compte connecté, une privée par son seul créateur. Chaque
-- enregistrement garde une copie complète (méthode des lieux de Runes de Chêne) pour que « L'histoire
-- de la fiche » montre ce que chacun a ajouté ou retiré, et qu'un admin puisse revenir en arrière.
-- Une seule porte d'écriture (modifier_evenement) ; la mise à jour directe d'events sera fermée par
-- la migration du jour de la bascule (20261012130000). La version d'origine s'écrit au premier
-- changement : les fiches existantes n'ont rien à reprendre.

CREATE TABLE public.event_versions (
  id bigserial PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  author_user uuid REFERENCES public.users(actor_id) ON DELETE SET NULL,
  author_entity uuid REFERENCES public.entities(actor_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  note text CHECK (char_length(note) <= 140),
  name text NOT NULL,
  address text,
  city text NOT NULL,
  department text NOT NULL,
  latitude double precision,
  longitude double precision,
  geo_precision text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  tags text[],
  image_url text,
  registration_deadline date,
  registration_note text,
  registration_url text,
  contact_email text,
  external_url text,
  description text
);
CREATE INDEX event_versions_event_idx ON public.event_versions (event_id, id DESC);
CREATE INDEX event_versions_author_day_idx ON public.event_versions (author_user, created_at);
ALTER TABLE public.event_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_versions FROM PUBLIC, anon, authenticated;

-- Qui peut voir une fiche dans l'histoire : publique, tous ; privée, son créateur.
CREATE FUNCTION public._evenement_lisible(p_event uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM events e WHERE e.id = p_event
                 AND (NOT e.is_private OR can_act_as(e.created_by_actor)));
$$;

CREATE FUNCTION public.modifier_evenement(
  p_event uuid, p_fields jsonb, p_expected_version bigint,
  p_note text DEFAULT NULL, p_as_entity uuid DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  me uuid := auth.uid();
  e events%ROWTYPE;
  n events%ROWTYPE;
  latest bigint;
  latest_author text;
  entity uuid;
  allowed text[] := ARRAY['name','address','city','department','latitude','longitude',
    'geo_precision','start_date','end_date','tags','image_url','registration_deadline',
    'registration_note','registration_url','contact_email','external_url','description'];
  new_id bigint;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Connecte-toi pour modifier une fiche.'; END IF;
  SELECT * INTO e FROM events WHERE id = p_event FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cette fiche n''existe plus.'; END IF;
  IF e.is_private AND NOT can_act_as(e.created_by_actor) THEN
    RAISE EXCEPTION 'Seul son créateur modifie une fiche privée.';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_fields) k WHERE k <> ALL (allowed)) THEN
    RAISE EXCEPTION 'Ce champ ne se modifie pas ici.';
  END IF;

  SELECT v.id, u.display_name INTO latest, latest_author
    FROM event_versions v LEFT JOIN users u ON u.actor_id = v.author_user
   WHERE v.event_id = p_event ORDER BY v.id DESC LIMIT 1;
  IF latest IS DISTINCT FROM p_expected_version THEN
    RAISE EXCEPTION '% vient de modifier la fiche — recharge pour voir sa version.',
      COALESCE(latest_author, 'Quelqu''un');
  END IF;

  IF (SELECT count(*) FROM event_versions
       WHERE author_user = me AND created_at > now() - interval '1 day') >= 50 THEN
    RAISE EXCEPTION 'Tu as fait beaucoup de modifications aujourd''hui : reviens demain.';
  END IF;

  n := jsonb_populate_record(e, p_fields);
  IF char_length(trim(n.name)) < 3 THEN RAISE EXCEPTION 'Le nom fait au moins trois lettres.'; END IF;
  IF trim(coalesce(n.city, '')) = '' THEN RAISE EXCEPTION 'La ville est nécessaire.'; END IF;
  IF trim(coalesce(n.department, '')) = '' THEN RAISE EXCEPTION 'Le département est nécessaire.'; END IF;
  IF n.end_date < n.start_date THEN RAISE EXCEPTION 'La date de fin tombe avant le début.'; END IF;
  IF p_note IS NOT NULL AND char_length(p_note) > 140 THEN
    RAISE EXCEPTION 'Le mot fait 140 caractères au plus.';
  END IF;

  IF ROW(e.name, e.address, e.city, e.department, e.latitude, e.longitude, e.geo_precision,
         e.start_date, e.end_date, e.tags, e.image_url, e.registration_deadline,
         e.registration_note, e.registration_url, e.contact_email, e.external_url, e.description)
     IS NOT DISTINCT FROM
     ROW(n.name, n.address, n.city, n.department, n.latitude, n.longitude, n.geo_precision,
         n.start_date, n.end_date, n.tags, n.image_url, n.registration_deadline,
         n.registration_note, n.registration_url, n.contact_email, n.external_url, n.description)
  THEN
    RAISE EXCEPTION 'Rien n''a changé.';
  END IF;

  -- La fiche d'origine devient la première version, avec son créateur et sa date.
  IF latest IS NULL THEN
    INSERT INTO event_versions (event_id, author_user, author_entity, created_at, name, address,
      city, department, latitude, longitude, geo_precision, start_date, end_date, tags, image_url,
      registration_deadline, registration_note, registration_url, contact_email, external_url,
      description)
    VALUES (e.id,
      (SELECT actor_id FROM users WHERE actor_id IN (e.acted_by_user_id, e.created_by_actor) LIMIT 1),
      (SELECT actor_id FROM entities WHERE actor_id = e.created_by_actor),
      e.created_at, e.name, e.address, e.city, e.department, e.latitude, e.longitude,
      e.geo_precision, e.start_date, e.end_date, e.tags, e.image_url, e.registration_deadline,
      e.registration_note, e.registration_url, e.contact_email, e.external_url, e.description);
  END IF;

  UPDATE events SET name = trim(n.name), address = n.address, city = trim(n.city),
    department = trim(n.department), latitude = n.latitude, longitude = n.longitude,
    geo_precision = n.geo_precision, start_date = n.start_date, end_date = n.end_date,
    tags = n.tags, image_url = n.image_url, registration_deadline = n.registration_deadline,
    registration_note = n.registration_note, registration_url = n.registration_url,
    contact_email = n.contact_email, external_url = n.external_url, description = n.description,
    acted_by_user_id = me
  WHERE id = p_event;

  SELECT actor_id INTO entity FROM entities WHERE actor_id = p_as_entity AND can_act_as(p_as_entity);
  INSERT INTO event_versions (event_id, author_user, author_entity, note, name, address, city,
    department, latitude, longitude, geo_precision, start_date, end_date, tags, image_url,
    registration_deadline, registration_note, registration_url, contact_email, external_url,
    description)
  SELECT id, me, entity, nullif(trim(p_note), ''), name, address, city, department, latitude,
    longitude, geo_precision, start_date, end_date, tags, image_url, registration_deadline,
    registration_note, registration_url, contact_email, external_url, description
  FROM events WHERE id = p_event
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;

CREATE FUNCTION public.revenir_a_version_evenement(p_version bigint) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v event_versions%ROWTYPE; latest bigint;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Réservé aux admins.'; END IF;
  SELECT * INTO v FROM event_versions WHERE id = p_version;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cette version n''existe plus.'; END IF;
  SELECT max(id) INTO latest FROM event_versions WHERE event_id = v.event_id;
  RETURN modifier_evenement(v.event_id,
    to_jsonb(v) - ARRAY['id','event_id','author_user','author_entity','created_at','note'],
    latest, 'Retour à la version du ' || to_char(v.created_at, 'DD/MM/YYYY'), NULL);
END; $$;

CREATE FUNCTION public.histoire_evenement(p_event uuid)
RETURNS TABLE(id bigint, created_at timestamptz, author_name text, author_brand text,
  author_avatar text, note text, changed text[], is_origin boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH snap AS (
    SELECT v.id, v.created_at, v.author_user, v.author_entity, v.note,
           to_jsonb(v) - ARRAY['id','event_id','author_user','author_entity','created_at','note'] AS fields
      FROM event_versions v WHERE v.event_id = p_event AND _evenement_lisible(p_event)
  ), seq AS (
    SELECT s.*, lag(s.fields) OVER (ORDER BY s.id) AS before FROM snap s
  )
  SELECT seq.id, seq.created_at, u.display_name, en.brand_name, u.avatar_url, seq.note,
         CASE WHEN seq.before IS NULL THEN ARRAY[]::text[]
              ELSE ARRAY(SELECT f.key FROM jsonb_each(seq.fields) f
                          WHERE f.value IS DISTINCT FROM seq.before -> f.key ORDER BY f.key) END,
         seq.before IS NULL
    FROM seq
    LEFT JOIN users u ON u.actor_id = seq.author_user
    LEFT JOIN entities en ON en.actor_id = seq.author_entity
  UNION ALL
  -- Jamais modifiée : la fiche d'origine, sans version écrite.
  SELECT NULL::bigint, e.created_at, u.display_name, en.brand_name, u.avatar_url, NULL,
         ARRAY[]::text[], true
    FROM events e
    LEFT JOIN users u ON u.actor_id IN (e.acted_by_user_id, e.created_by_actor)
    LEFT JOIN entities en ON en.actor_id = e.created_by_actor
   WHERE e.id = p_event AND _evenement_lisible(p_event)
     AND NOT EXISTS (SELECT 1 FROM event_versions v WHERE v.event_id = p_event)
  ORDER BY 1 DESC NULLS LAST;
$$;

CREATE FUNCTION public.version_evenement(p_version bigint)
RETURNS TABLE(field text, before jsonb, after jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH cur AS (
    SELECT v.event_id, v.id,
           to_jsonb(v) - ARRAY['id','event_id','author_user','author_entity','created_at','note'] AS fields
      FROM event_versions v WHERE v.id = p_version AND _evenement_lisible(v.event_id)
  ), prev AS (
    SELECT to_jsonb(p) - ARRAY['id','event_id','author_user','author_entity','created_at','note'] AS fields
      FROM event_versions p, cur WHERE p.event_id = cur.event_id AND p.id < cur.id
     ORDER BY p.id DESC LIMIT 1
  )
  SELECT f.key, (SELECT prev.fields -> f.key FROM prev), f.value
    FROM cur, jsonb_each(cur.fields) f
   WHERE f.value IS DISTINCT FROM (SELECT prev.fields -> f.key FROM prev)
   ORDER BY f.key;
$$;

REVOKE ALL ON FUNCTION public._evenement_lisible(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.modifier_evenement(uuid, jsonb, bigint, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revenir_a_version_evenement(bigint) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.histoire_evenement(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.version_evenement(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.modifier_evenement(uuid, jsonb, bigint, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revenir_a_version_evenement(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.histoire_evenement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.version_evenement(bigint) TO authenticated;
