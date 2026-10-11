-- POURQUOI : lot 9b (11/10/2026, accord d'Uriel). La politique entities_update_member laisse tout
--   membre modifier sa ligne d'enseigne ; seuls plan, comped_pro_until et is_ambassador étaient
--   protégés. Un membre pouvait donc s'écrire un abonnement « active » ou une fin de période
--   lointaine. Les colonnes d'abonnement ne s'écrivent plus que par les fonctions serveur (client
--   admin, sans auth.uid()) — le webhook Stripe. legal_name et siren restent modifiables (voulu).
-- Définition reprise entière du live, seules les lignes Stripe s'ajoutent.
CREATE OR REPLACE FUNCTION public.protect_entity_plan()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.plan IS DISTINCT FROM OLD.plan THEN
      NEW.plan := OLD.plan;
    END IF;
    IF NEW.comped_pro_until IS DISTINCT FROM OLD.comped_pro_until THEN
      NEW.comped_pro_until := OLD.comped_pro_until;
    END IF;
    IF NEW.is_ambassador IS DISTINCT FROM OLD.is_ambassador THEN
      NEW.is_ambassador := OLD.is_ambassador;
    END IF;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.stripe_subscription_id := OLD.stripe_subscription_id;
    NEW.subscription_status := OLD.subscription_status;
    NEW.billing_interval := OLD.billing_interval;
    NEW.current_period_end := OLD.current_period_end;
    NEW.trial_end := OLD.trial_end;
    NEW.discount_end := OLD.discount_end;
    NEW.discount_label := OLD.discount_label;
  END IF;
  RETURN NEW;
END;
$function$;
