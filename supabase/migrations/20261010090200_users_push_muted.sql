-- POURQUOI : lot 8e. Les Réglages ont six lignes ; chacune décide si elle sonne aussi sur le
-- téléphone. On retient les lignes COUPÉES, par personne (valable pour tous ses téléphones).
-- D'office, seule « Nouveaux abonnés » est coupée (Uriel, 09/10/2026). La politique
-- users_update_self laisse la personne écrire sa ligne.
ALTER TABLE public.users
  ADD COLUMN push_muted text[] NOT NULL DEFAULT '{new_followers}'
  CONSTRAINT users_push_muted_lines CHECK (
    push_muted <@ ARRAY['deadline', 'new_edition', 'friends', 'discussions', 'new_followers', 'weekly']
  );
