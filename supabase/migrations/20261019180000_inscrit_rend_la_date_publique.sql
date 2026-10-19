-- POURQUOI : la V1 passait une participation en « publique » dès son statut « inscrit » (aucun
-- réglage de visibilité ne s'offrait à l'exposant) ; la V2 ne l'a pas repris, et toute date
-- inscrite depuis la V2 restait « amis » — absente du calendrier intégré et de la vitrine publique
-- (HeroFestival de Runes de Chêne, constaté le 19/10/2026). Règle d'Uriel : dès qu'on est inscrit
-- (ou confirmé), on apparaît publiquement ; seules les fiches privées (events.is_private) restent
-- cachées. La règle vit ici pour valoir quel que soit l'écran qui écrit le statut.
CREATE OR REPLACE FUNCTION public.participations_inscrit_public()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('inscrit', 'confirme') THEN
    NEW.visibility := 'public';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS participations_inscrit_public ON public.participations;
CREATE TRIGGER participations_inscrit_public
  BEFORE INSERT OR UPDATE OF status, visibility ON public.participations
  FOR EACH ROW EXECUTE FUNCTION public.participations_inscrit_public();

-- Rattrapage : les dates inscrites restées « amis » (3 au 19/10/2026).
UPDATE public.participations
SET visibility = 'public'
WHERE status IN ('inscrit', 'confirme') AND visibility <> 'public';
