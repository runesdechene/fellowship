-- POURQUOI : lot 4 de l'administration V2 (spec 2026-10-19-v2-admin-lot-4-design.md) — reprendre de
-- la V1 les signalements, les événements, les catégories et les témoignages, pour que la V2 se
-- suffise avant la bascule. Les écritures simples passent par les politiques admin déjà en place ;
-- ici, les lectures enrichies (une requête au lieu de plusieurs) et le renommage d'une catégorie,
-- qui doit suivre dans `events.tags`. Tout est additif.

-- Les signalements d'un statut, avec qui signale et ce qui est visé (nom et chemin dans l'app).
create function public.admin_signalements(p_statut text default 'pending')
returns table (
  id uuid, created_at timestamptz, reason text, comment text, status text, admin_note text,
  resolved_at timestamptz, reporter_name text, reporter_avatar text, target_type text,
  target_name text, target_path text
)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform admin_garde();
  return query
  select r.id, r.created_at, r.reason, r.comment, r.status, r.admin_note, r.resolved_at,
    reporter.label::text, reporter.avatar_url::text, r.target_type,
    coalesce(e.name, profile.label, t.title, rt.title)::text,
    case r.target_type
      when 'event' then '/evenement/' || r.target_id
      when 'profile' then '/' || profile.public_slug
      when 'event_thread' then '/evenement/' || t.event_id || '#discussions'
      when 'event_thread_reply' then '/evenement/' || rt.event_id || '#discussions'
    end
  from content_reports r
  left join actor_public reporter on reporter.actor_id = r.reporter_actor_id
  left join events e on r.target_type = 'event' and e.id = r.target_id
  left join actor_public profile on r.target_type = 'profile' and profile.actor_id = r.target_id
  left join event_threads t on r.target_type = 'event_thread' and t.id = r.target_id
  left join event_thread_replies reply on r.target_type = 'event_thread_reply' and reply.id = r.target_id
  left join event_threads rt on rt.id = reply.thread_id
  where r.status = p_statut
  order by r.created_at desc, r.id;
end $$;

-- Une page de 50 événements, privés compris, cherchés sur le nom et la ville.
create function public.admin_evenements(p_q text default '', p_page integer default 0)
returns table (
  id uuid, name text, city text, department text, start_date date, end_date date, tags text[],
  is_private boolean, created_at timestamptz, creator_name text, exposants bigint, total bigint
)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform admin_garde();
  return query
  select e.id, e.name, e.city, e.department, e.start_date, e.end_date, e.tags, e.is_private,
    e.created_at, creator.label::text,
    (select count(distinct p.actor_id) from participations p where p.event_id = e.id),
    count(*) over ()
  from events e
  left join actor_public creator on creator.actor_id = e.created_by_actor
  where coalesce(trim(p_q), '') = '' or admin_cherche(e.name, p_q) or admin_cherche(e.city, p_q)
  order by e.created_at desc, e.id
  limit 50 offset greatest(p_page, 0) * 50;
end $$;

-- Les catégories dans leur ordre, et le nombre d'événements qui les portent (par nom ou par slug :
-- la V1 écrivait le slug dans `events.tags`, la V2 y écrit le nom).
create function public.admin_categories()
returns table (
  id uuid, name text, slug text, bg_color text, text_color text, sort_order integer,
  evenements bigint
)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform admin_garde();
  return query
  select t.id, t.name, t.slug, t.bg_color, t.text_color, t.sort_order,
    (select count(*) from events e where e.tags && array[t.name, t.slug])
  from tags t
  order by t.sort_order, t.name;
end $$;

-- Crée ou corrige une catégorie. Un renommage suit dans `events.tags` (ancien nom → nouveau nom,
-- ancien slug → nouveau slug), sinon les fiches perdraient leur catégorie. `notify_event_updated`
-- ignore `tags` : aucune notification ne part.
create function public.admin_categorie_enregistrer(
  p_id uuid, p_name text, p_slug text, p_bg text, p_text text, p_ordre integer
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  ancien tags%rowtype;
  v_id uuid;
begin
  perform admin_garde();
  if p_id is null then
    insert into tags (name, slug, bg_color, text_color, sort_order)
    values (trim(p_name), trim(p_slug), trim(p_bg), trim(p_text), p_ordre)
    returning tags.id into v_id;
    return v_id;
  end if;

  select * into ancien from tags where tags.id = p_id;
  if not found then
    raise exception 'catégorie introuvable';
  end if;
  update tags set name = trim(p_name), slug = trim(p_slug), bg_color = trim(p_bg),
    text_color = trim(p_text), sort_order = p_ordre
  where tags.id = p_id;
  if ancien.name <> trim(p_name) or ancien.slug <> trim(p_slug) then
    update events
    set tags = array_replace(array_replace(events.tags, ancien.name, trim(p_name)),
      ancien.slug, trim(p_slug))
    where events.tags && array[ancien.name, ancien.slug];
  end if;
  return p_id;
end $$;

revoke execute on function public.admin_signalements(text) from public, anon;
revoke execute on function public.admin_evenements(text, integer) from public, anon;
revoke execute on function public.admin_categories() from public, anon;
revoke execute on function public.admin_categorie_enregistrer(uuid, text, text, text, text, integer)
  from public, anon;
grant execute on function public.admin_signalements(text) to authenticated;
grant execute on function public.admin_evenements(text, integer) to authenticated;
grant execute on function public.admin_categories() to authenticated;
grant execute on function public.admin_categorie_enregistrer(uuid, text, text, text, text, integer)
  to authenticated;
