-- POURQUOI — la case « Contact » (20261023110000) recopiait ce que disent déjà l'e-mail et le
-- téléphone, et ne se cochait seule qu'à l'insertion : un e-mail tapé ensuite la laissait décochée.
-- Rien d'autre ne la lisait. La fiche montre désormais toujours l'e-mail et le téléphone
-- (Uriel, 26/10/2026).
-- admin_prospect : drop/create depuis la définition live, seul `joignable` s'en va.

drop trigger prospect_joignable_d_office on public.prospects;
drop function public.prospect_joignable_d_office();

drop function public.admin_prospect(uuid);

alter table public.prospects drop column joignable;

CREATE FUNCTION public.admin_prospect(p_id uuid)
 RETURNS TABLE(id uuid, name text, gender text, brand text, activity text, activity_secondary text, city text, email text, phone text, website text, social_primary text, social_secondary text, source text, note text, contact_channel text, contacted_on date, email_status text, a_relancer boolean, festival_commun boolean, festivals_croises text, user_id uuid, user_name text, owner_id uuid, owner_name text, unsubscribed_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform admin_garde();
  return query
  select p.id, p.name, p.gender, p.brand, p.activity, p.activity_secondary, p.city, p.email, p.phone,
    p.website, p.social_primary, p.social_secondary,
    p.source, p.note, p.contact_channel, p.contacted_on, p.email_status, p.a_relancer, p.festival_commun, p.festivals_croises, p.user_id,
    u.display_name::text, p.owner_id, o.display_name::text, p.unsubscribed_at, p.created_at
  from prospects p
  left join users u on u.actor_id = p.user_id
  left join users o on o.actor_id = p.owner_id
  where p.id = p_id;
end $function$;

revoke all on function public.admin_prospect(uuid) from public, anon;
grant execute on function public.admin_prospect(uuid) to authenticated, service_role;
