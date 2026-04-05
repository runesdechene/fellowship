-- Fix participations visibility:
-- - Owner sees all their participations
-- - Everyone sees inscrit/confirme (for public profiles)
-- - Friends see interesse too
-- - amis visibility requires friendship
DROP POLICY IF EXISTS "participations_select" ON participations;

CREATE POLICY "participations_select" ON participations
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR status IN ('inscrit', 'confirme')
    OR (status = 'interesse' AND are_friends(auth.uid(), user_id))
    OR (visibility = 'public')
    OR (visibility = 'amis' AND are_friends(auth.uid(), user_id))
  );
