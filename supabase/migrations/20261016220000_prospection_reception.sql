-- POURQUOI : lot 3c de la messagerie de prospection. Les réponses arrivent dans Fellowship
-- (prospect-inbound) : « À répondre » se lit dans le fil, les réponses sans prospect vont dans
-- « Non classés », et la relance se propose seule après 5 jours sans réponse (tâche quotidienne).
-- prospect_dans_filtre et admin_prospects reprennent leur définition live (20261016140000,
-- 20261016180000) avec le filtre et la colonne a_repondre.

alter table public.prospects
  add column relance_vue_pour uuid references public.prospect_messages(id) on delete set null;

-- Le dernier message du fil vient du prospect : il attend une réponse.
create function public.prospect_attend_reponse(p public.prospects) returns boolean
language sql stable set search_path to 'public' as $$
  select coalesce((
    select m.direction = 'in' from prospect_messages m
    where m.prospect_id = p.id
    order by coalesce(m.sent_at, m.received_at, m.created_at) desc, m.id desc
    limit 1
  ), false);
$$;
revoke all on function public.prospect_attend_reponse(public.prospects) from public, anon, authenticated;

create or replace function public.prospect_dans_filtre(p public.prospects, p_filtre text) returns boolean
language sql stable set search_path to 'public' as $$
  select case p_filtre
    when 'tous' then true
    when 'a_contacter' then p.email_status = 'pas_envoye' and p.contacted_on is null
      and p.user_id is null
    when 'contactes' then p.email_status <> 'pas_envoye' or p.contacted_on is not null
    when 'repondu' then p.email_status = 'repondu'
    when 'a_repondre' then prospect_attend_reponse(p)
    when 'compte' then p.user_id is not null
    when 'a_relancer' then p.a_relancer
    else false
  end;
$$;

drop function public.admin_prospects(text, text, text, text, int);
create function public.admin_prospects(p_q text default '', p_filtre text default 'tous',
  p_source text default '', p_suivi text default '', p_page int default 0)
returns table (id uuid, name text, brand text, activity text, city text, email text, phone text,
  source text, note text, contact_channel text, contacted_on date, email_status text,
  a_relancer boolean, user_id uuid, user_name text, linked_at timestamptz, linked_by text,
  owner_id uuid, owner_name text, unsubscribed_at timestamptz, a_repondre boolean,
  created_at timestamptz, total bigint)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select p.id, p.name, p.brand, p.activity, p.city, p.email, p.phone, p.source, p.note,
    p.contact_channel, p.contacted_on, p.email_status, p.a_relancer, p.user_id,
    u.display_name::text, p.linked_at, p.linked_by, p.owner_id, o.display_name::text,
    p.unsubscribed_at, prospect_attend_reponse(p), p.created_at, count(*) over ()
  from prospects p
  left join users u on u.actor_id = p.user_id
  left join users o on o.actor_id = p.owner_id
  where prospect_dans_filtre(p, p_filtre) and prospect_cherche(p, p_q, p_source)
    and prospect_suivi(p, p_suivi)
  order by p.created_at desc, p.id
  limit 50 offset greatest(p_page, 0) * 50;
end $$;

create or replace function public.admin_prospects_filtres(p_q text default '', p_source text default '',
  p_suivi text default '')
returns table (filtre text, nombre bigint)
language plpgsql stable security definer set search_path to 'public' as $$
declare f text;
begin
  perform admin_garde();
  foreach f in array array['tous', 'a_contacter', 'contactes', 'repondu', 'a_repondre', 'compte',
    'a_relancer']
  loop
    filtre := f;
    select count(*) into nombre from prospects p
      where prospect_dans_filtre(p, f) and prospect_cherche(p, p_q, p_source)
        and prospect_suivi(p, p_suivi);
    return next;
  end loop;
end $$;

create function public.admin_prospects_non_classes()
returns table (id uuid, from_email text, to_email text, subject text, body_text text,
  has_attachments boolean, received_at timestamptz)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select m.id, m.from_email, m.to_email, m.subject, m.body_text, m.has_attachments, m.received_at
  from prospect_messages m
  where m.prospect_id is null and m.direction = 'in'
  order by m.received_at desc, m.id;
end $$;

-- Ranger une réponse sous un prospect : le fil la reprend, le prospect passe « Répondu ».
create function public.admin_ranger_message(p_message uuid, p_prospect uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  update prospect_messages set prospect_id = p_prospect
  where id = p_message and prospect_id is null and direction = 'in';
  if not found then
    raise exception 'message déjà rangé ou introuvable' using errcode = 'P0002';
  end if;
  update prospects set email_status = 'repondu', a_relancer = false where id = p_prospect;
end $$;

-- Décocher « À relancer » (un admin) retient le message sortant concerné : la tâche ne le recochera pas.
create function public.prospect_relance_vue() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  -- Seul le geste d'un admin compte (auth.uid() posé) : prospect-send et prospect-inbound décochent
  -- avec la clé de service, après un envoi ou une réponse, et ne doivent rien retenir.
  if old.a_relancer and not new.a_relancer and auth.uid() is not null then
    new.relance_vue_pour := (
      select m.id from prospect_messages m
      where m.prospect_id = new.id and m.direction = 'out'
      order by m.sent_at desc nulls last, m.id desc limit 1);
  end if;
  return new;
end $$;
create trigger prospect_relance_vue before update of a_relancer on public.prospects
  for each row execute function public.prospect_relance_vue();

-- Chaque matin : « À relancer » pour un prospect dont le dernier message est un envoi délivré,
-- vieux de 5 jours et plus, sans réponse, et pas déjà vu.
create function public.prospects_relancer() returns void
language sql security definer set search_path to 'public' as $$
  update prospects p set a_relancer = true
  from (
    select distinct on (m.prospect_id) m.prospect_id, m.id, m.direction, m.sent_at, m.delivery
    from prospect_messages m
    where m.prospect_id is not null
    order by m.prospect_id, coalesce(m.sent_at, m.received_at, m.created_at) desc, m.id desc
  ) last
  where last.prospect_id = p.id
    and last.direction = 'out' and last.delivery in ('envoye', 'delivre')
    and last.sent_at < now() - interval '5 days'
    and p.unsubscribed_at is null and not p.a_relancer
    and p.relance_vue_pour is distinct from last.id;
$$;

revoke all on function public.prospect_relance_vue() from public, anon, authenticated;
revoke all on function public.prospects_relancer() from public, anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_prospects(text, text, text, text, int)', 'admin_prospects_filtres(text, text, text)',
    'admin_prospects_non_classes()', 'admin_ranger_message(uuid, uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

select cron.schedule('relances-prospects', '0 6 * * *', 'select public.prospects_relancer()');
