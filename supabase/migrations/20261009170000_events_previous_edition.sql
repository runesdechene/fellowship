-- POURQUOI : relier les éditions d'un même festival (lot 8b de la V2, 09/10/2026). Sert l'alerte
-- « nouvelle édition » du Pro et le bilan de l'an passé affiché sur la fiche de la nouvelle
-- édition (retour client du 08/10/2026). Posée à la création ; un rattrapage validé par Uriel
-- relie les festivals existants.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS previous_edition_id uuid REFERENCES public.events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_previous_edition ON public.events (previous_edition_id);
