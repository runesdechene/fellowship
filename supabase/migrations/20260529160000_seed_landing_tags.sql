-- Seed des 10 tags supplémentaires demandés (élargissement de la marquee
-- landing + Explorer). bg_color/text_color reprennent en HSL les hex de
-- Landing.tsx > marqueTags pour les 4 premiers (Exposition, Marché de Noël,
-- Marché de créateurs, Brocante), palette warm/pastel cohérente DA pour les
-- 6 autres (Culturel, Terroir, Cinéma, Biker, Outdoor, Gastronomique).
-- Les emoji + couleurs d'accent sont pré-câblés dans `TagBadge.tsx`
-- (TAG_EMOJIS / TAG_LANDING_COLORS) sur ces mêmes slugs.

INSERT INTO tags (name, slug, bg_color, text_color, sort_order) VALUES
  ('Exposition',          'exposition',       'hsl(148 38% 64% / 0.1)', 'hsl(148 38% 64%)', 10),
  ('Marché de Noël',      'marche-noel',      'hsl(8 70% 69% / 0.1)',   'hsl(8 70% 69%)',   12),
  ('Marché de créateurs', 'marche-createurs', 'hsl(28 82% 68% / 0.1)',  'hsl(28 82% 68%)',  13),
  ('Brocante',            'brocante',         'hsl(42 46% 69% / 0.1)',  'hsl(42 46% 69%)',  14),
  ('Culturel',            'culturel',         'hsl(300 24% 70% / 0.1)', 'hsl(300 24% 70%)', 15),
  ('Terroir',             'terroir',          'hsl(36 43% 59% / 0.1)',  'hsl(36 43% 59%)',  16),
  ('Cinéma',              'cinema',           'hsl(225 33% 66% / 0.1)', 'hsl(225 33% 66%)', 17),
  ('Biker',               'biker',            'hsl(0 0% 60% / 0.1)',    'hsl(0 0% 60%)',    18),
  ('Outdoor',             'outdoor',          'hsl(150 40% 63% / 0.1)', 'hsl(150 40% 63%)', 19),
  ('Gastronomique',       'gastronomique',    'hsl(23 73% 66% / 0.1)',  'hsl(23 73% 66%)',  20)
ON CONFLICT (slug) DO NOTHING;
