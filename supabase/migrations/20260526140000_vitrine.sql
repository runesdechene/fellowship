-- Vitrine exposant : colonnes entités + galerie + bucket. Cf. spec 2026-05-26-vitrine.

-- 1) Colonnes sur entities
ALTER TABLE entities
  ADD COLUMN IF NOT EXISTS specialties text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS links       jsonb   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS verified    boolean NOT NULL DEFAULT false;

-- 2) `verified` non modifiable par un client authentifié (anti auto-vérification).
--    Seul le service role / SQL direct (auth.uid() NULL) peut le changer.
CREATE OR REPLACE FUNCTION protect_entity_verified() RETURNS trigger AS $$
BEGIN
  IF NEW.verified IS DISTINCT FROM OLD.verified AND auth.uid() IS NOT NULL THEN
    NEW.verified := OLD.verified;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_entity_verified ON entities;
CREATE TRIGGER trg_protect_entity_verified BEFORE UPDATE ON entities
  FOR EACH ROW EXECUTE FUNCTION protect_entity_verified();

-- 3) Table galerie
CREATE TABLE IF NOT EXISTS entity_gallery (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_actor_id uuid NOT NULL REFERENCES entities(actor_id) ON DELETE CASCADE,
  image_url       text NOT NULL,
  position        int  NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_entity_gallery_entity ON entity_gallery(entity_actor_id, position);

ALTER TABLE entity_gallery ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gallery_select_all  ON entity_gallery;
DROP POLICY IF EXISTS gallery_write_owner ON entity_gallery;
CREATE POLICY gallery_select_all  ON entity_gallery FOR SELECT USING (true);
CREATE POLICY gallery_write_owner ON entity_gallery FOR ALL TO authenticated
  USING (can_act_as(entity_actor_id)) WITH CHECK (can_act_as(entity_actor_id));

-- 4) Bucket galerie (public en lecture, écriture propriétaire via dossier = actor_id)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('entity-gallery', 'entity-gallery', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "entity-gallery read"   ON storage.objects;
DROP POLICY IF EXISTS "entity-gallery write"  ON storage.objects;
DROP POLICY IF EXISTS "entity-gallery delete" ON storage.objects;
CREATE POLICY "entity-gallery read" ON storage.objects FOR SELECT
  USING (bucket_id = 'entity-gallery');
CREATE POLICY "entity-gallery write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'entity-gallery' AND can_act_as(((storage.foldername(name))[1])::uuid));
CREATE POLICY "entity-gallery delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'entity-gallery' AND can_act_as(((storage.foldername(name))[1])::uuid));
