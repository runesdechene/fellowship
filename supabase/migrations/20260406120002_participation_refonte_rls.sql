-- 2. Migrate existing 'confirme' to 'inscrit'
UPDATE participations SET status = 'inscrit' WHERE status = 'confirme';

-- 3. Add payment tracking columns
ALTER TABLE participations ADD COLUMN IF NOT EXISTS total_cost NUMERIC;
ALTER TABLE participations ADD COLUMN IF NOT EXISTS payments JSONB DEFAULT '[]';

-- 4. Update RLS (can now use 'en_cours' since it was added in previous migration)
DROP POLICY IF EXISTS "participations_select" ON participations;

CREATE POLICY "participations_select" ON participations
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR status = 'inscrit'
    OR (status IN ('interesse', 'en_cours') AND are_friends(auth.uid(), user_id))
    OR visibility = 'public'
    OR (visibility = 'amis' AND are_friends(auth.uid(), user_id))
  );
