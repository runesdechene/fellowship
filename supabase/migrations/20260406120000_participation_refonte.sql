-- 1. Add new enum value (must be its own transaction — cannot use in same tx)
ALTER TYPE participation_status ADD VALUE IF NOT EXISTS 'en_cours';
