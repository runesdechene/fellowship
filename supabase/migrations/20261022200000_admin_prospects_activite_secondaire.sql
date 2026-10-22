-- POURQUOI — dans le tableau des prospects, la colonne « Activité » montrait « Maroquinerie ·
-- Nantes » : passée à la ligne, la ville se lisait comme une activité (Uriel, 22/10/2026). La
-- colonne montre désormais l'activité principale puis la secondaire (20261022150000), la ville
-- passe sous la marque. La liste doit donc rendre l'activité secondaire : nouvelle colonne de
-- retour, d'où le drop/create. Définition live du 22/10/2026, seule `activity_secondary` s'ajoute ;
-- l'ajout ne gêne pas l'application déjà en ligne, qui lit ses colonnes par leur nom.

drop function public.admin_prospects(text, text, text, text, integer);

CREATE FUNCTION public.admin_prospects(p_q text DEFAULT ''::text, p_filtre text DEFAULT 'tous'::text, p_source text DEFAULT ''::text, p_suivi text DEFAULT ''::text, p_page integer DEFAULT 0)
 RETURNS TABLE(id uuid, name text, brand text, activity text, activity_secondary text, city text, email text, phone text, source text, note text, contact_channel text, contacted_on date, email_status text, a_relancer boolean, user_id uuid, user_name text, linked_at timestamp with time zone, linked_by text, owner_id uuid, owner_name text, unsubscribed_at timestamp with time zone, a_repondre boolean, created_at timestamp with time zone, total bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform admin_garde();
  return query
  select p.id, p.name, p.brand, p.activity, p.activity_secondary, p.city, p.email, p.phone,
    p.source, p.note,
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
end $function$;

-- Le drop a emporté les droits : les mêmes qu'avant.
revoke all on function public.admin_prospects(text, text, text, text, integer) from public, anon;
grant execute on function public.admin_prospects(text, text, text, text, integer) to authenticated, service_role;
