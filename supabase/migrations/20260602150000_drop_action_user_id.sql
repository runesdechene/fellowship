-- Plan 4 / Phase 4 : participations / reviews / notes / event_reports -> drop user_id legacy.
--
-- App deja 100% sur actor_id (+ acted_by_user_id pour l'audit). Triggers rebranches en ph.2.
-- Policies SELECT deja sur acteur (participations/notes : 120008 ; reviews : public ;
-- event_reports : couvert par *_write_actor + admin_select_reports). Uniques acteur deja
-- en place (uniq_*_actor) et les upserts ciblent onConflict actor_id,event_id.
-- Restent : les policies WRITE legacy (sur user_id) + les colonnes + UNIQUE(user_id,event_id) + FK.

-- Policies WRITE legacy (sur user_id). Les writes restent couverts par les policies *_write_actor
-- (FOR ALL, can_act_as(actor_id), 120002).
DROP POLICY IF EXISTS "participations_insert_own" ON participations;
DROP POLICY IF EXISTS "participations_update_own" ON participations;
DROP POLICY IF EXISTS "participations_delete_own" ON participations;
DROP POLICY IF EXISTS "notes_insert_own" ON notes;
DROP POLICY IF EXISTS "notes_update_own" ON notes;
DROP POLICY IF EXISTS "notes_delete_own" ON notes;
DROP POLICY IF EXISTS "reviews_insert_exposant" ON reviews;  -- referencait profiles ; la regle
DROP POLICY IF EXISTS "reviews_update_own" ON reviews;       -- exposant-only reste portee par l'UI
DROP POLICY IF EXISTS "event_reports_owner_only" ON event_reports;

-- Backfill defensif + NOT NULL (contract : tous les writers sont sur actor_id).
UPDATE participations SET actor_id = user_id WHERE actor_id IS NULL AND user_id IS NOT NULL;
UPDATE reviews        SET actor_id = user_id WHERE actor_id IS NULL AND user_id IS NOT NULL;
UPDATE notes          SET actor_id = user_id WHERE actor_id IS NULL AND user_id IS NOT NULL;
UPDATE event_reports  SET actor_id = user_id WHERE actor_id IS NULL AND user_id IS NOT NULL;

ALTER TABLE participations ALTER COLUMN actor_id SET NOT NULL;
ALTER TABLE reviews        ALTER COLUMN actor_id SET NOT NULL;
ALTER TABLE notes          ALTER COLUMN actor_id SET NOT NULL;
ALTER TABLE event_reports  ALTER COLUMN actor_id SET NOT NULL;

-- Drop des colonnes legacy (UNIQUE(user_id,event_id) + FK -> profiles partent avec).
ALTER TABLE participations DROP COLUMN user_id;
ALTER TABLE reviews        DROP COLUMN user_id;
ALTER TABLE notes          DROP COLUMN user_id;
ALTER TABLE event_reports  DROP COLUMN user_id;
