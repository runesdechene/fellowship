-- POURQUOI : le type de notification « nouvelle édition d'un festival que tu as fait » (alerte
-- Pro). Seul dans sa migration : une valeur d'enum ajoutée ne s'utilise pas dans la même
-- transaction.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'new_edition';
