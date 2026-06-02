-- Plan 4 / Phase 5a : permettre a un admin de modifier le role (suspendre/reactiver) de
-- N'IMPORTE QUEL user. users_update_self ne couvre que sa propre ligne ; l'ancienne action
-- admin passait par admin_update_profiles (sur profiles, qui disparait). On porte ca sur users.
CREATE POLICY "admin_update_users" ON users FOR UPDATE TO authenticated
  USING ((SELECT role FROM users WHERE actor_id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE actor_id = auth.uid()) = 'admin');
