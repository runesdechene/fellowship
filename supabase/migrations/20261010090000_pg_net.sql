-- POURQUOI : lot 8e (notifications sur le téléphone). Après chaque notification, la base appelle
-- la fonction en ligne send-push ; pg_net est l'outil standard de Supabase pour un appel HTTP
-- depuis Postgres, sans attendre la réponse.
CREATE EXTENSION IF NOT EXISTS pg_net;
