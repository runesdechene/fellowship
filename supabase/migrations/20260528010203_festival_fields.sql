-- Festival descriptive fields (optional, freeform). Page Festival DA — 13e page.
-- Additif et rétrocompatible : colonnes nullable, ignorées par le code existant.
alter table public.events
  add column if not exists edition integer,
  add column if not exists opening_hours text,
  add column if not exists expected_attendance text,
  add column if not exists stand_size text,
  add column if not exists stand_price text;
