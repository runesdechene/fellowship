-- Admin can delete any event
CREATE POLICY "admin_delete_events" ON events FOR DELETE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Admin can update any profile (for suspend/reactivate)
CREATE POLICY "admin_update_profiles" ON profiles FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Admin can update/delete event_reports (resolve reports)
CREATE POLICY "admin_update_reports" ON event_reports FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "admin_delete_reports" ON event_reports FOR DELETE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Admin can read all event_reports
CREATE POLICY "admin_select_reports" ON event_reports FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
