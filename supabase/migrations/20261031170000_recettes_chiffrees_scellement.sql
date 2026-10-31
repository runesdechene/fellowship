-- POURQUOI : sceller des recettes doit être sûr même quand la phrase a changé ailleurs (revue finale des
-- recettes chiffrées, 31/10/2026). Deux trous :
-- 1. Après une réinitialisation sur un autre appareil, un onglet resté ouvert avec l'ancienne clé
--    écrivait encore des report_secrets que plus aucune phrase n'ouvre. La clé étrangère vers
--    revenue_keys refuse désormais tout chiffré sans phrase en place, et une réinitialisation (ou la
--    suppression de l'enseigne) emporte les chiffrés avec la clé. La prod a 0 ligne dans les deux tables
--    (vérifié le 31/10/2026) : la contrainte se pose sans rien toucher.
-- 2. Le client écrivait le chiffré puis effaçait les recettes en clair en deux requêtes : seal_revenue
--    fait les deux (et crée le bilan au besoin, comme set_stand_amount) dans une seule transaction.

alter table public.report_secrets
  add constraint report_secrets_actor_key_fkey
  foreign key (actor_id) references public.revenue_keys(actor_id) on delete cascade;

-- Security invoker : la RLS des trois tables s'applique ; le contrôle explicite donne une erreur claire.
create function public.seal_revenue(p_actor uuid, p_event uuid, p_payload text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not can_act_as(p_actor) then
    raise exception 'seal_revenue: accès refusé' using errcode = '42501';
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

revoke execute on function public.seal_revenue(uuid, uuid, text) from public, anon;
grant execute on function public.seal_revenue(uuid, uuid, text) to authenticated;
