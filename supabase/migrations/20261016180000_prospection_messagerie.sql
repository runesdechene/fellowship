-- POURQUOI : lot 3b de la messagerie de prospection (spec 2026-10-16). Les admins écrivent et
-- envoient leurs e-mails de prospection depuis Fellowship, chacun depuis son adresse
-- @equipe.flw.sh. Trois tables (expéditeurs, modèles, messages), réservées aux admins ; le
-- prospect gagne son suiveur et sa désinscription. Le rapprochement automatique à l'inscription
-- est retiré : un admin confirme désormais chaque rapprochement (Uriel, 16/10 : l'automatique
-- « efface la réussite »). Le statut « ouvert » disparaît (aucun suivi d'ouverture).

drop trigger prospect_relier_inscription on public.users;
drop function public.prospect_relier_inscription();

update public.prospects set email_status = 'envoye' where email_status = 'ouvert';
alter table public.prospects drop constraint prospects_email_status_check;
alter table public.prospects add constraint prospects_email_status_check
  check (email_status in ('pas_envoye', 'envoye', 'repondu', 'rebond'));

alter table public.prospects
  add column owner_id uuid references public.users(actor_id) on delete set null,
  add column unsubscribed_at timestamptz,
  add column unsubscribe_token text not null unique
    default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

create table public.prospect_senders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(actor_id) on delete cascade,
  alias text not null unique check (alias ~ '^[a-z0-9][a-z0-9.-]{0,40}$'),
  display_name text not null check (length(trim(display_name)) > 0),
  signature text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.prospect_templates (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('premier_contact', 'relance', 'bienvenue')),
  name text not null check (length(trim(name)) > 0),
  subject text not null default '',
  body text not null default '',
  archived_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.prospect_messages (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references public.prospects(id) on delete cascade,
  direction text not null check (direction in ('out', 'in')),
  sender_id uuid references public.prospect_senders(id) on delete set null,
  from_email text not null,
  to_email text not null,
  subject text not null default '',
  body_text text not null default '',
  message_id text unique,
  in_reply_to text,
  references_ids text[] not null default '{}',
  resend_id text unique,
  template_id uuid references public.prospect_templates(id) on delete set null,
  delivery text check (delivery in ('envoye', 'delivre', 'rebond', 'plainte')),
  has_attachments boolean not null default false,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now()
);
create index prospect_messages_prospect_idx on public.prospect_messages (prospect_id, created_at, id);
create index prospect_messages_template_idx on public.prospect_messages (template_id);

alter table public.prospect_senders enable row level security;
alter table public.prospect_templates enable row level security;
alter table public.prospect_messages enable row level security;
create policy prospect_senders_admin on public.prospect_senders for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy prospect_templates_admin on public.prospect_templates for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
-- Les messages s'écrivent par les fonctions serveur (clé de service) : les admins les lisent.
create policy prospect_messages_admin_lecture on public.prospect_messages for select to authenticated
  using ((select public.is_admin()));
revoke all on public.prospect_senders, public.prospect_templates, public.prospect_messages from anon;

-- Le suivi : '' = tous, 'moi' = l'appelant, sinon l'uuid d'un compte.
create function public.prospect_suivi(p public.prospects, p_suivi text) returns boolean
language sql stable set search_path to 'public' as $$
  select case
    when coalesce(p_suivi, '') = '' then true
    when p_suivi = 'moi' then p.owner_id = auth.uid()
    else p.owner_id::text = p_suivi
  end;
$$;
revoke all on function public.prospect_suivi(public.prospects, text) from public, anon, authenticated;

drop function public.admin_prospects(text, text, text, int);
create function public.admin_prospects(p_q text default '', p_filtre text default 'tous',
  p_source text default '', p_suivi text default '', p_page int default 0)
returns table (id uuid, name text, brand text, activity text, city text, email text, phone text,
  source text, note text, contact_channel text, contacted_on date, email_status text,
  a_relancer boolean, user_id uuid, user_name text, linked_at timestamptz, linked_by text,
  owner_id uuid, owner_name text, unsubscribed_at timestamptz, created_at timestamptz,
  total bigint)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select p.id, p.name, p.brand, p.activity, p.city, p.email, p.phone, p.source, p.note,
    p.contact_channel, p.contacted_on, p.email_status, p.a_relancer, p.user_id,
    u.display_name::text, p.linked_at, p.linked_by, p.owner_id, o.display_name::text,
    p.unsubscribed_at, p.created_at, count(*) over ()
  from prospects p
  left join users u on u.actor_id = p.user_id
  left join users o on o.actor_id = p.owner_id
  where prospect_dans_filtre(p, p_filtre) and prospect_cherche(p, p_q, p_source)
    and prospect_suivi(p, p_suivi)
  order by p.created_at desc, p.id
  limit 50 offset greatest(p_page, 0) * 50;
end $$;

drop function public.admin_prospects_filtres(text, text);
create function public.admin_prospects_filtres(p_q text default '', p_source text default '',
  p_suivi text default '')
returns table (filtre text, nombre bigint)
language plpgsql stable security definer set search_path to 'public' as $$
declare f text;
begin
  perform admin_garde();
  foreach f in array array['tous', 'a_contacter', 'contactes', 'repondu', 'compte', 'a_relancer']
  loop
    filtre := f;
    select count(*) into nombre from prospects p
      where prospect_dans_filtre(p, f) and prospect_cherche(p, p_q, p_source)
        and prospect_suivi(p, p_suivi);
    return next;
  end loop;
end $$;

create function public.admin_prospect(p_id uuid)
returns table (id uuid, name text, brand text, activity text, city text, email text, phone text,
  source text, note text, contact_channel text, contacted_on date, email_status text,
  a_relancer boolean, user_id uuid, user_name text, owner_id uuid, owner_name text,
  unsubscribed_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select p.id, p.name, p.brand, p.activity, p.city, p.email, p.phone, p.source, p.note,
    p.contact_channel, p.contacted_on, p.email_status, p.a_relancer, p.user_id,
    u.display_name::text, p.owner_id, o.display_name::text, p.unsubscribed_at, p.created_at
  from prospects p
  left join users u on u.actor_id = p.user_id
  left join users o on o.actor_id = p.owner_id
  where p.id = p_id;
end $$;

create function public.admin_prospect_messages(p_id uuid)
returns table (id uuid, direction text, sender_user_id uuid, sender_name text, from_email text,
  to_email text, subject text, body_text text, message_id text, references_ids text[],
  delivery text, has_attachments boolean, at timestamptz)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select m.id, m.direction, s.user_id, s.display_name, m.from_email, m.to_email, m.subject,
    m.body_text, m.message_id, m.references_ids, m.delivery, m.has_attachments,
    coalesce(m.sent_at, m.received_at, m.created_at)
  from prospect_messages m
  left join prospect_senders s on s.id = m.sender_id
  where m.prospect_id = p_id
  order by coalesce(m.sent_at, m.received_at, m.created_at), m.id;
end $$;

-- Un envoi « répondu » : un message reçu dans le même fil après lui.
create function public.admin_prospect_modeles()
returns table (id uuid, kind text, name text, subject text, body text, archived_at timestamptz,
  envois bigint, reponses bigint)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select t.id, t.kind, t.name, t.subject, t.body, t.archived_at,
    (select count(*) from prospect_messages m where m.template_id = t.id),
    (select count(*) from prospect_messages m where m.template_id = t.id
      and exists (select 1 from prospect_messages r where r.prospect_id = m.prospect_id
        and r.direction = 'in' and r.received_at > m.sent_at))
  from prospect_templates t
  order by case t.kind when 'premier_contact' then 0 when 'relance' then 1 else 2 end,
    t.created_at, t.id;
end $$;

-- Palier conseillé d'un domaine neuf : 20 par jour la 1re semaine d'envois, 40 la 2e, puis 80.
create function public.admin_prospect_expediteurs()
returns table (id uuid, user_id uuid, user_name text, alias text, display_name text,
  signature text, active boolean, envoyes_aujourdhui bigint, palier int)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform admin_garde();
  return query
  select s.id, s.user_id, u.display_name::text, s.alias, s.display_name, s.signature, s.active,
    (select count(*) from prospect_messages m where m.sender_id = s.id
      and (m.sent_at at time zone 'Europe/Paris')::date = (now() at time zone 'Europe/Paris')::date),
    (select case
       when min(m.sent_at) is null or now() - min(m.sent_at) < interval '7 days' then 20
       when now() - min(m.sent_at) < interval '14 days' then 40
       else 80 end
     from prospect_messages m where m.sender_id = s.id)
  from prospect_senders s
  join users u on u.actor_id = s.user_id
  order by s.created_at, s.id;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_prospects(text, text, text, text, int)', 'admin_prospects_filtres(text, text, text)',
    'admin_prospect(uuid)', 'admin_prospect_messages(uuid)', 'admin_prospect_modeles()',
    'admin_prospect_expediteurs()'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
