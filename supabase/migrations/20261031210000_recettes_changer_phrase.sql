-- POURQUOI : « Changer la phrase » dans Réglages · Enseignes (Uriel, 31/10/2026). Changer de phrase ne
-- doit rien perdre : le navigateur déchiffre toutes les recettes de l'enseigne avec l'ancienne clé, les
-- rechiffre avec la nouvelle (nouveau sel), puis cette fonction écrit EN UNE TRANSACTION la nouvelle
-- ligne revenue_keys et tous les nouveaux chiffrés. Elle refuse si les dates reçues ne sont pas
-- exactement celles de report_secrets pour l'enseigne : une ligne oubliée resterait sous l'ancienne
-- clé, illisible pour toujours.
-- created_at prend la date du changement : Réglages dit « Choisie le … », c'est la phrase en place.
--
-- Un onglet resté ouvert avec l'ancienne clé ne doit plus rien sceller après le changement : il
-- écrirait une date que plus personne n'ouvre, et tout changement suivant échouerait. La clé
-- étrangère ne protège que les insertions, pas la mise à jour d'une date déjà chiffrée. D'où
-- seal_revenue à quatre arguments : il reçoit le "check" de la phrase contre laquelle le client a
-- vérifié sa clé, verrouille la ligne revenue_keys en partage et refuse ('phrase_changee') si la
-- phrase n'est plus celle-là. rekey_revenue la verrouille en exclusif : les deux s'attendent, et un
-- scellement qui passe après un changement voit le nouveau "check".
-- La version à trois arguments reste pour le front déjà déployé (docs/v2/purge-back.md).
-- Purement additif : deux fonctions neuves, que le code déployé n'appelle pas.

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

  -- FOR UPDATE attend les scellements en cours et bloque les suivants jusqu'à la fin : seal_revenue à
  -- quatre arguments prend FOR SHARE sur cette ligne, la clé étrangère de l'ancien prend KEY SHARE (il
  -- ne bloque donc que les dates nouvelles, pas la réécriture d'une date existante).
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

-- seal_revenue (uuid, uuid, text) : définition live copiée entière, plus le contrôle de la phrase.
create function public.seal_revenue(p_actor uuid, p_event uuid, p_payload text, p_check text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_check text;
begin
  if not can_act_as(p_actor) then
    raise exception 'seal_revenue: accès refusé' using errcode = '42501';
  end if;

  -- La phrase contre laquelle le client a vérifié sa clé doit être encore celle en place. FOR SHARE :
  -- un changement de phrase en cours (rekey_revenue, FOR UPDATE) finit avant, et on relit son "check".
  select "check" into v_check from revenue_keys where actor_id = p_actor for share;
  if v_check is distinct from p_check then
    raise exception 'phrase_changee';
  end if;

  -- Le bilan existe dès la première saisie, même règle que set_stand_amount et ensureReport.
  insert into event_reports (actor_id, event_id)
  values (p_actor, p_event)
  on conflict (actor_id, event_id) do nothing;

  insert into report_secrets (actor_id, event_id, payload, updated_at)
  values (p_actor, p_event, p_payload, now())
  on conflict (actor_id, event_id) do update set payload = excluded.payload, updated_at = now();

  -- Les recettes saisies en clair que le chiffré remplace ; le cachet (stepper) reste en clair.
  delete from event_ledger_entries
   where actor_id = p_actor and event_id = p_event and direction = 'in' and source = 'manual';
end
$$;

revoke execute on function public.seal_revenue(uuid, uuid, text, text) from public, anon;
grant execute on function public.seal_revenue(uuid, uuid, text, text) to authenticated;
