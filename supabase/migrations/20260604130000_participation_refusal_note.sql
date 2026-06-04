-- #8 Dossiers refusés : raison du refus, 1:1 avec la participation, éditable.
-- Nullable, hérite des RLS existantes de participations. Idempotent.
ALTER TABLE participations ADD COLUMN IF NOT EXISTS refusal_note text;
