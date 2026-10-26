-- POURQUOI — Uriel veut trier les prospects par réseau social (26/10/2026). Le filtre reçoit le
-- domaine du réseau (`instagram.com`, liste dans apps/web-v2/src/lib/social.ts) et le cherche
-- dans les deux réseaux du prospect, sous-domaine compris (www., m.). Un domaine mal formé ne
-- trouve rien.
-- admin_prospects et admin_prospects_filtres prennent `p_reseau` : drop/create depuis la
-- définition live (20261026110000), '' par défaut pour la version déployée.

create function public.prospect_reseau(p prospects, p_reseau text) returns boolean
  language sql
  immutable
  set search_path to 'public'
as $function$
  select coalesce(p_reseau, '') = ''
    or (p_reseau ~ '^[a-z0-9.-]+$'
      and concat_ws(' ', p.social_primary, p.social_secondary)
        ~* ('(^|[[:space:]/.])' || replace(p_reseau, '.', '\.') || '($|[[:space:]/?:#])'));
$function$;

revoke all on function public.prospect_reseau(public.prospects, text) from public, anon, authenticated;

drop function public.admin_prospects(text, text, text, text, integer, text);

CREATE FUNCTION public.admin_prospects(p_q text DEFAULT ''::text, p_filtre text DEFAULT 'tous'::text, p_source text DEFAULT ''::text, p_suivi text DEFAULT ''::text, p_page integer DEFAULT 0, p_balise text DEFAULT ''::text, p_reseau text DEFAULT ''::text)
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
    and prospect_suivi(p, p_suivi) and prospect_balise(p, p_balise)
    and prospect_reseau(p, p_reseau)
  order by p.created_at desc, p.id
  limit 50 offset greatest(p_page, 0) * 50;
end $function$;

revoke all on function public.admin_prospects(text, text, text, text, integer, text, text) from public, anon;
grant execute on function public.admin_prospects(text, text, text, text, integer, text, text) to authenticated, service_role;

drop function public.admin_prospects_filtres(text, text, text, text);

CREATE FUNCTION public.admin_prospects_filtres(p_q text DEFAULT ''::text, p_source text DEFAULT ''::text, p_suivi text DEFAULT ''::text, p_balise text DEFAULT ''::text, p_reseau text DEFAULT ''::text)
 RETURNS TABLE(filtre text, nombre bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare f text;
begin
  perform admin_garde();
  foreach f in array array['tous', 'a_contacter', 'contactes', 'repondu', 'a_repondre', 'compte',
    'a_relancer']
  loop
    filtre := f;
    select count(*) into nombre from prospects p
      where prospect_dans_filtre(p, f) and prospect_cherche(p, p_q, p_source)
        and prospect_suivi(p, p_suivi) and prospect_balise(p, p_balise)
        and prospect_reseau(p, p_reseau);
    return next;
  end loop;
end $function$;

revoke all on function public.admin_prospects_filtres(text, text, text, text, text) from public, anon;
grant execute on function public.admin_prospects_filtres(text, text, text, text, text) to authenticated, service_role;
