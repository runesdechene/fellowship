-- POURQUOI : lot 3 de l'administration V2, les Prospects (spec 2026-10-16). Les commerciaux (des
-- admins) tiennent la liste des exposants et festivals à démarcher. Un prospect n'est jamais un
-- compte : il vit ici, et se relie à un compte quand quelqu'un s'inscrit avec son e-mail (le
-- déclencheur) ou quand un admin confirme une correspondance (admin_rapprocher).
-- Tout est réservé aux admins : RLS is_admin() sur la table, admin_garde() dans chaque fonction.
-- L'e-mail est rangé en minuscules : unique, il permet à l'import d'ignorer les doublons.

create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  name text,
  brand text,
  activity text,
  city text,
  email text unique check (email = lower(trim(email)) and email <> ''),
  phone text,
  source text,
  note text,
  contact_channel text check (contact_channel in ('mail', 'appel', 'salon', 'message')),
  contacted_on date,
  email_status text not null default 'pas_envoye'
    check (email_status in ('pas_envoye', 'envoye', 'ouvert', 'repondu', 'rebond')),
  a_relancer boolean not null default false,
  user_id uuid references public.users(actor_id) on delete set null,
  linked_at timestamptz,
  linked_by text check (linked_by in ('email', 'telephone')),
  created_at timestamptz not null default now(),
  -- L'identifiant de connexion de l'auteur : pas de clé vers users, dont l'actor_id peut différer
  -- de auth_id pour les comptes anciens.
  created_by uuid default auth.uid()
);
create index prospects_created_idx on public.prospects (created_at desc, id);
create index prospects_user_idx on public.prospects (user_id);

alter table public.prospects enable row level security;
create policy prospects_admin on public.prospects for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.prospects from anon;

-- Le téléphone se compare chiffres seuls, l'indicatif français ramené à 0 :
-- « 06 41 22 18 90 », « +33 6 41 22 18 90 » et « 0033641221890 » donnent « 0641221890 ».
-- La même règle vit dans apps/web-v2/src/lib/phone.ts (phoneKey) : les deux vont ensemble.
create function public.phone_key(p_tel text) returns text
language sql immutable set search_path to 'public' as $$
  select nullif(case
    when d like '0033%' and length(d) = 13 then '0' || substr(d, 5)
    when d like '33%' and length(d) = 11 then '0' || substr(d, 3)
    else d end, '')
  from (select regexp_replace(coalesce(p_tel, ''), '\D', '', 'g') as d) s;
$$;

-- Contacté : un e-mail parti, ou une date de contact notée.
create function public.prospect_dans_filtre(p public.prospects, p_filtre text) returns boolean
language sql stable set search_path to 'public' as $$
  select case p_filtre
    when 'tous' then true
    when 'a_contacter' then p.email_status = 'pas_envoye' and p.contacted_on is null
      and p.user_id is null
    when 'contactes' then p.email_status <> 'pas_envoye' or p.contacted_on is not null
    when 'repondu' then p.email_status = 'repondu'
    when 'compte' then p.user_id is not null
    when 'a_relancer' then p.a_relancer
    else false
  end;
$$;

create function public.prospect_cherche(p public.prospects, p_q text, p_source text) returns boolean
language sql stable set search_path to 'public' as $$
  select (coalesce(p_source, '') = '' or p.source = p_source)
    and (coalesce(trim(p_q), '') = ''
      or admin_cherche(p.name, p_q) or admin_cherche(p.brand, p_q)
      or admin_cherche(p.email, p_q) or admin_tel(p.phone, p_q));
$$;

create function public.admin_prospects(p_q text default '', p_filtre text default 'tous',
  p_source text default '', p_page int default 0)
returns table (id uuid, name text, brand text, activity text, city text, email text, phone text,
  source text, note text, contact_channel text, contacted_on date, email_status text,
  a_relancer boolean, user_id uuid, user_name text, linked_at timestamptz, linked_by text,
  created_at timestamptz, total bigint)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select p.id, p.name, p.brand, p.activity, p.city, p.email, p.phone, p.source, p.note,
    p.contact_channel, p.contacted_on, p.email_status, p.a_relancer, p.user_id,
    u.display_name::text, p.linked_at, p.linked_by, p.created_at, count(*) over ()
  from prospects p
  left join users u on u.actor_id = p.user_id
  where prospect_dans_filtre(p, p_filtre) and prospect_cherche(p, p_q, p_source)
  order by p.created_at desc, p.id
  limit 50 offset greatest(p_page, 0) * 50;
end $$;

