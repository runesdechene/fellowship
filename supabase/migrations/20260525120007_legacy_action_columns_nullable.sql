-- 20260525120007_legacy_action_columns_nullable.sql
-- Transition expand/contract : les anciennes colonnes (FK profiles, NOT NULL) ne peuvent pas
-- porter un acteur de type entité. On les rend NULLABLE pour que les écritures au nom d'un acteur
-- (actor_id / *_actor) réussissent sans elles. Drop définitif = Plan 4 (contract).
ALTER TABLE participations ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE reviews        ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE notes          ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE event_reports  ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE notifications  ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE follows        ALTER COLUMN follower_id  DROP NOT NULL;
ALTER TABLE follows        ALTER COLUMN following_id DROP NOT NULL;

-- Unicité sur les acteurs (les upserts onConflict 'actor_id,event_id' en ont besoin ;
-- la fondation ne l'avait ajoutée que pour participations).
ALTER TABLE reviews       ADD CONSTRAINT uniq_review_actor        UNIQUE (actor_id, event_id);
ALTER TABLE event_reports ADD CONSTRAINT uniq_event_report_actor UNIQUE (actor_id, event_id);
ALTER TABLE follows       ADD CONSTRAINT uniq_follow_actor        UNIQUE (follower_actor, following_actor);
