-- Dynamic tags table (replaces hardcoded constants.ts tags)
CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  bg_color text NOT NULL,
  text_color text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Anyone can read tags
CREATE POLICY "tags_select_public" ON tags FOR SELECT USING (true);

-- Only admin can insert/update/delete
CREATE POLICY "tags_admin_insert" ON tags FOR INSERT
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "tags_admin_update" ON tags FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "tags_admin_delete" ON tags FOR DELETE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Seed with current hardcoded tags
INSERT INTO tags (name, slug, bg_color, text_color, sort_order) VALUES
  ('Médiéval', 'fete-medievale', 'hsl(24 72% 44% / 0.1)', 'hsl(24 72% 50%)', 1),
  ('Fantastique', 'fantastique', 'hsl(280 50% 55% / 0.1)', 'hsl(280 50% 55%)', 2),
  ('Geek', 'geek', 'hsl(220 70% 50% / 0.1)', 'hsl(220 70% 50%)', 3),
  ('Musique', 'festival-musique', 'hsl(340 60% 55% / 0.1)', 'hsl(340 55% 50%)', 4),
  ('Foire', 'foire', 'hsl(40 80% 50% / 0.1)', 'hsl(40 70% 40%)', 5),
  ('Marché', 'marche', 'hsl(152 32% 40% / 0.1)', 'hsl(152 32% 45%)', 6),
  ('Salon', 'salon', 'hsl(200 50% 45% / 0.1)', 'hsl(200 50% 45%)', 7),
  ('Littéraire', 'litteraire', 'hsl(190 60% 45% / 0.1)', 'hsl(190 60% 40%)', 8),
  ('Historique', 'historique', 'hsl(10 70% 50% / 0.1)', 'hsl(10 70% 45%)', 9);
