-- POURQUOI : lot 8d (10/10/2026). Les suggestions « Pour toi » prennent leur propre type de
-- notification. Seule dans sa migration : une valeur d'énumération ajoutée ne s'utilise pas
-- dans la transaction qui l'ajoute.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'suggestion';
