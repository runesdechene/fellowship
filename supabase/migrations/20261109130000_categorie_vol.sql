-- POURQUOI : décompter les vols subis pendant un festival (Uriel, 09/11/2026) : une charge du bilan,
-- comptée dans les frais. Élargit la liste des catégories, sans effet sur le front déployé.

alter table public.event_ledger_entries drop constraint event_ledger_entries_category_check;
alter table public.event_ledger_entries add constraint event_ledger_entries_category_check
  check (category in ('emplacement','cachet','essence','peage','hebergement','repas','remboursement','ventes','autre','commande_sure','vol'));
