-- 20260525120001_actors_backfill.sql
-- Refonte des comptes — Fondation (Phase 1, Task 2)
-- Backfill du nouveau modèle depuis `profiles` (conservé en lecture legacy jusqu'au Plan 4).

-- 1. Un acteur PERSONNE par profil existant (actors.id = profiles.id = auth.uid()).
INSERT INTO actors (id, kind, created_at)
  SELECT id, 'person', created_at FROM profiles
  ON CONFLICT (id) DO NOTHING;

-- 2. La table users (champs personne).
--    Prénom + avatar de l'exposant remis à NULL → on relance l'onboarding (Plan 2) ; pas de copie.
INSERT INTO users (actor_id, auth_id, email, display_name, avatar_url, city, department, postal_code, sex, plan, role, created_at)
  SELECT id, id, email,
         CASE WHEN type='exposant' THEN NULL ELSE display_name END,
         CASE WHEN type='exposant' THEN NULL ELSE avatar_url END,
         city, department, postal_code, sex, plan, COALESCE(role,'user'), created_at
  FROM profiles
  ON CONFLICT (actor_id) DO NOTHING;

-- 3. Pour chaque exposant : un acteur ENTITÉ + entities + membership(owner).
--    Boucle PL/pgSQL = appariement ligne par ligne, zéro risque (vs row_number()).
DO $$
DECLARE r RECORD; new_id UUID;
BEGIN
  FOR r IN SELECT * FROM profiles WHERE type='exposant' LOOP
    INSERT INTO actors (id, kind, created_at)
      VALUES (gen_random_uuid(), 'entity', r.created_at) RETURNING id INTO new_id;
    INSERT INTO entities (actor_id, type, brand_name, craft_type, bio, website, banner_url, avatar_url, public_slug, city, department, postal_code, created_at)
      VALUES (new_id, 'exposant',
              COALESCE(r.brand_name, r.display_name, 'Ma marque'),
              r.craft_type, r.bio, r.website, r.banner_url, r.avatar_url, r.public_slug,
              r.city, r.department, r.postal_code, r.created_at);
    INSERT INTO memberships (user_actor_id, entity_actor_id, role)
      VALUES (r.id, new_id, 'owner');
  END LOOP;
END $$;
