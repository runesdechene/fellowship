-- Stripe MVP v0.7.178 — suivi des codes promo (coupons Stripe) sur les abonnements
-- Quand un user souscrit avec un code (ex: GUILDEDESVOYAGEURS), Stripe pose un
-- `discount` sur la sub avec end timestamp. Sans ces colonnes, l'app affichait
-- "tu seras prélevé dans 14j" alors que le coupon couvre 2 mois supplémentaires.

ALTER TABLE public.entities
  ADD COLUMN discount_end timestamptz,
  ADD COLUMN discount_label text;

COMMENT ON COLUMN public.entities.discount_end IS
  'Fin du coupon promo Stripe (s''il y en a un). Au-delà, la sub redevient pleinement facturée. NULL = pas de coupon actif.';
COMMENT ON COLUMN public.entities.discount_label IS
  'Nom du coupon Stripe (ex: "Fellowship - Guilde 2 Mois Offerts") pour affichage UI.';
