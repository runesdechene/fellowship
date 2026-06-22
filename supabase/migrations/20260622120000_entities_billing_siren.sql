-- Facturation B2B : raison sociale + SIREN du client, pour des factures conformes
-- (réforme facturation électronique : SIREN client obligatoire sur factures B2B).
-- Stripe ne collecte pas le SIREN (FR = eu_vat seulement) → on le stocke ici et on
-- le pousse sur les factures via invoice_settings.custom_fields.
-- Ces colonnes NE SONT PAS protégées par protect_entity_plan (elles ne sont pas
-- des colonnes plan/abonnement) : le propriétaire peut les éditer via RLS owner-update.

ALTER TABLE public.entities
  ADD COLUMN legal_name TEXT,
  ADD COLUMN siren TEXT,
  ADD COLUMN billing_no_siren BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.entities.legal_name IS
  'Raison sociale légale du client (ex. « Uriel Lahoussaye EI »), distincte de brand_name (la marque). Imprimée comme name du Customer Stripe.';
COMMENT ON COLUMN public.entities.siren IS
  'SIREN du client, 9 chiffres normalisés (sans espaces). NULL si billing_no_siren. Poussé en custom_field sur les factures Stripe.';
COMMENT ON COLUMN public.entities.billing_no_siren IS
  'Case « Je n''ai pas de SIREN » (client étranger/particulier) : autorise l''absence de SIREN sans bloquer le checkout.';
