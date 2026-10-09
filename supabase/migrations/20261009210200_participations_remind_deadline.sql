-- POURQUOI : lot 8c (09/10/2026) — l'interrupteur « Me rappeler la clôture des candidatures »
-- de la fiche (maquette « Points de contact du Pro »). Uriel : il s'allume tout seul quand on
-- repère un festival ; les festivals déjà repérés l'ont allumé aussi (rattrapage).
ALTER TABLE public.participations
  ADD COLUMN IF NOT EXISTS remind_deadline boolean NOT NULL DEFAULT false;

UPDATE public.participations SET remind_deadline = true WHERE status = 'interesse';

CREATE OR REPLACE FUNCTION public.participations_remind_on_mark()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'interesse' THEN NEW.remind_deadline := true; END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS participations_remind_on_mark ON public.participations;
CREATE TRIGGER participations_remind_on_mark
  BEFORE INSERT ON public.participations
  FOR EACH ROW EXECUTE FUNCTION public.participations_remind_on_mark();
