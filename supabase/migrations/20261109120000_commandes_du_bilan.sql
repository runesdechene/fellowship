-- POURQUOI : les commandes d'une date (Uriel, 09/11/2026), saisies avant ou après le festival, pour voir
-- venir. « Commandes sûres » : promises, elles comptent comme une recette, donc une ligne du registre que
-- tous les totaux voient. « Commandes potentielles » : simplement possibles, elles n'entrent dans AUCUN
-- calcul, donc une colonne d'event_reports, jamais une ligne du registre.
-- Sur une date chiffrée, les deux vivent dans le message scellé (report_secrets) : rien ici.
-- Purement additif pour le front déployé : seal_revenue garde sa signature.

alter table public.event_ledger_entries drop constraint event_ledger_entries_category_check;
alter table public.event_ledger_entries add constraint event_ledger_entries_category_check
  check (category in ('emplacement','cachet','essence','peage','hebergement','repas','remboursement','ventes','autre','commande_sure'));

-- Une seule ligne de commandes sûres par bilan, comme la ligne « stepper ».
create unique index uniq_ledger_commande_sure_per_report
  on public.event_ledger_entries (report_id) where category = 'commande_sure';

alter table public.event_reports
  add column potential_orders numeric check (potential_orders >= 0);

-- Security invoker : la RLS s'applique ; le contrôle explicite donne une erreur claire.
create function public.set_clear_order(p_actor uuid, p_event uuid, p_kind text, p_amount numeric)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_report uuid;
begin
  if not can_act_as(p_actor) then
    raise exception 'set_clear_order: accès refusé' using errcode = '42501';
  end if;
  if p_kind not in ('sures', 'potentielles') or p_amount is null or p_amount < 0 then
    raise exception 'set_clear_order: valeur invalide' using errcode = '22023';
  end if;
  -- Un onglet resté ouvert ne doit pas écrire en clair sur une date chiffrée entre-temps.
  if exists (select 1 from report_secrets where actor_id = p_actor and event_id = p_event) then
    raise exception 'set_clear_order: date chiffrée' using errcode = '22023';
  end if;

  insert into event_reports (actor_id, event_id)
  values (p_actor, p_event)
  on conflict (actor_id, event_id) do nothing;

  select id into v_report from event_reports where actor_id = p_actor and event_id = p_event;

  if p_kind = 'potentielles' then
    update event_reports set potential_orders = nullif(p_amount, 0) where id = v_report;
  elsif p_amount = 0 then
    delete from event_ledger_entries where report_id = v_report and category = 'commande_sure';
  else
    insert into event_ledger_entries (report_id, actor_id, event_id, label, amount, direction, category, source)
    values (v_report, p_actor, p_event, 'Commandes sûres', p_amount, 'in', 'commande_sure', 'manual')
    on conflict (report_id) where category = 'commande_sure'
    do update set amount = excluded.amount;
  end if;
end
$$;

revoke execute on function public.set_clear_order(uuid, uuid, text, numeric) from public, anon;
grant execute on function public.set_clear_order(uuid, uuid, text, numeric) to authenticated;

-- Copiée de la définition live ; seul ajout : les commandes potentielles en clair que le chiffré remplace.
CREATE OR REPLACE FUNCTION public.seal_revenue(p_actor uuid, p_event uuid, p_payload text, p_check text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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

  -- Même chose pour les commandes potentielles : elles sont désormais dans le message scellé.
  update event_reports set potential_orders = null
   where actor_id = p_actor and event_id = p_event and potential_orders is not null;
end
$function$;
