-- Cleanup old prototype schema before creating new Fellowship V1 schema

-- Drop old triggers
DROP TRIGGER IF EXISTS on_profiles_updated ON profiles;
DROP TRIGGER IF EXISTS on_registrations_updated ON registrations;
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
