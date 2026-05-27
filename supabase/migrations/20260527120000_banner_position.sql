-- Cadrage vertical de la bannière de vitrine (point focal en %, 0 = haut, 100 = bas).
ALTER TABLE entities ADD COLUMN IF NOT EXISTS banner_position smallint NOT NULL DEFAULT 50;
