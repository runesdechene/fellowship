-- POURQUOI — on doit pouvoir dire qu'on a annulé sa participation à un festival, sans retirer la
-- date ni en perdre la trace (Uriel, 05/11/2026, maquette 2776:233). Comme « refuse », « annule »
-- ne compte nulle part : le calendrier, les bilans, la vitrine et les compteurs ne lisent que des
-- statuts nommés (interesse, en_cours, inscrit, confirme), il en sort donc de lui-même.
-- Seul : ADD VALUE ne peut servir dans la transaction qui l'ajoute (la suite est dans 20261105200100).
ALTER TYPE public.participation_status ADD VALUE IF NOT EXISTS 'annule';
