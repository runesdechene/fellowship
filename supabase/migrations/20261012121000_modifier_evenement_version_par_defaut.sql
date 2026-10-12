-- POURQUOI — lot 10c : une fiche jamais modifiée n'a pas encore de version ; l'appelant attend alors
-- « aucune ». Le type généré pour supabase-js ne sait pas dire `null` sur un paramètre sans défaut :
-- p_expected_version prend NULL par défaut, et l'appelant l'omet. Seul ajout : ce défaut (définition
-- live du 12/10/2026 inchangée par ailleurs, et CREATE OR REPLACE garde les droits).
CREATE OR REPLACE FUNCTION public.modifier_evenement(
  p_event uuid, p_fields jsonb, p_expected_version bigint DEFAULT NULL,
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
