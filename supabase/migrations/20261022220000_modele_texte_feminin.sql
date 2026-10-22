-- POURQUOI — un modèle de mail peut avoir deux textes (Uriel, 22/10/2026) : un seul texte est
-- neutre et sert pour tous ; avec un second, le premier est le masculin et le second le féminin,
-- choisi selon le genre du prospect (20261022210000). Vide = pas de version féminine.
-- La liste des modèles doit rendre ce second texte : nouvelle colonne de retour de
-- admin_prospect_modeles, d'où le drop/create (définition live du 22/10/2026, seul `body_feminine`
-- s'ajoute ; l'application en ligne lit ses colonnes par leur nom).

alter table public.prospect_templates add column body_feminine text;

drop function public.admin_prospect_modeles();

CREATE FUNCTION public.admin_prospect_modeles()
 RETURNS TABLE(id uuid, kind text, name text, subject text, body text, body_feminine text, archived_at timestamp with time zone, envois bigint, reponses bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform admin_garde();
  return query
  select t.id, t.kind, t.name, t.subject, t.body, t.body_feminine, t.archived_at,
    (select count(*) from prospect_messages m where m.template_id = t.id),
    (select count(*) from prospect_messages m where m.template_id = t.id
      and exists (select 1 from prospect_messages r where r.prospect_id = m.prospect_id
        and r.direction = 'in' and r.received_at > m.sent_at))
  from prospect_templates t
  order by case t.kind when 'premier_contact' then 0 when 'relance' then 1 else 2 end,
    t.created_at, t.id;
end $function$;

-- Le drop a emporté les droits : les mêmes qu'avant.
revoke all on function public.admin_prospect_modeles() from public, anon;
grant execute on function public.admin_prospect_modeles() to authenticated, service_role;
