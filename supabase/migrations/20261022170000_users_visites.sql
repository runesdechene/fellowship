-- POURQUOI — l'administration doit savoir qui vient vraiment sur Fellowship, et qui vient le plus
-- souvent (Uriel, 22/10/2026). `auth.users.last_sign_in_at` ne le dit pas : il ne bouge qu'à une
-- connexion par mot de passe ou par code, et une session dure des semaines. La « dernière visite »
-- des Comptes et de la fiche affichait donc une date fausse pour quiconque revient sans se
-- reconnecter.
-- L'app appelle `noter_visite()` à l'ouverture et à chaque retour sur l'onglet. Une visite compte
-- quand la précédente date de plus de 30 minutes : un aller-retour entre deux onglets n'en est pas une.
-- Pas de journal ligne à ligne : une date et un compteur suffisent, et rien ne grossit.
-- Les deux lectures de l'administration changent de colonnes, d'où le drop/create (définitions
-- live du 22/10/2026, seule la date et le compteur changent).

alter table public.users
  add column last_seen_at timestamptz,
  add column visits integer not null default 0;

create function public.noter_visite()
returns void
language sql volatile security definer set search_path to 'public' as $$
  update users
  set visits = visits + case
        when last_seen_at is null or last_seen_at < now() - interval '30 minutes' then 1 else 0 end,
      last_seen_at = now()
  where actor_id = (select auth.uid());
$$;

revoke execute on function public.noter_visite() from public, anon;
grant execute on function public.noter_visite() to authenticated;

drop function public.admin_personnes(text, text, integer);

CREATE FUNCTION public.admin_personnes(p_q text DEFAULT ''::text, p_filtre text DEFAULT 'tous'::text, p_page integer DEFAULT 0)
 RETURNS TABLE(actor_id uuid, display_name text, email text, avatar_url text, role text, created_at timestamp with time zone, last_seen_at timestamp with time zone, visits integer, suspended_at timestamp with time zone, entity_id uuid, brand_name text, entity_type text, plan text, comped_pro_until timestamp with time zone, subscription_status text, billing_interval text, trial_end timestamp with time zone, discount_label text, dates bigint, avis bigint, total bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform admin_garde();
  return query
  with base as (
    select u.actor_id as u_id, u.display_name as u_name, u.email as u_email, u.avatar_url as u_avatar,
      u.role as u_role, u.created_at as u_created, u.suspended_at as u_suspended, u.phone as u_phone,
      u.last_seen_at as u_seen, u.visits as u_visits,
      prem.*
    from users u
    left join lateral (
      select en.actor_id as e_id, en.brand_name as e_name, en.type::text as e_type, en.plan::text as e_plan,
        en.comped_pro_until as e_comped, en.subscription_status as e_status,
        en.billing_interval as e_interval, en.trial_end as e_trial, en.discount_label as e_discount
      from memberships m join entities en on en.actor_id = m.entity_actor_id
      where m.user_actor_id = u.actor_id
      order by m.created_at, en.actor_id
      limit 1
    ) prem on true
  ), choisis as (
    select * from base b
    where (p_filtre = 'tous'
        or (p_filtre in ('pro', 'essai', 'gratuit') and
            (case when b.e_id is null then 'gratuit'
                  else admin_offre(b.e_plan, b.e_comped, b.e_status) end) = p_filtre)
        or (p_filtre = 'sans_enseigne' and b.e_id is null)
        or (p_filtre = 'admins' and b.u_role = 'admin'))
      and (coalesce(trim(p_q), '') = ''
        or admin_cherche(b.u_name, p_q) or admin_cherche(b.u_email, p_q)
        or admin_cherche(b.e_name, p_q) or admin_tel(b.u_phone, p_q))
  )
  select c.u_id, c.u_name::text, c.u_email::text, c.u_avatar::text, c.u_role::text, c.u_created,
    c.u_seen, c.u_visits, c.u_suspended, c.e_id, c.e_name::text, c.e_type, c.e_plan::text, c.e_comped,
    c.e_status::text, c.e_interval::text, c.e_trial, c.e_discount::text, a.dates, a.avis,
    count(*) over ()
  from choisis c
  cross join lateral admin_activite(array_remove(array[c.u_id, c.e_id], null)) a
  order by c.u_created desc, c.u_id
  limit 50 offset greatest(p_page, 0) * 50;
end $function$;

drop function public.admin_personne(uuid);

CREATE FUNCTION public.admin_personne(p_id uuid)
 RETURNS TABLE(actor_id uuid, display_name text, email text, handle text, avatar_url text, role text, phone text, postal_code text, city text, push_muted text[], created_at timestamp with time zone, last_seen_at timestamp with time zone, visits integer, suspended_at timestamp with time zone, dates bigint, avis bigint, questions bigint, fiches bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform admin_garde();
  return query
  select u.actor_id, u.display_name::text, u.email::text, u.handle::text, u.avatar_url::text,
    u.role::text, u.phone, u.postal_code::text, u.city::text, u.push_muted,
    u.created_at, u.last_seen_at, u.visits, u.suspended_at, a.dates, a.avis, a.questions, a.fiches
  from users u
  cross join lateral admin_activite(
    array[u.actor_id] || array(select m.entity_actor_id from memberships m where m.user_actor_id = u.actor_id)
  ) a
  where u.actor_id = p_id;
end $function$;

-- Le drop a emporté les droits : les mêmes qu'en 20261016090100.
revoke all on function public.admin_personnes(text, text, integer) from public, anon;
grant execute on function public.admin_personnes(text, text, integer) to authenticated;
revoke all on function public.admin_personne(uuid) from public, anon;
grant execute on function public.admin_personne(uuid) to authenticated;
