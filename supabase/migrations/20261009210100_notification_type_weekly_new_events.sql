-- POURQUOI : lot 8c (09/10/2026) — le récapitulatif du mardi, « X nouveaux événements sur
-- Fellowship ». Seul dans sa migration, comme toute valeur d'enum ajoutée.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'weekly_new_events';
