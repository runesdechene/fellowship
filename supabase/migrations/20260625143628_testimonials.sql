-- Témoignages Landing : gérés depuis l'admin, lus en anonyme sur la page d'accueil.
-- Remplace le fichier statique src/data/testimonials.ts.
create table public.testimonials (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                 -- prénom (ou prénom + initiale)
  craft       text not null,                 -- phrase qui décrit : « Céramiste — Provence »
  quote       text not null,                 -- paragraphe mélioratif
  avatar_url  text,                          -- URL publique Storage (bucket testimonials) ; null = initiales
  entity_slug text,                          -- optionnel : slug vitrine (override manuel du lien)
  actor_id    uuid references public.actors(id) on delete set null, -- lien compte Fellowship : dérive avatar fallback + vitrine
  is_active   boolean not null default true, -- décoché = caché de la Landing, gardé en base
  sort_order  int not null default 0,        -- ordre d'affichage croissant
  created_at  timestamptz not null default now()
);

alter table public.testimonials enable row level security;

-- Lecture publique : la Landing est anonyme, ne voit que les témoignages actifs.
create policy "testimonials_select_public" on public.testimonials
  for select using (is_active = true);

-- Lecture admin : voit TOUT (actifs + inactifs) dans le back-office.
create policy "testimonials_admin_select" on public.testimonials
  for select to authenticated
  using ((select role from users where actor_id = auth.uid()) = 'admin');

-- Écriture réservée admin (même prédicat que les policies de tags, migré vers users).
create policy "testimonials_admin_insert" on public.testimonials
  for insert to authenticated
  with check ((select role from users where actor_id = auth.uid()) = 'admin');
create policy "testimonials_admin_update" on public.testimonials
  for update to authenticated
  using ((select role from users where actor_id = auth.uid()) = 'admin')
  with check ((select role from users where actor_id = auth.uid()) = 'admin');
create policy "testimonials_admin_delete" on public.testimonials
  for delete to authenticated
  using ((select role from users where actor_id = auth.uid()) = 'admin');

-- Helper admin pour les policies storage. SECURITY DEFINER + search_path fixé
-- (pattern can_act_as) → résout `users` même dans le contexte d'évaluation storage.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (select 1 from users where actor_id = auth.uid() and role = 'admin');
$$;

-- Storage (bucket public "testimonials") : lecture publique (images servies par le CDN),
-- écriture réservée aux ADMINS.
-- ⚠️ La policy SELECT est INDISPENSABLE : upload({upsert:true}) lit l'objet (existence +
--    readback de la ligne) ; sans elle l'upload échoue en 400 "violates RLS" (testé).
-- ⚠️ Le check admin DOIT passer par public.is_admin() (SECURITY DEFINER) : une sous-requête
--    brute `from users` échoue dans le contexte storage (search_path sans public).
create policy "testimonials_storage_select" on storage.objects
  for select to public using (bucket_id = 'testimonials');
create policy "testimonials_storage_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'testimonials' and public.is_admin());
create policy "testimonials_storage_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'testimonials' and public.is_admin());
create policy "testimonials_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'testimonials' and public.is_admin());
