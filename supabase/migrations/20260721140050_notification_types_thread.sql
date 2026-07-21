-- Valeurs d'enum ajoutées AVANT la migration des triggers qui les emploient
-- (une valeur d'enum ne peut être utilisée dans la même transaction que son ADD VALUE).
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'thread_reply';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'best_reply';
