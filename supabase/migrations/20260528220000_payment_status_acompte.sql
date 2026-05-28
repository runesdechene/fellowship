-- Étend le CHECK constraint sur participations.payment_status pour autoriser
-- la nouvelle valeur intermédiaire 'acompte_verse' (entre 'a_payer' et 'paye').
-- L'ancien 'en_cours_paiement' est gardé pour compatibilité avec d'éventuelles
-- lignes legacy non-migrées.

alter table public.participations
  drop constraint if exists participations_payment_status_check;

alter table public.participations
  add constraint participations_payment_status_check
  check (payment_status is null or payment_status in ('a_payer', 'acompte_verse', 'en_cours_paiement', 'paye'));
