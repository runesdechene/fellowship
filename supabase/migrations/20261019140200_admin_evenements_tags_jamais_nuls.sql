-- POURQUOI : `events.tags` peut être nul, mais le type généré d'une fonction `returns table` déclare
-- chaque colonne non nulle : l'écran des événements (lot 4) parcourt les catégories sans garde.
-- La fonction rend donc une liste vide plutôt que nul. Repris de la définition live
-- (20261019140000), seule la colonne `tags` change.

create or replace function public.admin_evenements(p_q text default '', p_page integer default 0)
returns table (
  id uuid, name text, city text, department text, start_date date, end_date date, tags text[],
  is_private boolean, created_at timestamptz, creator_name text, exposants bigint, total bigint
)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform admin_garde();
  return query
  select e.id, e.name, e.city, e.department, e.start_date, e.end_date,
    coalesce(e.tags, '{}'::text[]), e.is_private, e.created_at, creator.label::text,
    (select count(distinct p.actor_id) from participations p where p.event_id = e.id),
    count(*) over ()
  from events e
  left join actor_public creator on creator.actor_id = e.created_by_actor
  where coalesce(trim(p_q), '') = '' or admin_cherche(e.name, p_q) or admin_cherche(e.city, p_q)
  order by e.created_at desc, e.id
  limit 50 offset greatest(p_page, 0) * 50;
end $$;
