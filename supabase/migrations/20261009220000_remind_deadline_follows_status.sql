-- POURQUOI : relecture du lot 8c (09/10/2026). Le rappel de clôture ne s'allumait qu'à la
-- création d'une participation « intéressé » : un festival qui passait ensuite à « dossier
-- envoyé » ou « inscrit » gardait son rappel, et l'exposant recevait « Plus que 7 jours pour
-- candidater » alors qu'il avait candidaté. Décision d'Uriel : par défaut, seuls les festivals
-- repérés, pas encore candidatés, sont rappelés. Le rappel suit donc le statut quand il entre
-- dans « intéressé » ou en sort ; l'interrupteur de la fiche peut toujours le rallumer ensuite.
CREATE OR REPLACE FUNCTION public.participations_remind_follows_status()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.remind_deadline := (NEW.status = 'interesse');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS participations_remind_follows_status ON public.participations;
CREATE TRIGGER participations_remind_follows_status
  BEFORE UPDATE OF status ON public.participations
  FOR EACH ROW EXECUTE FUNCTION public.participations_remind_follows_status();
