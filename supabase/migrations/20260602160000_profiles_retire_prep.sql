-- Plan 4 / Phase 5a : preparer le retrait de profiles. Rebrancher TOUT ce qui en depend
-- (signup, role admin, gating exposant, notif new_exposant) sur users/entities/memberships.
-- profiles RESTE en place comme filet ; le DROP TABLE est en 5b, une fois ceci verifie.

-- 0. ANTI-LOCKOUT : copier role/suspended de profiles vers users (la source de verite admin
--    devient users.role ; sans ce backfill, un admin dont le role ne vit que dans profiles
--    serait ejecte de /admin quand on retire le fallback profiles cote app).
UPDATE users u SET role = p.role
  FROM profiles p
  WHERE u.actor_id = p.id AND p.role IS DISTINCT FROM 'user';

-- 1. SIGNUP : ne plus inserer de ligne profiles legacy. Acteur + users seulement.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO actors (id, kind) VALUES (NEW.id, 'person') ON CONFLICT DO NOTHING;
  INSERT INTO users (actor_id, auth_id, email) VALUES (NEW.id, NEW.id, NEW.email)
    ON CONFLICT (actor_id) DO NOTHING;
  RETURN NEW;
END; $$;

-- 2. ROLE ADMIN : profiles.role -> users.role partout.
DROP POLICY IF EXISTS "admin_delete_events" ON events;
CREATE POLICY "admin_delete_events" ON events FOR DELETE
  USING ((SELECT role FROM users WHERE actor_id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "admin_update_reports" ON event_reports;
CREATE POLICY "admin_update_reports" ON event_reports FOR UPDATE
  USING ((SELECT role FROM users WHERE actor_id = auth.uid()) = 'admin');
DROP POLICY IF EXISTS "admin_delete_reports" ON event_reports;
CREATE POLICY "admin_delete_reports" ON event_reports FOR DELETE
  USING ((SELECT role FROM users WHERE actor_id = auth.uid()) = 'admin');
DROP POLICY IF EXISTS "admin_select_reports" ON event_reports;
CREATE POLICY "admin_select_reports" ON event_reports FOR SELECT
  USING ((SELECT role FROM users WHERE actor_id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "tags_admin_insert" ON tags;
CREATE POLICY "tags_admin_insert" ON tags FOR INSERT
  WITH CHECK ((SELECT role FROM users WHERE actor_id = auth.uid()) = 'admin');
DROP POLICY IF EXISTS "tags_admin_update" ON tags;
CREATE POLICY "tags_admin_update" ON tags FOR UPDATE
  USING ((SELECT role FROM users WHERE actor_id = auth.uid()) = 'admin');
DROP POLICY IF EXISTS "tags_admin_delete" ON tags;
CREATE POLICY "tags_admin_delete" ON tags FOR DELETE
  USING ((SELECT role FROM users WHERE actor_id = auth.uid()) = 'admin');

-- content_reports : retirer la branche profiles du fallback, garder users.
DROP POLICY IF EXISTS content_reports_select_admin ON content_reports;
CREATE POLICY content_reports_select_admin ON content_reports FOR SELECT
  USING ((SELECT role FROM users WHERE actor_id = auth.uid()) = 'admin');
DROP POLICY IF EXISTS content_reports_update_admin ON content_reports;
CREATE POLICY content_reports_update_admin ON content_reports FOR UPDATE
  USING ((SELECT role FROM users WHERE actor_id = auth.uid()) = 'admin');
DROP POLICY IF EXISTS content_reports_delete_admin ON content_reports;
CREATE POLICY content_reports_delete_admin ON content_reports FOR DELETE
  USING ((SELECT role FROM users WHERE actor_id = auth.uid()) = 'admin');

-- 3. GATING EXPOSANT (events) : profiles.type -> membership vers une entite exposant.
--    - insert : couvert par events_write_actor (can_act_as(created_by_actor)) -> on drop le legacy.
--    - update : "tout exposant edite tout event" (curation collaborative) -> recree sur memberships.
DROP POLICY IF EXISTS "events_insert_exposant" ON events;
DROP POLICY IF EXISTS "events_update_exposant" ON events;
CREATE POLICY "events_update_exposant" ON events FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM memberships m JOIN entities e ON e.actor_id = m.entity_actor_id
    WHERE m.user_actor_id = auth.uid() AND e.type = 'exposant'))
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m JOIN entities e ON e.actor_id = m.entity_actor_id
    WHERE m.user_actor_id = auth.uid() AND e.type = 'exposant'));

-- 4. NOTIF "nouvel exposant" : reimplementee sur entities (le trigger sur profiles, mort,
--    a ete retire en ph.2). Fire a la creation d'une entite exposant.
CREATE OR REPLACE FUNCTION notify_new_exposant()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_record RECORD;
BEGIN
  IF NEW.type <> 'exposant' THEN RETURN NEW; END IF;
  FOR user_record IN SELECT actor_id FROM users WHERE actor_id <> auth.uid() LOOP
    INSERT INTO notifications (actor_id, type, data)
    VALUES (
      user_record.actor_id, 'new_exposant',
      jsonb_build_object(
        'actor_id', NEW.actor_id,
        'actor_name', COALESCE(NEW.brand_name, 'Un nouvel exposant'),
        'actor_avatar_url', NEW.avatar_url
      )
    );
  END LOOP;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_new_exposant_entity ON entities;
CREATE TRIGGER on_new_exposant_entity AFTER INSERT ON entities
  FOR EACH ROW EXECUTE FUNCTION notify_new_exposant();
