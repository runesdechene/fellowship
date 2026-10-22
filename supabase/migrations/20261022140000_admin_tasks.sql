-- POURQUOI — l'administration s'ouvre sur le tableau de l'équipe (Uriel, 22/10/2026, maquette
-- 2432:306), pensé pour des cerveaux TDAH : chacun a son paquet de cartes et n'en voit que la carte
-- du dessus. On ne choisit plus quoi faire dans une liste : on fait la carte, on la repousse, ou on
-- rebat le paquet.
--   · status : idea (Idées, à personne), deck (dans le paquet de owner_user_id), done (Terminé, par
--     owner_user_id).
--   · position ordonne un paquet, la plus petite dessus ; une carte ajoutée tombe au hasard, une
--     urgente dessous de toutes, « Plus tard » derrière toutes.
--   · moved_at dit depuis quand la carte est là où elle est (colonne ou paquet) : l'écran la
--     réchauffe après 5 jours, et « Terminé » s'efface en 7 jours (les lignes restent en base).
-- Additif : une table neuve, que le code déployé ne lit pas.

create table public.admin_tasks (
  id uuid primary key default gen_random_uuid(),
  body text not null check (length(trim(body)) > 0),
  status text not null default 'deck' check (status in ('idea', 'deck', 'done')),
  owner_user_id uuid references public.users(actor_id) on delete set null,
  position double precision not null default random(),
  moved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (status = 'idea' or owner_user_id is not null)
);

create index admin_tasks_deck_idx on public.admin_tasks (owner_user_id, position)
  where status = 'deck';

alter table public.admin_tasks enable row level security;

create policy admin_tasks_admin on public.admin_tasks for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Changer de colonne ou de paquet remet le compteur « depuis » à zéro.
create function public.admin_tasks_moved()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.status is distinct from old.status
    or new.owner_user_id is distinct from old.owner_user_id then
    new.moved_at := now();
  end if;
  return new;
end;
$$;

create trigger admin_tasks_moved
  before update on public.admin_tasks
  for each row execute function public.admin_tasks_moved();

-- Rebattre son paquet : une position au hasard pour chaque carte. Les droits de l'appelant
-- s'appliquent (RLS) : un non-admin ne touche à rien.
create function public.admin_shuffle_deck()
returns void
language sql
set search_path to 'public'
as $$
  update admin_tasks set position = random()
  where status = 'deck' and owner_user_id = auth.uid();
$$;
