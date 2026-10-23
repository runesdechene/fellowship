-- POURQUOI — quand on coche « Fut croisé en festival », on note lesquels : un champ libre qui
-- n'apparaît sur la fiche que la case cochée (Uriel, 23/10/2026).
-- admin_prospect rend le champ : drop/create depuis 20261023110000, seul `festivals_croises` s'ajoute.

alter table public.prospects
  add column festivals_croises text;

drop function public.admin_prospect(uuid);

CREATE FUNCTION public.admin_prospect(p_id uuid)
 RETURNS TABLE(id uuid, name text, gender text, brand text, activity text, activity_secondary text, city text, email text, phone text, website text, social_primary text, social_secondary text, source text, note text, contact_channel text, contacted_on date, email_status text, a_relancer boolean, festival_commun boolean, festivals_croises text, joignable boolean, user_id uuid, user_name text, owner_id uuid, owner_name text, unsubscribed_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform admin_garde();
  return query
  select p.id, p.name, p.gender, p.brand, p.activity, p.activity_secondary, p.city, p.email, p.phone,
    p.website, p.social_primary, p.social_secondary,
    p.source, p.note, p.contact_channel, p.contacted_on, p.email_status, p.a_relancer, p.festival_commun, p.festivals_croises, p.joignable, p.user_id,
    u.display_name::text, p.owner_id, o.display_name::text, p.unsubscribed_at, p.created_at
  from prospects p
  left join users u on u.actor_id = p.user_id
  left join users o on o.actor_id = p.owner_id
  where p.id = p_id;
end $function$;

-- Le drop a emporté les droits : les mêmes qu'avant.
revoke all on function public.admin_prospect(uuid) from public, anon;
grant execute on function public.admin_prospect(uuid) to authenticated, service_role;
