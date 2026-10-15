-- POURQUOI : les écritures de l'administration V2 (lot 2). SECURITY DEFINER (un admin n'est pas
-- membre des enseignes qu'il corrige), garde admin_garde(). Offrir des mois prolonge à partir de la
-- fin déjà offerte si elle est future, sinon d'aujourd'hui. protect_entity_plan laisse passer
-- comped_pro_until et is_ambassador pour un admin (migration 20261016090000).

create function public.admin_offrir_mois(p_entity uuid, p_mois int) returns timestamptz
language plpgsql security definer set search_path to 'public' as $$
declare v_fin timestamptz;
begin
  perform admin_garde();
  if p_mois is null or p_mois not between 1 and 24 then
    raise exception 'entre 1 et 24 mois' using errcode = '22023';
  end if;
  update entities
     set comped_pro_until = greatest(now(), coalesce(comped_pro_until, now())) + make_interval(months => p_mois)
   where actor_id = p_entity
  returning comped_pro_until into v_fin;
  if v_fin is null then raise exception 'enseigne introuvable' using errcode = 'P0002'; end if;
  return v_fin;
end $$;

create function public.admin_ambassadeur(p_entity uuid, p_oui boolean) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  update entities set is_ambassador = p_oui where actor_id = p_entity;
  if not found then raise exception 'enseigne introuvable' using errcode = 'P0002'; end if;
end $$;

create function public.admin_corriger_enseigne(p_id uuid, p_brand_name text, p_craft_type text,
  p_city text, p_public_slug text, p_legal_name text, p_siren text) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  if coalesce(trim(p_brand_name), '') = '' then
    raise exception 'le nom est requis' using errcode = '22023';
  end if;
  update entities set
    brand_name = trim(p_brand_name),
    craft_type = nullif(trim(p_craft_type), ''),
    city = nullif(trim(p_city), ''),
    public_slug = nullif(trim(p_public_slug), ''),
    legal_name = nullif(trim(p_legal_name), ''),
    siren = nullif(regexp_replace(coalesce(p_siren, ''), '\s', '', 'g'), '')
  where actor_id = p_id;
  if not found then raise exception 'enseigne introuvable' using errcode = 'P0002'; end if;
end $$;

create function public.admin_corriger_personne(p_id uuid, p_display_name text, p_handle text,
  p_phone text, p_postal_code text) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  update users set
    display_name = nullif(trim(p_display_name), ''),
    handle = nullif(trim(p_handle), ''),
    phone = nullif(trim(p_phone), ''),
    postal_code = nullif(trim(p_postal_code), '')
  where actor_id = p_id;
  if not found then raise exception 'compte introuvable' using errcode = 'P0002'; end if;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_offrir_mois(uuid, int)', 'admin_ambassadeur(uuid, boolean)',
    'admin_corriger_enseigne(uuid, text, text, text, text, text, text)',
    'admin_corriger_personne(uuid, text, text, text, text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;


-- POURQUOI : la policy users_update_self laisse chacun écrire sa propre ligne, donc son téléphone et
-- sa suspension (faille relevée en revue). Même garde que protect_user_role : hors admin, ces deux
-- colonnes gardent leur valeur ; les appels serveur sans auth.uid() (service role) restent permis.
create function public.protect_user_admin_columns() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  if auth.uid() is not null and not is_admin() then
    new.phone := old.phone;
    new.suspended_at := old.suspended_at;
  end if;
  return new;
end $$;

create trigger protect_user_admin_columns before update on public.users
  for each row execute function public.protect_user_admin_columns();

-- POURQUOI : le parrain affiché doit être stable quand deux parrainages ont la même date ;
-- r.id départage. Définition live de 20261016090100, seul l'order by change.
create or replace function public.admin_enseigne(p_id uuid)
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
      order by r.attributed_at desc nulls last, r.id limit 1),
    (select count(*) from referrals r where r.parrain_entity_id = e.actor_id and r.status = 'rewarded'),
    a.dates, a.avis, a.questions, a.bilans, a.fiches, a.abonnes
  from entities e
  left join users payer on payer.actor_id = e.paid_by_user
  cross join lateral admin_activite(array[e.actor_id]) a
  where e.actor_id = p_id;
end $$;

-- POURQUOI : défense en profondeur. admin_activite n'est appelée que par des fonctions SECURITY
-- DEFINER (elles tournent en propriétaire) : elle n'a pas besoin de l'être. Définition live de
-- 20261016090100, seul « security definer » est retiré ; ses revoke restent.
create or replace function public.admin_activite(p_actors uuid[])
returns table (dates bigint, avis bigint, questions bigint, bilans bigint, fiches bigint, abonnes bigint)
language sql stable set search_path to 'public' as $$
  select
    (select count(*) from participations where actor_id = any(p_actors)),
    (select count(*) from reviews where actor_id = any(p_actors)),
    (select count(*) from event_threads where actor_id = any(p_actors))
      + (select count(*) from event_thread_replies where actor_id = any(p_actors)),
    (select count(*) from event_reports where actor_id = any(p_actors)),
    (select count(*) from events where created_by_actor = any(p_actors)),
    (select count(*) from follows where following_actor = any(p_actors));
$$;
