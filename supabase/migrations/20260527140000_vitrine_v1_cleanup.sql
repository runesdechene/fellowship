-- Nettoyage des vestiges de la 1re version vitrine (profil social), inutilisés depuis
-- le pivot « carnet de route » :
--   - table entity_gallery (galerie murale) + ses policies (CASCADE)
--   - colonne entities.specialties (étiquettes / spécialités)
-- CONSERVÉS : entities.links (stocke désormais le lien boutique), entities.verified
-- (+ trigger anti auto-vérif, pour une future vérification), et le bucket storage
-- `entity-gallery` (sert toujours aux uploads cover + avatar).
DROP TABLE IF EXISTS entity_gallery CASCADE;
ALTER TABLE entities DROP COLUMN IF EXISTS specialties;
