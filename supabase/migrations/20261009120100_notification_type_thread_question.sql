-- POURQUOI : un nouveau type de notification, « une question sur un festival où tu vas ». Seul
-- dans sa migration : une valeur d'enum ajoutée ne s'utilise pas dans la même transaction.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'thread_question';
