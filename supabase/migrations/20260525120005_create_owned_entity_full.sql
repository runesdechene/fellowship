-- 20260525120005_create_owned_entity_full.sql
-- Création d'entité ATOMIQUE : le slug (+ champs) sont posés à l'INSERT, donc une collision
-- de public_slug (UNIQUE) fait échouer toute la transaction (aucun acteur/entité/membership
-- créé) → le retry de l'onboarding est propre (pas d'entité orpheline ni de doublon).
DROP FUNCTION IF EXISTS create_owned_entity(entity_type, text);

CREATE OR REPLACE FUNCTION create_owned_entity(
  p_type        entity_type,
  p_brand_name  TEXT,
  p_craft_type  TEXT DEFAULT NULL,
  p_city        TEXT DEFAULT NULL,
  p_department  TEXT DEFAULT NULL,
  p_postal_code TEXT DEFAULT NULL,
  p_public_slug TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO actors(id, kind) VALUES (gen_random_uuid(), 'entity') RETURNING id INTO new_id;
  INSERT INTO entities(actor_id, type, brand_name, craft_type, city, department, postal_code, public_slug)
    VALUES (new_id, p_type, p_brand_name, p_craft_type, p_city, p_department, p_postal_code, p_public_slug);
  INSERT INTO memberships(user_actor_id, entity_actor_id, role) VALUES (auth.uid(), new_id, 'owner');
  RETURN new_id;
END; $$;
