-- POURQUOI : les recettes chiffrées (Uriel, 31/10/2026). Le CA d'un exposant (Carte, Espèces) est
-- chiffré dans le navigateur par une phrase de passe qu'il est seul à connaître : la base ne garde que
-- le sel de la phrase et des textes chiffrés, jamais un montant lisible. Spec :
-- docs/superpowers/specs/2026-10-31-recettes-chiffrees-design.md.
-- Purement additif : deux tables neuves, une fonction neuve, et exposeur_chiffres qui rend deux clés de
-- plus (cle, secrets) sans changer les anciennes pour un acteur sans recettes chiffrées.
-- Ces montants ne sont PAS dans event_ledger_entries : ils n'y seraient plus chiffrés.

-- Une clé par enseigne : le sel et le nombre d'itérations pour redériver la clé AES, et "check", le mot
-- « fellowship » chiffré à la création, qui permet de reconnaître la bonne phrase.
create table public.revenue_keys (
  actor_id   uuid primary key references public.entities(actor_id) on delete cascade,
  salt       text not null,
  iterations int  not null check (iterations > 0),
  "check"    text not null,
  created_at timestamptz not null default now()
);

-- Les recettes chiffrées d'une date (IV ‖ chiffré en base64), à raison d'une par enseigne et par événement.
create table public.report_secrets (
  actor_id   uuid not null references public.actors(id) on delete cascade,
  event_id   uuid not null references public.events(id) on delete cascade,
  payload    text not null,
  updated_at timestamptz not null default now(),
  primary key (actor_id, event_id)
);

alter table public.revenue_keys   enable row level security;
alter table public.report_secrets enable row level security;
revoke all on public.revenue_keys, public.report_secrets from anon;

-- Même règle qu'event_ledger_write_actor : l'enseigne et ceux qui agissent pour elle, personne d'autre.
create policy revenue_keys_actor on public.revenue_keys
  for all to authenticated
  using (can_act_as(actor_id))
  with check (can_act_as(actor_id));

create policy report_secrets_actor on public.report_secrets
  for all to authenticated
  using (can_act_as(actor_id))
  with check (can_act_as(actor_id));

-- Phrase oubliée : tout repart à zéro. Security invoker, donc la RLS ci-dessus s'applique aussi ;
-- le contrôle explicite donne une erreur claire au lieu d'un « 0 ligne effacée » silencieux.
create function public.reset_revenue_key(p_actor uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not can_act_as(p_actor) then raise exception 'non autorisé'; end if;
  delete from report_secrets where actor_id = p_actor;
  delete from revenue_keys   where actor_id = p_actor;
end
$$;

revoke execute on function public.reset_revenue_key(uuid) from public, anon;
grant execute on function public.reset_revenue_key(uuid) to authenticated;

-- exposeur_chiffres : définition live (20261031130000) copiée entière, puis trois ajouts.
-- 1. rempli vaut aussi vrai quand la date a des recettes chiffrées (un bilan chiffré est rempli) ;
-- 2. cle : le sel et les itérations de l'enseigne (null sans clé), pour que le client déchiffre ;
-- 3. secrets : les textes chiffrés des dates comptées. dans_ca = pas de CA espéré sur la date, donc
--    c'est le réel qui compte dans « ca » — le client ajoute alors Carte + Espèces à « ca ».
create or replace function public.exposeur_chiffres(p_hash text, p_debut date, p_fin date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_pro boolean;
  v_out jsonb;
begin
  update api_keys set last_used_at = now()
   where hash = p_hash and revoked_at is null
  returning actor_id into v_actor;
  if v_actor is null then return null; end if;

  select (en.plan = 'pro' or en.comped_pro_until > now()) into v_pro
    from entities en where en.actor_id = v_actor;
  if not coalesce(v_pro, false) then return jsonb_build_object('error', 'pro'); end if;

  with dates as (
    select p.event_id
      from participations p
      join events e on e.id = p.event_id
     where p.actor_id = v_actor
       and p.status in ('inscrit', 'confirme')
       and e.start_date >= p_debut and e.start_date <= p_fin
  ), bilans as (
    select l.event_id,
           coalesce(sum(l.amount) filter (where l.direction = 'in'), 0) as reel,
           bool_or(l.source = 'manual') as rempli   -- même règle que isFilled() de la V2
      from event_ledger_entries l
      join dates d on d.event_id = l.event_id
     where l.actor_id = v_actor
     group by l.event_id
  ), par_date as (
    select coalesce(b.rempli, false) or s.event_id is not null as rempli,
           coalesce(b.reel, 0) as reel, pd.revenue_goal as espere
      from dates d
      left join bilans b on b.event_id = d.event_id
      left join report_secrets s on s.actor_id = v_actor and s.event_id = d.event_id
      left join participation_dossiers pd on pd.actor_id = v_actor and pd.event_id = d.event_id
  )
  select jsonb_build_object(
           'ca',         coalesce(sum(coalesce(espere, reel)), 0),
           'ca_reel',    coalesce(sum(reel) filter (where rempli), 0),
           'ca_projete', coalesce(sum(espere), 0),
           'dates',      count(*),
           'bilans',     count(*) filter (where rempli),
           'cle',        (select jsonb_build_object('salt', k.salt, 'iterations', k.iterations)
                            from revenue_keys k where k.actor_id = v_actor),
           'secrets',    coalesce((select jsonb_agg(jsonb_build_object('payload', s.payload,
                                                                       'dans_ca', pd.revenue_goal is null)
                                                    order by s.event_id)
                                     from dates d
                                     join report_secrets s on s.actor_id = v_actor and s.event_id = d.event_id
                                     left join participation_dossiers pd
                                            on pd.actor_id = v_actor and pd.event_id = d.event_id),
                                   '[]'::jsonb)
         )
    into v_out
    from par_date;
  return v_out;
end
$$;

revoke execute on function public.exposeur_chiffres(text, date, date) from public, anon, authenticated;
grant execute on function public.exposeur_chiffres(text, date, date) to service_role;
