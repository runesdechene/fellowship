-- Géocodage des événements : coordonnées pour la future carte.
-- Additif et rétrocompatible (colonnes nullable, ignorées par le code existant).
alter table public.events
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists geo_precision text check (geo_precision in ('precise', 'city')),
  add column if not exists address text;

comment on column public.events.geo_precision is
  'precise = coords de l''adresse choisie ; city = fallback centre-ville (city+department)';
