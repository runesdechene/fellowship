-- POURQUOI — l'apprenti veut cocher qu'un prospect a déjà fait un festival avec nous (Mathéo ou
-- Uriel, en commercial Fellowship ou pour Runes de Chêne) : le premier contact n'est alors pas
-- à froid (Uriel, 23/10/2026). La fiche doit rendre la case : nouvelle colonne de retour de
-- admin_prospect, d'où le drop/create (définition de 20261022210000, seul `festival_commun` s'ajoute).

alter table public.prospects
  add column festival_commun boolean not null default false;

drop function public.admin_prospect(uuid);

CREATE FUNCTION public.admin_prospect(p_id uuid)
 RETURNS TABLE(id uuid, name text, gender text, brand text, activity text, activity_secondary text, city text, email text, phone text, website text, social_primary text, social_secondary text, source text, note text, contact_channel text, contacted_on date, email_status text, a_relancer boolean, festival_commun boolean, user_id uuid, user_name text, owner_id uuid, owner_name text, unsubscribed_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform admin_garde();
  return query
  select p.id, p.name, p.gender, p.brand, p.activity, p.activity_secondary, p.city, p.email, p.phone,
    p.website, p.social_primary, p.social_secondary,
    p.source, p.note, p.contact_channel, p.contacted_on, p.email_status, p.a_relancer, p.festival_commun, p.user_id,
    u.display_name::text, p.owner_id, o.display_name::text, p.unsubscribed_at, p.created_at
  from prospects p
  left join users u on u.actor_id = p.user_id
  left join users o on o.actor_id = p.owner_id
  where p.id = p_id;
end $function$;

-- Le drop a emporté les droits : les mêmes qu'avant.
revoke all on function public.admin_prospect(uuid) from public, anon;
grant execute on function public.admin_prospect(uuid) to authenticated, service_role;
