-- Stripe MVP v0.7.170 — schéma de souscription
-- Aligné sur "Pro par entité" : 1 entité = 1 customer Stripe = au plus 1 sub active.
-- Spec : docs/superpowers/specs/2026-05-28-stripe-mvp-design.md §3.3.

-- ── Colonnes Stripe sur entities ──────────────────────────────────────────
ALTER TABLE public.entities
  ADD COLUMN stripe_customer_id text,
  ADD COLUMN stripe_subscription_id text,
  ADD COLUMN subscription_status text,
  ADD COLUMN billing_interval text,
  ADD COLUMN current_period_end timestamptz,
  ADD COLUMN trial_end timestamptz;

ALTER TABLE public.entities ADD CONSTRAINT entities_subscription_status_check
  CHECK (subscription_status IS NULL OR subscription_status IN (
    'trialing','active','past_due','canceled','incomplete','incomplete_expired','unpaid'
  ));

ALTER TABLE public.entities ADD CONSTRAINT entities_billing_interval_check
  CHECK (billing_interval IS NULL OR billing_interval IN ('month','year'));

-- Lookups rapides depuis le webhook (subscription.id ou customer.id → entity).
-- Index uniques partiels (skipping NULLs) car la grande majorité des entités gratuites
-- n'auront pas ces colonnes renseignées.
CREATE UNIQUE INDEX entities_stripe_subscription_id_key
  ON public.entities (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE UNIQUE INDEX entities_stripe_customer_id_key
  ON public.entities (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ── Idempotence webhook ───────────────────────────────────────────────────
-- Stripe peut redélivrer un même event (retry, replay manuel). On marque chaque
-- event_id traité ; le webhook fait INSERT ON CONFLICT DO NOTHING et court-circuite
-- si déjà présent. event_type stocké pour audit / debug.
CREATE TABLE public.stripe_events_processed (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_events_processed ENABLE ROW LEVEL SECURITY;
-- Aucune policy = inaccessible à anon/authenticated. Seul service-role écrit/lit
-- (édge function webhook). Pas besoin d'exposer ces données aux clients.

COMMENT ON TABLE public.stripe_events_processed IS
  'Idempotence webhook Stripe (v0.7.170). Insertion ON CONFLICT DO NOTHING dans la edge function stripe-webhook ; si l''event_id existe déjà, on court-circuite le traitement.';

-- ── Note sur protect_entity_plan (existant depuis v0.7.168) ──────────────
-- Sa condition `auth.uid() IS NOT NULL` exclut déjà les appels service-role
-- (le webhook utilise service-role → auth.uid() = NULL). Aucune modification nécessaire.
-- La service-role reste la SEULE voie autorisée à écrire entities.plan.
