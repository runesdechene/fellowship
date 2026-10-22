-- POURQUOI : une entreprise peut avoir deux métiers (une forge qui fait aussi de la maroquinerie).
-- La fiche d'un prospect demande une activité principale et une activité secondaire (Uriel,
-- 22/10/2026). Seule la fiche la montre : le tableau, l'import et les modèles n'en parlent pas.
--
-- admin_prospect change de colonnes rendues : il faut le supprimer puis le recréer (définition
-- live du 22/10/2026, plus la colonne), et lui rendre son droit d'exécution.

alter table public.prospects add column activity_secondary text;

drop function public.admin_prospect(uuid);

CREATE FUNCTION public.admin_prospect(p_id uuid)
 RETURNS TABLE(id uuid, name text, brand text, activity text, activity_secondary text, city text, email text, phone text, source text, note text, contact_channel text, contacted_on date, email_status text, a_relancer boolean, user_id uuid, user_name text, owner_id uuid, owner_name text, unsubscribed_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform admin_garde();
  return query
  select p.id, p.name, p.brand, p.activity, p.activity_secondary, p.city, p.email, p.phone,
    p.source, p.note, p.contact_channel, p.contacted_on, p.email_status, p.a_relancer, p.user_id,
    u.display_name::text, p.owner_id, o.display_name::text, p.unsubscribed_at, p.created_at
  from prospects p
  left join users u on u.actor_id = p.user_id
  left join users o on o.actor_id = p.owner_id
  where p.id = p_id;
end $function$;

revoke all on function public.admin_prospect(uuid) from public, anon;
grant execute on function public.admin_prospect(uuid) to authenticated;
