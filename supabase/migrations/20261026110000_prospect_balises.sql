-- POURQUOI — Uriel veut baliser un prospect (#Uriel s'il doit le recontacter, #Orga si c'est aussi
-- un organisateur) et trier dessus (26/10/2026). Les balises s'écrivent dans la note : pas de champ
-- de plus. Un mot qui commence par # en début de note ou après une espace (pas l'ancre d'une
-- adresse) ; casse ignorée, #orga = #Orga.
-- admin_prospects et admin_prospects_filtres prennent `p_balise` : drop/create depuis la
-- définition live (un paramètre de plus ferait une surcharge ambiguë). Le défaut '' garde
-- l'appel de la version déployée.

create function public.prospect_balises(p_note text) returns text[]
  language sql
  immutable
  set search_path to 'public'
as $function$
  select coalesce(array_agg(m[2]), '{}')
  from regexp_matches(coalesce(p_note, ''), '(^|\s)#([[:alnum:]_-]+)', 'g') m;
$function$;

create function public.prospect_balise(p prospects, p_balise text) returns boolean
  language sql
  immutable
  set search_path to 'public'
as $function$
  select coalesce(p_balise, '') = ''
    or lower(p_balise) = any(select lower(b) from unnest(prospect_balises(p.note)) b);
$function$;

revoke all on function public.prospect_balises(text) from public, anon, authenticated;
revoke all on function public.prospect_balise(public.prospects, text) from public, anon, authenticated;

-- Les balises existantes, pour le menu et la suggestion à la frappe. Une balise écrite avec
-- plusieurs casses se montre sous la plus fréquente.
create function public.admin_prospects_balises()
 RETURNS TABLE(balise text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform admin_garde();
  return query
  select mode() within group (order by b) from prospects p, unnest(prospect_balises(p.note)) b
  group by lower(b)
  order by lower(b);
end $function$;

revoke all on function public.admin_prospects_balises() from public, anon;
grant execute on function public.admin_prospects_balises() to authenticated, service_role;

drop function public.admin_prospects(text, text, text, text, integer);

CREATE FUNCTION public.admin_prospects(p_q text DEFAULT ''::text, p_filtre text DEFAULT 'tous'::text, p_source text DEFAULT ''::text, p_suivi text DEFAULT ''::text, p_page integer DEFAULT 0, p_balise text DEFAULT ''::text)
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
  order by p.created_at desc, p.id
  limit 50 offset greatest(p_page, 0) * 50;
end $function$;

revoke all on function public.admin_prospects(text, text, text, text, integer, text) from public, anon;
grant execute on function public.admin_prospects(text, text, text, text, integer, text) to authenticated, service_role;

drop function public.admin_prospects_filtres(text, text, text);

CREATE FUNCTION public.admin_prospects_filtres(p_q text DEFAULT ''::text, p_source text DEFAULT ''::text, p_suivi text DEFAULT ''::text, p_balise text DEFAULT ''::text)
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
        and prospect_suivi(p, p_suivi) and prospect_balise(p, p_balise);
    return next;
  end loop;
end $function$;

revoke all on function public.admin_prospects_filtres(text, text, text, text) from public, anon;
grant execute on function public.admin_prospects_filtres(text, text, text, text) to authenticated, service_role;
