-- POURQUOI : lot 8c (09/10/2026) — « ton ami a ajouté un événement », tout de suite. Seul dans sa
-- migration : une valeur d'enum ajoutée ne s'utilise pas dans la même transaction.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'friend_added_event';
