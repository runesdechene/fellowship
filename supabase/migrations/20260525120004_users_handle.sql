-- 20260525120004_users_handle.sql
-- Namespace d'identité : les personnes sont publiquement adressables en flw.sh/u/<handle>.
-- (Les entités gardent entities.public_slug pour flw.sh/<slug>.) Handle généré à l'onboarding.
ALTER TABLE users ADD COLUMN handle TEXT UNIQUE;
