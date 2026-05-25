-- Leads organisateurs captés depuis la landing (waitlist V1).
create table if not exists public.organizer_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'landing',
  created_at timestamptz not null default now()
);

-- Un même email ne s'inscrit qu'une fois.
create unique index if not exists organizer_waitlist_email_key
  on public.organizer_waitlist (lower(email));

alter table public.organizer_waitlist enable row level security;

-- N'importe qui (visiteur anonyme inclus) peut s'inscrire ; personne ne peut lire via l'API publique.
create policy "anyone can join the organizer waitlist"
  on public.organizer_waitlist
  for insert
  to anon, authenticated
  with check (true);
