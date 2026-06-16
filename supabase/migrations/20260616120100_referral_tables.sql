-- Parrainage v1 — tables. L'unité de parrainage est l'ENTITÉ (owner_entity_id / *_entity_id).
-- Accès client : AUCUN direct (RLS activée, zéro policy). Tout passe par les RPC SECURITY
-- DEFINER (lecture/attribution) et la service-role (webhook : récompense). Le badge public
-- est lu via entities.is_ambassador, pas via ces tables → pas besoin d'exposer referrals.

-- Code de parrainage : un par entité, dérivé du nom de marque (+ suffixe si collision).
CREATE TABLE public.referral_codes (
  code            text PRIMARY KEY,
  owner_entity_id uuid NOT NULL REFERENCES public.entities(actor_id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now()
);
-- Une entité = au plus un code.
CREATE UNIQUE INDEX referral_codes_owner_key ON public.referral_codes (owner_entity_id);

-- Rattachement filleul → parrain. Un filleul a au plus un parrain, à vie.
CREATE TABLE public.referrals (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parrain_entity_id     uuid NOT NULL REFERENCES public.entities(actor_id) ON DELETE CASCADE,
  filleul_entity_id     uuid NOT NULL UNIQUE REFERENCES public.entities(actor_id) ON DELETE CASCADE,
  status                text NOT NULL DEFAULT 'attributed'
                          CHECK (status IN ('attributed', 'rewarded', 'rejected_fraud')),
  filleul_gift_granted  boolean NOT NULL DEFAULT false,
  attributed_at         timestamptz NOT NULL DEFAULT now(),
  filleul_first_paid_at timestamptz,
  parrain_rewarded_at   timestamptz,
  -- Pas d'auto-parrainage, même au niveau DB (défense en profondeur).
  CONSTRAINT referrals_no_self CHECK (parrain_entity_id <> filleul_entity_id)
);
CREATE INDEX referrals_parrain_idx ON public.referrals (parrain_entity_id);

-- RLS : activée, aucune policy → inaccessible à anon/authenticated. Accès via RPC + service-role.
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.referral_codes IS
  'Codes de parrainage (1 par entité). Accès via RPC ensure_referral_code / get_referral_overview / attribute_referral.';
COMMENT ON TABLE public.referrals IS
  'Rattachements filleul→parrain. status attributed→rewarded au 1er paiement réel du filleul (webhook). RLS sans policy : RPC + service-role only.';
