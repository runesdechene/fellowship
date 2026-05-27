-- Localisation libre de vitrine (texte présentationnel, distinct de city/department
-- structurés qui serviront à la logistique côté tableau de bord).
ALTER TABLE entities ADD COLUMN IF NOT EXISTS location text;
-- Backfill : on part de la ville existante pour ne pas vider les vitrines déjà remplies.
UPDATE entities SET location = city WHERE location IS NULL AND city IS NOT NULL AND city <> '';
