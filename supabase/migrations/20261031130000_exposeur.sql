-- POURQUOI : l'exposeur (Uriel, 31/10/2026). Chaque compte Pro pourra brancher un agent ou un tableau
-- de bord sur son Fellowship par une clé personnelle. Premier usage : la Timeline du plugin Accueil
-- (objectif « CA minimal mensuel » de Runes de Chêne). Spec : docs/superpowers/specs/2026-10-31-exposeur-design.md.
-- Purement additif : une table neuve, lue par personne côté client, et une fonction réservée au service role.

create table public.api_keys (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid not null references public.entities(actor_id) on delete cascade,
  label        text not null,
  prefix       text not null,            -- les premiers caractères, pour reconnaître une clé
  hash         text not null unique,     -- SHA-256 hexadécimal de la clé ; la clé en clair n'est jamais gardée
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);
comment on table public.api_keys is
  'Clés de l''exposeur, une par outil branché. Écrites et lues par le service role seulement, en attendant l''écran « Brancher un outil ».';

-- Aucune politique : RLS fermée à anon et authenticated. L'écran (maquette à venir) apportera les siennes.
alter table public.api_keys enable row level security;
revoke all on public.api_keys from anon, authenticated;

-- Les chiffres d'une enseigne sur une fenêtre, pour la clé dont on donne le hash.
-- Dates comptées : participations inscrites ou confirmées dont l'événement COMMENCE dans la fenêtre.
-- ca : par date, le CA espéré (participation_dossiers.revenue_goal) dès qu'il existe, toujours prioritaire ;
--      sinon le CA réel complet (toutes les entrées du bilan) — choix d'Uriel du 31/10/2026.
-- Les montants viennent d'event_ledger_entries, jamais des colonnes mortes d'event_reports (docs/db/gotchas.md).
-- Rend null pour une clé inconnue ou révoquée, {"error":"pro"} pour une enseigne sans Pro.
create function public.exposeur_chiffres(p_hash text, p_debut date, p_fin date)
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
    select coalesce(b.rempli, false) as rempli, coalesce(b.reel, 0) as reel, pd.revenue_goal as espere
      from dates d
      left join bilans b on b.event_id = d.event_id
      left join participation_dossiers pd on pd.actor_id = v_actor and pd.event_id = d.event_id
  )
  select jsonb_build_object(
           'ca',         coalesce(sum(coalesce(espere, reel)), 0),
           'ca_reel',    coalesce(sum(reel) filter (where rempli), 0),
           'ca_projete', coalesce(sum(espere), 0),
           'dates',      count(*),
           'bilans',     count(*) filter (where rempli)
         )
    into v_out
    from par_date;
  return v_out;
end
$$;

revoke execute on function public.exposeur_chiffres(text, date, date) from public, anon, authenticated;
grant execute on function public.exposeur_chiffres(text, date, date) to service_role;
