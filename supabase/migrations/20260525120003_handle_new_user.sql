-- 20260525120003_handle_new_user.sql
-- Refonte des comptes — Fondation (Phase 1, Task 4)
-- Le signup crée désormais un acteur(person) + un users. Garde une ligne profiles legacy
-- (transition : pages non encore recâblées la lisent). La ligne profiles est retirée au Plan 4.
-- CREATE OR REPLACE : le trigger existant on_auth_user_created continue de pointer cette fonction.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Acteur + personne (le cœur du nouveau modèle)
  INSERT INTO actors (id, kind) VALUES (NEW.id, 'person') ON CONFLICT DO NOTHING;
  INSERT INTO users (actor_id, auth_id, email) VALUES (NEW.id, NEW.id, NEW.email)
    ON CONFLICT (actor_id) DO NOTHING;
  -- Ligne profiles legacy (transition : pages non recâblées la lisent). Retiré au Plan 4.
  INSERT INTO profiles (id, email, type) VALUES (NEW.id, NEW.email, 'public')
    ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
