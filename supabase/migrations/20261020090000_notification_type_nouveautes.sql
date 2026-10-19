-- POURQUOI : les Nouveautés (spec 2026-10-19-v2-nouveautes-design.md). Une mise à jour publiée, une
-- réponse à un commentaire et un nouveau commentaire (pour les admins) prennent chacun leur type de
-- notification. Seules dans leur migration : une valeur d'énumération ajoutée ne s'utilise pas dans
-- la transaction qui l'ajoute.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'app_update';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'app_update_reply';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'app_update_comment';
