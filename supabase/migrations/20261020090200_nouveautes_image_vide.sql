-- POURQUOI : les arguments d'une RPC arrivent typés non nuls dans la V2 ; une note sans image envoie
-- donc une chaîne vide. Elle ne doit jamais devenir une image (`<img src="">`) : vide = pas d'image.
-- Définition live copiée entière, seule la valeur de image_url change.
CREATE OR REPLACE FUNCTION public.publish_app_update(p_version text, p_title text, p_body text, p_image_url text, p_weight text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_id uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  INSERT INTO app_updates (version, title, body, image_url, weight, author_id)
  VALUES (trim(p_version), trim(p_title), trim(p_body), nullif(trim(p_image_url), ''), p_weight, auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO notifications (actor_id, type, data)
  SELECT person, 'app_update',
         jsonb_build_object('update_id', new_id, 'title', trim(p_title), 'version', trim(p_version))
  FROM public.app_update_people() AS person;
  RETURN new_id;
END; $function$;
