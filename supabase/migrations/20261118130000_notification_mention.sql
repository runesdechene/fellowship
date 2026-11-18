-- POURQUOI : taguer un exposant avec @ dans un sujet le prévient (cloche et téléphone) — Uriel,
-- 18/11/2026. La valeur d'enum vit dans sa propre migration : une valeur ajoutée ne peut pas
-- servir dans la transaction qui la crée.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'mention';
