-- Allow reading participations with status inscrit/confirme on any profile
-- (for public profile pages to show events)
DROP POLICY IF EXISTS "participations_select" ON participations;

CREATE POLICY "participations_select" ON participations
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR visibility = 'public'
    OR status IN ('inscrit', 'confirme')
    OR (visibility = 'amis' AND are_friends(auth.uid(), user_id))
  );
