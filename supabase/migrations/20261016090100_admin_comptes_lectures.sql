-- POURQUOI : les lectures de l'administration V2 (lot 2). SECURITY DEFINER pour lire toutes les
-- lignes ; chaque fonction appelle admin_garde() et lève 42501 si l'appelant n'est pas admin :
-- c'est la vraie garde, l'écran ne fait que masquer. Les listes sont triées (created_at desc, id)
-- et paginées par 50. La recherche ignore accents et casse ; le téléphone se compare chiffres seuls.

create function public.admin_garde() returns void
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not is_admin() then
    raise exception 'réservé aux admins' using errcode = '42501';
  end if;
end $$;

-- Le même découpage que lib/offer.ts (offerOf) : les deux vont ensemble.
create function public.admin_offre(p_plan text, p_comped timestamptz, p_status text) returns text
language sql stable set search_path to 'public' as $$
  select case
    when p_status = 'trialing' then 'essai'
    when p_plan = 'pro' or p_comped > now() then 'pro'
    else 'gratuit'
  end;
$$;

create function public.admin_cherche(p_valeur text, p_q text) returns boolean
language sql stable set search_path to 'public' as $$
  select lower(extensions.unaccent(coalesce(p_valeur, '')))
    like '%' || lower(extensions.unaccent(trim(p_q))) || '%';
$$;

create function public.admin_tel(p_tel text, p_q text) returns boolean
language sql immutable set search_path to 'public' as $$
  select length(regexp_replace(p_q, '\D', '', 'g')) >= 4
     and regexp_replace(coalesce(p_tel, ''), '\D', '', 'g')
         like '%' || regexp_replace(p_q, '\D', '', 'g') || '%';
$$;

create function public.admin_activite(p_actors uuid[])
returns table (dates bigint, avis bigint, questions bigint, bilans bigint, fiches bigint, abonnes bigint)
language sql stable security definer set search_path to 'public' as $$
  select
    (select count(*) from participations where actor_id = any(p_actors)),
    (select count(*) from reviews where actor_id = any(p_actors)),
    (select count(*) from event_threads where actor_id = any(p_actors))
      + (select count(*) from event_thread_replies where actor_id = any(p_actors)),
    (select count(*) from event_reports where actor_id = any(p_actors)),
    (select count(*) from events where created_by_actor = any(p_actors)),
    (select count(*) from follows where following_actor = any(p_actors));
$$;

create function public.admin_chiffres()
returns table (comptes bigint, comptes_semaine bigint, pro bigint, pro_offerts bigint,
  essais bigint, essais_bientot bigint, echecs bigint)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query select
    (select count(*) from users),
    (select count(*) from users where created_at > now() - interval '7 days'),
    (select count(*) from entities e
      where admin_offre(e.plan::text, e.comped_pro_until, e.subscription_status) = 'pro'),
    (select count(*) from entities e
      where e.plan <> 'pro' and e.comped_pro_until > now()),
    (select count(*) from entities where subscription_status = 'trialing'),
    (select count(*) from entities
      where subscription_status = 'trialing' and trial_end < now() + interval '3 days'),
    (select count(*) from entities where subscription_status = 'past_due');
end $$;

create function public.admin_enseignes(p_q text default '', p_filtre text default 'toutes', p_page int default 0)
returns table (actor_id uuid, brand_name text, type text, city text, avatar_url text, plan text,
  comped_pro_until timestamptz, subscription_status text, billing_interval text, trial_end timestamptz,
  discount_label text, is_ambassador boolean, created_at timestamptz, paid_by_name text,
  dates bigint, avis bigint, total bigint)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  with choisies as (
    select e.* from entities e
    where (p_filtre = 'toutes'
        or (p_filtre in ('pro', 'essai', 'gratuit')
            and admin_offre(e.plan::text, e.comped_pro_until, e.subscription_status) = p_filtre)
        or (p_filtre = 'exposants' and e.type = 'exposant')
        or (p_filtre = 'festivals' and e.type = 'festival'))
      and (coalesce(trim(p_q), '') = ''
        or admin_cherche(e.brand_name, p_q)
        or exists (
          select 1 from memberships m join users u on u.actor_id = m.user_actor_id
          where m.entity_actor_id = e.actor_id
            and (admin_cherche(u.display_name, p_q) or admin_cherche(u.email, p_q)
              or admin_tel(u.phone, p_q))))
  )
  select c.actor_id, c.brand_name::text, c.type::text, c.city::text, c.avatar_url::text, c.plan::text,
    c.comped_pro_until, c.subscription_status::text, c.billing_interval::text, c.trial_end,
    c.discount_label::text, coalesce(c.is_ambassador, false), c.created_at, payer.display_name::text,
    a.dates, a.avis, count(*) over ()
  from choisies c
  left join users payer on payer.actor_id = c.paid_by_user
  cross join lateral admin_activite(array[c.actor_id]) a
  order by c.created_at desc, c.actor_id
  limit 50 offset greatest(p_page, 0) * 50;
