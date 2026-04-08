-- Merge primary_tag as first element of tags array, then drop the column
UPDATE events
SET tags = array_prepend(primary_tag, COALESCE(tags, '{}'))
WHERE primary_tag IS NOT NULL;

ALTER TABLE events DROP COLUMN primary_tag;

-- Add "Autre" tag for uncategorized events
INSERT INTO tags (name, slug, bg_color, text_color, sort_order)
VALUES ('Autre', 'autre', 'hsl(0 0% 50% / 0.1)', 'hsl(0 0% 45%)', 99)
ON CONFLICT (slug) DO NOTHING;
