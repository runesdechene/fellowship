-- POURQUOI — l'administration s'ouvre sur le tableau de l'équipe (Uriel, 22/10/2026, maquette
-- 2417:233) : quatre colonnes, pensées pour des cerveaux TDAH.
--   · « Maintenant » ne tient qu'une carte par personne : y poser une carte renvoie l'ancienne dans
--     « À faire ». Le déclencheur le fait en base, pour que deux onglets ne puissent pas en garder deux.
--   · moved_at dit depuis quand la carte attend dans sa colonne : l'écran la réchauffe après 5 jours,
--     et « Fait » ne montre que les 7 derniers jours (les lignes restent : rien ne se perd).
-- Additif : une table neuve, que le code déployé ne lit pas.

create table public.admin_tasks (
  id uuid primary key default gen_random_uuid(),
  body text not null check (length(trim(body)) > 0),
  status text not null default 'todo' check (status in ('think', 'todo', 'now', 'done')),
  owner_user_id uuid references public.users(actor_id) on delete set null,
  moved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (status <> 'now' or owner_user_id is not null)
);

create unique index admin_tasks_one_now_idx on public.admin_tasks (owner_user_id)
  where status = 'now';

alter table public.admin_tasks enable row level security;

create policy admin_tasks_admin on public.admin_tasks for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create function public.admin_tasks_before_write()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.moved_at := now();
  end if;
  -- La carte qui occupait « Maintenant » pour ce porteur retourne dans « À faire ».
  if new.status = 'now' then
    update admin_tasks set status = 'todo'
      where owner_user_id = new.owner_user_id and status = 'now' and id <> new.id;
  end if;
  return new;
end;
$$;

create trigger admin_tasks_before_write
  before insert or update on public.admin_tasks
  for each row execute function public.admin_tasks_before_write();