end $$;

create function public.admin_personnes(p_q text default '', p_filtre text default 'tous', p_page int default 0)
returns table (actor_id uuid, display_name text, email text, avatar_url text, role text,
  created_at timestamptz, last_sign_in_at timestamptz, suspended_at timestamptz, entity_id uuid,
  brand_name text, entity_type text, plan text, comped_pro_until timestamptz,
  subscription_status text, billing_interval text, trial_end timestamptz, discount_label text,
  dates bigint, avis bigint, total bigint)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  with base as (
    select u.actor_id as u_id, u.display_name as u_name, u.email as u_email, u.avatar_url as u_avatar,
      u.role as u_role, u.created_at as u_created, u.suspended_at as u_suspended, u.phone as u_phone,
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
    au.last_sign_in_at, c.u_suspended, c.e_id, c.e_name::text, c.e_type, c.e_plan::text, c.e_comped,
    c.e_status::text, c.e_interval::text, c.e_trial, c.e_discount::text, a.dates, a.avis,
    count(*) over ()
  from choisis c
  left join auth.users au on au.id = c.u_id
  cross join lateral admin_activite(array_remove(array[c.u_id, c.e_id], null)) a
  order by c.u_created desc, c.u_id
  limit 50 offset greatest(p_page, 0) * 50;
end $$;

create function public.admin_membres(p_entities uuid[])
returns table (entity_id uuid, actor_id uuid, display_name text, email text, avatar_url text,
  phone text, role text, created_at timestamptz)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select m.entity_actor_id, u.actor_id, u.display_name::text, u.email::text, u.avatar_url::text,
    u.phone, m.role::text, m.created_at
  from memberships m join users u on u.actor_id = m.user_actor_id
  where m.entity_actor_id = any(p_entities)
  order by m.entity_actor_id, (m.role = 'owner') desc, m.created_at, u.actor_id;
end $$;

create function public.admin_enseigne(p_id uuid)
returns table (actor_id uuid, brand_name text, type text, craft_type text, city text,
  avatar_url text, public_slug text, created_at timestamptz, plan text, comped_pro_until timestamptz,
  subscription_status text, billing_interval text, trial_end timestamptz,
  current_period_end timestamptz, discount_label text, discount_end timestamptz,
  is_ambassador boolean, stripe_customer_id text, legal_name text, siren text,
  paid_by_user uuid, paid_by_name text, parrain_nom text, filleuls bigint,
  dates bigint, avis bigint, questions bigint, bilans bigint, fiches bigint, abonnes bigint)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select e.actor_id, e.brand_name::text, e.type::text, e.craft_type::text, e.city::text,
    e.avatar_url::text, e.public_slug::text, e.created_at, e.plan::text, e.comped_pro_until,
    e.subscription_status::text, e.billing_interval::text, e.trial_end, e.current_period_end,
    e.discount_label::text, e.discount_end, coalesce(e.is_ambassador, false),
    e.stripe_customer_id::text, e.legal_name::text, e.siren::text, e.paid_by_user,
    payer.display_name::text,
    (select pe.brand_name::text from referrals r join entities pe on pe.actor_id = r.parrain_entity_id
      where r.filleul_entity_id = e.actor_id and r.status <> 'rejected_fraud'
      order by r.attributed_at desc nulls last limit 1),
    (select count(*) from referrals r where r.parrain_entity_id = e.actor_id and r.status = 'rewarded'),
    a.dates, a.avis, a.questions, a.bilans, a.fiches, a.abonnes
  from entities e
  left join users payer on payer.actor_id = e.paid_by_user
  cross join lateral admin_activite(array[e.actor_id]) a
  where e.actor_id = p_id;
end $$;

create function public.admin_personne(p_id uuid)
returns table (actor_id uuid, display_name text, email text, handle text, avatar_url text,
  role text, phone text, postal_code text, city text, push_muted text[], created_at timestamptz,
  last_sign_in_at timestamptz, suspended_at timestamptz,
  dates bigint, avis bigint, questions bigint, fiches bigint)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select u.actor_id, u.display_name::text, u.email::text, u.handle::text, u.avatar_url::text,
    u.role::text, u.phone, u.postal_code::text, u.city::text, u.push_muted,
    u.created_at, au.last_sign_in_at, u.suspended_at, a.dates, a.avis, a.questions, a.fiches
  from users u
  left join auth.users au on au.id = u.actor_id
  cross join lateral admin_activite(
    array[u.actor_id] || array(select m.entity_actor_id from memberships m where m.user_actor_id = u.actor_id)
  ) a
  where u.actor_id = p_id;
end $$;

create function public.admin_enseignes_de(p_person uuid)
returns table (entity_id uuid, brand_name text, type text, city text, avatar_url text, role text,
  plan text, comped_pro_until timestamptz, subscription_status text, billing_interval text,
  trial_end timestamptz, discount_label text, paid_by_user uuid)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select e.actor_id, e.brand_name::text, e.type::text, e.city::text, e.avatar_url::text,
    m.role::text, e.plan::text, e.comped_pro_until, e.subscription_status::text,
    e.billing_interval::text, e.trial_end, e.discount_label::text, e.paid_by_user
  from memberships m join entities e on e.actor_id = m.entity_actor_id
  where m.user_actor_id = p_person
  order by m.created_at, e.actor_id;
end $$;

-- Les trois derniers gestes d'un ou plusieurs acteurs, en phrases neutres (sans accord de genre).
create function public.admin_gestes(p_actors uuid[])
returns table (quand timestamptz, quoi text)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select g.quand, g.quoi from (
    select p.created_at as quand, 'Suit ' || ev.name as quoi
      from participations p join events ev on ev.id = p.event_id where p.actor_id = any(p_actors)
    union all
    select r.created_at, 'Avis sur ' || ev.name
      from reviews r join events ev on ev.id = r.event_id where r.actor_id = any(p_actors)
    union all
    select t.created_at, 'Question sur ' || ev.name
      from event_threads t join events ev on ev.id = t.event_id where t.actor_id = any(p_actors)
    union all
    select b.created_at, 'Bilan de ' || ev.name
      from event_reports b join events ev on ev.id = b.event_id where b.actor_id = any(p_actors)
    union all
    select ev.created_at, 'Fiche créée : ' || ev.name
      from events ev where ev.created_by_actor = any(p_actors)
  ) g
  order by g.quand desc, g.quoi
  limit 3;
end $$;

-- Les compteurs des filtres : le total de chaque filtre pour la recherche en cours.
create function public.admin_filtres(p_vue text, p_q text default '')
returns table (filtre text, nombre bigint)
language plpgsql stable security definer set search_path to 'public' as $$
declare f text;
begin
  perform admin_garde();
  foreach f in array case when p_vue = 'personnes'
    then array['tous', 'pro', 'essai', 'gratuit', 'sans_enseigne', 'admins']
    else array['toutes', 'pro', 'essai', 'gratuit', 'exposants', 'festivals'] end
  loop
    filtre := f;
    if p_vue = 'personnes' then
      select coalesce(max(p.total), 0) into nombre from admin_personnes(p_q, f, 0) p;
    else
      select coalesce(max(e.total), 0) into nombre from admin_enseignes(p_q, f, 0) e;
    end if;
    return next;
  end loop;
end $$;

revoke all on function public.admin_garde() from public, anon;
revoke all on function public.admin_offre(text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.admin_cherche(text, text) from public, anon, authenticated;
revoke all on function public.admin_tel(text, text) from public, anon, authenticated;
revoke all on function public.admin_activite(uuid[]) from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array[
    'admin_chiffres()', 'admin_enseignes(text, text, int)', 'admin_personnes(text, text, int)',
    'admin_membres(uuid[])', 'admin_enseigne(uuid)', 'admin_personne(uuid)',
    'admin_enseignes_de(uuid)', 'admin_gestes(uuid[])', 'admin_filtres(text, text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
