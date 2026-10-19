-- POURQUOI : un exposant qui résilie dans l'espace Stripe garde le Pro jusqu'à la fin de sa période,
-- mais la base ne le savait pas : la V2 affichait « renouvelé le X » à quelqu'un qui part
-- (chantier 3, 19/10/2026). Le webhook écrit désormais la date d'arrêt programmée ; comme les autres
-- colonnes d'abonnement, seule une fonction serveur l'écrit (protect_entity_plan), et elle n'est
-- lisible que par `mes_enseignes()` (pas de grant par colonne à `authenticated`, cf. 20261019130000).
-- protect_entity_plan : définition live du 19/10/2026, une ligne ajoutée (cancel_at).

alter table public.entities add column cancel_at timestamptz;

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
    IF NEW.comped_pro_until IS DISTINCT FROM OLD.comped_pro_until AND NOT is_admin() THEN
      NEW.comped_pro_until := OLD.comped_pro_until;
    END IF;
    IF NEW.is_ambassador IS DISTINCT FROM OLD.is_ambassador AND NOT is_admin() THEN
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
    NEW.paid_by_user := OLD.paid_by_user;
    NEW.cancel_at := OLD.cancel_at;
  END IF;
  RETURN NEW;
END;
$function$;
