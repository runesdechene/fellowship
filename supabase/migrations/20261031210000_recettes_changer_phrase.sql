-- POURQUOI : « Changer la phrase » dans Réglages · Enseignes (Uriel, 31/10/2026). Changer de phrase ne
-- doit rien perdre : le navigateur déchiffre toutes les recettes de l'enseigne avec l'ancienne clé, les
-- rechiffre avec la nouvelle (nouveau sel), puis cette fonction écrit EN UNE TRANSACTION la nouvelle
-- ligne revenue_keys et tous les nouveaux chiffrés. Elle refuse si les dates reçues ne sont pas
-- exactement celles de report_secrets pour l'enseigne : une ligne oubliée resterait sous l'ancienne
-- clé, illisible pour toujours.
-- created_at prend la date du changement : Réglages dit « Choisie le … », c'est la phrase en place.
-- Purement additif : une fonction neuve, que le code déployé n'appelle pas.

-- Security invoker : la RLS de revenue_keys et report_secrets s'applique ; le contrôle explicite donne
-- une erreur claire.
create function public.rekey_revenue(
  p_actor uuid,
  p_salt text,
  p_iterations int,
  p_check text,
  p_payloads jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_received int;
  v_distinct int;
  v_matched  int;
  v_existing int;
begin
  if not can_act_as(p_actor) then
    raise exception 'rekey_revenue: accès refusé' using errcode = '42501';
  end if;
  if p_payloads is null or jsonb_typeof(p_payloads) <> 'array' then
    raise exception 'rekey_revenue: p_payloads doit être un tableau';
  end if;

  -- FOR UPDATE bloque les scellements concurrents (leur clé étrangère prend KEY SHARE sur cette ligne) :
  -- aucune date ne peut s'ajouter entre la vérification ci-dessous et l'écriture.
  perform 1 from revenue_keys where actor_id = p_actor for update;
  if not found then
    raise exception 'rekey_revenue: aucune phrase pour cette enseigne';
  end if;

  select count(*), count(distinct i.event_id), count(s.event_id)
    into v_received, v_distinct, v_matched
    from jsonb_to_recordset(p_payloads) as i(event_id uuid, payload text)
    left join report_secrets s on s.actor_id = p_actor and s.event_id = i.event_id
   where i.payload is not null;
  select count(*) into v_existing from report_secrets where actor_id = p_actor;

  if v_received <> jsonb_array_length(p_payloads)
     or v_distinct <> v_received
     or v_matched <> v_received
     or v_existing <> v_received then
    raise exception 'rekey_revenue: les dates reçues ne correspondent pas aux recettes chiffrées de l''enseigne';
  end if;

  update revenue_keys
     set salt = p_salt, iterations = p_iterations, "check" = p_check, created_at = now()
   where actor_id = p_actor;

  update report_secrets s
     set payload = i.payload, updated_at = now()
    from jsonb_to_recordset(p_payloads) as i(event_id uuid, payload text)
   where s.actor_id = p_actor and s.event_id = i.event_id;
end
$$;

revoke execute on function public.rekey_revenue(uuid, text, int, text, jsonb) from public, anon;
grant execute on function public.rekey_revenue(uuid, text, int, text, jsonb) to authenticated;
