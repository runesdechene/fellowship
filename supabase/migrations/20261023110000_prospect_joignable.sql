-- POURQUOI — certains prospects ne se joignent que par leurs réseaux : on les garde sous le coude
-- pour plus tard. Une case « Contact » sur la fiche dit s'il a un e-mail ou un téléphone ;
-- cochée, ces deux lignes apparaissent (demande de l'apprenti, Uriel, 23/10/2026).
-- Un prospect qui arrive avec un e-mail ou un téléphone (import, réponse non classée) est
-- joignable d'office : le déclencheur évite de le répéter dans chaque chemin d'écriture.
-- admin_prospect rend la case : drop/create depuis 20261023100000, seul `joignable` s'ajoute.

alter table public.prospects
  add column joignable boolean not null default false;

update public.prospects set joignable = true where email is not null or phone is not null;

create function public.prospect_joignable_d_office() returns trigger
  language plpgsql
  set search_path to 'public'
as $function$
begin
  new.joignable := new.joignable or new.email is not null or new.phone is not null;
  return new;
end $function$;

create trigger prospect_joignable_d_office before insert on public.prospects
  for each row execute function public.prospect_joignable_d_office();
drop function public.admin_prospect(uuid);

CREATE FUNCTION public.admin_prospect(p_id uuid)
 RETURNS TABLE(id uuid, name text, gender text, brand text, activity text, activity_secondary text, city text, email text, phone text, website text, social_primary text, social_secondary text, source text, note text, contact_channel text, contacted_on date, email_status text, a_relancer boolean, festival_commun boolean, joignable boolean, user_id uuid, user_name text, owner_id uuid, owner_name text, unsubscribed_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform admin_garde();
  return query
  select p.id, p.name, p.gender, p.brand, p.activity, p.activity_secondary, p.city, p.email, p.phone,
    p.website, p.social_primary, p.social_secondary,
    p.source, p.note, p.contact_channel, p.contacted_on, p.email_status, p.a_relancer, p.festival_commun, p.joignable, p.user_id,
    u.display_name::text, p.owner_id, o.display_name::text, p.unsubscribed_at, p.created_at
  from prospects p
  left join users u on u.actor_id = p.user_id
  left join users o on o.actor_id = p.owner_id
  where p.id = p_id;
end $function$;

-- Le drop a emporté les droits : les mêmes qu'avant.
revoke all on function public.admin_prospect(uuid) from public, anon;
grant execute on function public.admin_prospect(uuid) to authenticated, service_role;
