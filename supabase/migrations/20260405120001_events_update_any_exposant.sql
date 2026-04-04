-- Allow any exposant to update any event (collaborative curation)
DROP POLICY IF EXISTS "events_update_creator" ON events;

CREATE POLICY "events_update_exposant" ON events
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND type = 'exposant')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND type = 'exposant')
  );