create function public.admin_prospects_chiffres()
returns table (total bigint, semaine bigint, contactes bigint, repondu bigint, comptes bigint,
  comptes_pro bigint)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query select
    (select count(*) from prospects),
    (select count(*) from prospects where created_at > now() - interval '7 days'),
    (select count(*) from prospects p where prospect_dans_filtre(p, 'contactes')),
    (select count(*) from prospects where email_status = 'repondu'),
    (select count(*) from prospects where user_id is not null),
    (select count(*) from prospects p
      where p.user_id is not null and exists (
        select 1 from memberships m join entities e on e.actor_id = m.entity_actor_id
        where m.user_actor_id = p.user_id
          and admin_offre(e.plan::text, e.comped_pro_until, e.subscription_status) = 'pro'));
end $$;

create function public.admin_prospects_filtres(p_q text default '', p_source text default '')
returns table (filtre text, nombre bigint)
language plpgsql stable security definer set search_path to 'public' as $$
declare f text;
begin
  perform admin_garde();
  foreach f in array array['tous', 'a_contacter', 'contactes', 'repondu', 'compte', 'a_relancer']
  loop
    filtre := f;
    select count(*) into nombre from prospects p
      where prospect_dans_filtre(p, f) and prospect_cherche(p, p_q, p_source);
    return next;
  end loop;
end $$;

create function public.admin_prospects_sources()
returns table (source text)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select distinct p.source from prospects p
  where p.source is not null and trim(p.source) <> ''
  order by p.source;
end $$;

-- Les correspondances pas encore reliées : même e-mail qu'un compte, ou même téléphone.
-- Un prospect n'apparaît qu'une fois ; l'e-mail l'emporte sur le téléphone.
create function public.admin_prospects_a_rapprocher()
returns table (prospect_id uuid, prospect_name text, prospect_brand text, user_id uuid,
  user_name text, user_email text, par text)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select c.prospect_id, c.prospect_name, c.prospect_brand, c.user_id, c.user_name, c.user_email,
    c.par
  from (
    select distinct on (p.id) p.id as prospect_id, p.name as prospect_name,
      p.brand as prospect_brand, u.actor_id as user_id, u.display_name::text as user_name,
      u.email::text as user_email,
      case when lower(u.email) = p.email then 'email' else 'telephone' end as par,
      p.created_at as p_created
    from prospects p
    join users u on lower(u.email) = p.email
      or (phone_key(p.phone) is not null and phone_key(u.phone) = phone_key(p.phone))
    where p.user_id is null
    order by p.id, (lower(u.email) = p.email) desc, u.created_at, u.actor_id
  ) c
  order by c.p_created desc, c.prospect_id;
end $$;

create function public.admin_rapprocher(p_prospect uuid, p_user uuid, p_par text)
returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  update prospects set user_id = p_user, linked_at = now(), linked_by = p_par
  where id = p_prospect;
end $$;

-- Le prospect d'origine d'une personne : le premier rapproché, si plusieurs mènent à elle.
create function public.admin_prospect_de(p_user uuid)
returns table (id uuid, source text, contact_channel text, contacted_on date,
  linked_at timestamptz, linked_by text)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select p.id, p.source, p.contact_channel, p.contacted_on, p.linked_at, p.linked_by
  from prospects p
  where p.user_id = p_user
  order by p.linked_at, p.id
  limit 1;
end $$;

-- À l'inscription (handle_new_user pose la ligne users), relier le prospect qui a le même e-mail.
-- Une inscription ne doit JAMAIS échouer à cause des prospects : toute erreur est avalée.
create function public.prospect_relier_inscription() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  begin
    update prospects set user_id = new.actor_id, linked_at = now(), linked_by = 'email'
    where user_id is null and new.email is not null and email = lower(trim(new.email));
  exception when others then
    null;
  end;
  return new;
end $$;

create trigger prospect_relier_inscription after insert on public.users
  for each row execute function public.prospect_relier_inscription();

revoke all on function public.phone_key(text) from public, anon, authenticated;
revoke all on function public.prospect_dans_filtre(public.prospects, text) from public, anon, authenticated;
revoke all on function public.prospect_cherche(public.prospects, text, text) from public, anon, authenticated;
revoke all on function public.prospect_relier_inscription() from public, anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_prospects(text, text, text, int)', 'admin_prospects_chiffres()',
    'admin_prospects_filtres(text, text)', 'admin_prospects_sources()',
    'admin_prospects_a_rapprocher()', 'admin_rapprocher(uuid, uuid, text)',
    'admin_prospect_de(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
