-- POURQUOI : 80 caractères bridaient les sujets ; Uriel porte la limite à 144 (MOT_MAX côté front).
ALTER TABLE public.conversations DROP CONSTRAINT conversations_mot_check;
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_mot_check CHECK (mot IS NULL OR char_length(mot) BETWEEN 1 AND 144);
