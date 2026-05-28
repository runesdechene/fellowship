-- Fix post /code-review (2026-05-28) : la migration 20260529120000_content_reports
-- déclarait reporter_actor_id et reporter_auth_id comme NOT NULL avec
-- ON DELETE SET NULL — contradiction : quand un user ou un actor est supprimé,
-- le SET NULL viole la contrainte NOT NULL → la cascade plante.
--
-- Choix : on garde l'historique des signalements même si le reporter est
-- supprimé (pour la modération admin). Donc on relâche le NOT NULL.
-- Le SET NULL existant suffit ; les colonnes deviennent simplement nullable.

ALTER TABLE public.content_reports
  ALTER COLUMN reporter_actor_id DROP NOT NULL,
  ALTER COLUMN reporter_auth_id DROP NOT NULL;
