-- Drop les policies admin sur event_reports → bilan redevient strictement privé à son auteur.
-- L'admin n'a plus accès aux chiffres perso (revenue, charges, etc.) des bilans post-festival.
drop policy if exists admin_select_reports on public.event_reports;
drop policy if exists admin_update_reports on public.event_reports;
drop policy if exists admin_delete_reports on public.event_reports;

-- Nouvelle table content_reports pour vrais signalements (modération admin).
create table public.content_reports (
  id                     uuid primary key default gen_random_uuid(),
  reporter_actor_id      uuid not null references public.actors(id) on delete set null,
  reporter_auth_id       uuid not null references auth.users(id)   on delete set null,
  target_type            text not null check (target_type in ('event', 'profile')),
  target_id              uuid not null,
  reason                 text not null check (reason in ('spam', 'inapproprie', 'info_erronee', 'doublon')),
  comment                text,
  status                 text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  admin_note             text,
  resolved_at            timestamptz,
  resolved_by_actor_id   uuid references public.actors(id) on delete set null,
  created_at             timestamptz not null default now()
);

create index idx_content_reports_status on public.content_reports (status);
create index idx_content_reports_target on public.content_reports (target_type, target_id);
create index idx_content_reports_created_at on public.content_reports (created_at desc);

alter table public.content_reports enable row level security;

-- INSERT : tout user authentifié, sous sa propre identité (reporter_auth_id == auth.uid()).
create policy content_reports_insert_authenticated on public.content_reports
  for insert with check (reporter_auth_id = auth.uid());

-- SELECT/UPDATE/DELETE : admin only. Fallback chain profile/users — cohérent avec isAdmin React.
create policy content_reports_select_admin on public.content_reports
  for select using (
    coalesce(
      (select role = 'admin' from public.profiles where id = auth.uid()),
      (select role = 'admin' from public.users where auth_id = auth.uid()),
      false
    )
  );

create policy content_reports_update_admin on public.content_reports
  for update using (
    coalesce(
      (select role = 'admin' from public.profiles where id = auth.uid()),
      (select role = 'admin' from public.users where auth_id = auth.uid()),
      false
    )
  );

create policy content_reports_delete_admin on public.content_reports
  for delete using (
    coalesce(
      (select role = 'admin' from public.profiles where id = auth.uid()),
      (select role = 'admin' from public.users where auth_id = auth.uid()),
      false
    )
  );
