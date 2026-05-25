-- Cleanup old prototype schema before creating new Fellowship V1 schema

-- Drop old triggers.
-- NB: `DROP TRIGGER IF EXISTS ... ON <table>` lève quand même une erreur si la TABLE
-- n'existe pas (le IF EXISTS ne couvre que le trigger). On garde donc l'existence de la
-- table pour rester rejouable sur une base vierge (fresh local reset).
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='profiles') THEN
    DROP TRIGGER IF EXISTS on_profiles_updated ON profiles;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='registrations') THEN
    DROP TRIGGER IF EXISTS on_registrations_updated ON registrations;
  END IF;
END $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop old functions
DROP FUNCTION IF EXISTS handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Drop old tables (CASCADE to handle FKs)
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop old enums
DROP TYPE IF EXISTS registration_status CASCADE;
DROP TYPE IF EXISTS group_role CASCADE;
