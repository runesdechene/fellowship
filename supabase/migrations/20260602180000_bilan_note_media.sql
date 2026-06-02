-- Bilan enrichi : note libre + photos souvenir privées.
ALTER TABLE event_reports ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE event_reports ADD COLUMN IF NOT EXISTS media_paths TEXT[] NOT NULL DEFAULT '{}';

-- Bucket PRIVÉ dédié aux médias de bilan (le bilan est « visible uniquement par toi »).
INSERT INTO storage.buckets (id, name, public)
  VALUES ('bilan-media', 'bilan-media', false)
  ON CONFLICT (id) DO UPDATE SET public = false;

-- Policies owner-only (modèle acteur, comme entity-gallery). 1er segment du path = actor_id.
CREATE POLICY "bilan_media_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'bilan-media' AND can_act_as(((storage.foldername(name))[1])::uuid));

CREATE POLICY "bilan_media_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bilan-media' AND can_act_as(((storage.foldername(name))[1])::uuid));

CREATE POLICY "bilan_media_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'bilan-media' AND can_act_as(((storage.foldername(name))[1])::uuid));

CREATE POLICY "bilan_media_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'bilan-media' AND can_act_as(((storage.foldername(name))[1])::uuid));
