-- POURQUOI — l'administration s'ouvre sur un accueil qui dit comment va l'application (Uriel,
-- 22/10/2026, maquette 2448:233) : qui vient, jour par jour, et ce que les gens font, semaine par
-- semaine. La date de dernière visite (20261022170000) ne garde pas l'historique : `visites_jour`
-- garde une ligne par personne et par jour de visite, rien de plus — au plus 365 lignes par an et
-- par compte. Les jours se comptent à l'heure de Paris, comme toute l'application.
-- `admin_accueil()` rend tout l'écran en un appel ; ses quatre chiffres reprennent `admin_chiffres()`
-- et les messages à classer `admin_prospects_non_classes()`, plutôt que de recopier leurs règles.

create table public.visites_jour (
  actor_id uuid not null references public.users(actor_id) on delete cascade,
  jour date not null,
  primary key (actor_id, jour)
);
-- Aucune politique : on n'y écrit que par noter_visite, on n'y lit que par admin_accueil.
alter table public.visites_jour enable row level security;

-- Les visites déjà notées aujourd'hui, pour que le premier jour ne parte pas de zéro.
insert into public.visites_jour (actor_id, jour)
select actor_id, (last_seen_at at time zone 'Europe/Paris')::date from public.users
where last_seen_at is not null;

CREATE OR REPLACE FUNCTION public.noter_visite()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  update users
  set visits = visits + case
        when last_seen_at is null or last_seen_at < now() - interval '30 minutes' then 1 else 0 end,
      last_seen_at = now()
  where actor_id = (select auth.uid());

  insert into visites_jour (actor_id, jour)
  select actor_id, (now() at time zone 'Europe/Paris')::date from users
  where actor_id = (select auth.uid())
  on conflict do nothing;
$function$;

create function public.admin_accueil()
returns table (
  venus_aujourdhui bigint, venus_semaine bigint, venus_mois bigint, visiteurs_par_jour int[],
  comptes bigint, comptes_semaine bigint, pro bigint, essais bigint, essais_bientot bigint, echecs bigint,
  dates_a_venir bigint, signalements bigint, messages_a_classer bigint,
  dates_suivies int[], fiches int[], avis int[], abonnements int[])
language plpgsql stable security definer set search_path to 'public' as $$
declare
  today date := (now() at time zone 'Europe/Paris')::date;
  -- Les huit dernières semaines, du lundi au dimanche, la semaine en cours en dernier.
  weeks date[] := array(select generate_series(date_trunc('week', today)::date - 49,
                                               date_trunc('week', today)::date, interval '7 days')::date);
begin
  perform admin_garde();
  return query
  with semaine as (
    select (date_trunc('week', t at time zone 'Europe/Paris'))::date as lundi, k
    from (select created_at, 'dates' from participations
          union all select created_at, 'fiches' from events
          union all select created_at, 'avis' from reviews
          union all select created_at, 'abonnements' from follows) s(t, k)
    where t >= weeks[1]::timestamp at time zone 'Europe/Paris'
  )
  select
    (select count(distinct v.actor_id) from visites_jour v where v.jour = today),
    (select count(distinct v.actor_id) from visites_jour v where v.jour > today - 7),
    (select count(distinct v.actor_id) from visites_jour v where v.jour > today - 30),
    array(select count(v.actor_id)::int from generate_series(today - 29, today, interval '1 day') d
          left join visites_jour v on v.jour = d::date group by d order by d),
    c.comptes, c.comptes_semaine, c.pro, c.essais, c.essais_bientot, c.echecs,
    (select count(*) from events e where e.start_date >= today),
    (select count(*) from content_reports r where r.status = 'pending'),
    (select count(*) from admin_prospects_non_classes()),
    array(select (select count(*) from semaine s where s.lundi = w and s.k = 'dates')::int from unnest(weeks) with ordinality u(w, i) order by i),
    array(select (select count(*) from semaine s where s.lundi = w and s.k = 'fiches')::int from unnest(weeks) with ordinality u(w, i) order by i),
    array(select (select count(*) from semaine s where s.lundi = w and s.k = 'avis')::int from unnest(weeks) with ordinality u(w, i) order by i),
    array(select (select count(*) from semaine s where s.lundi = w and s.k = 'abonnements')::int from unnest(weeks) with ordinality u(w, i) order by i)
  from admin_chiffres() c;
end $$;

revoke all on function public.admin_accueil() from public, anon;
grant execute on function public.admin_accueil() to authenticated;
