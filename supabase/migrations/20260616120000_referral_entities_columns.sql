-- Parrainage v1 — colonnes de récompense sur entities + extension du trigger de protection.
-- comped_pro_until : Pro offert hors Stripe (récompense d'un parrain au plan gratuit).
-- is_ambassador    : badge public permanent, posé au 1er filleul payant.
-- Les DEUX sont écrites UNIQUEMENT par la service-role (webhook). On étend protect_entity_plan
-- pour qu'un utilisateur authentifié ne puisse jamais se les auto-attribuer (même faille que plan).

ALTER TABLE public.entities
  ADD COLUMN comped_pro_until timestamptz,
  ADD COLUMN is_ambassador boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.entities.comped_pro_until IS
  'Pro offert hors Stripe (récompense parrain gratuit). Gating : plan=''pro'' OU comped_pro_until > now(). Écrit par service-role uniquement.';
COMMENT ON COLUMN public.entities.is_ambassador IS
  'Badge « Ambassadeur Fellowship » : true dès le 1er filleul payant (permanent). Écrit par service-role uniquement.';

-- Étend le garde-fou existant (cf. 20260528230000) : plan + comped_pro_until + is_ambassador
-- sont réinitialisés à OLD si l'appel vient d'un utilisateur authentifié (auth.uid() NOT NULL).
-- La service-role (webhook) a auth.uid() = NULL → seule voie autorisée à écrire ces colonnes.
CREATE OR REPLACE FUNCTION public.protect_entity_plan() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
  AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.plan IS DISTINCT FROM OLD.plan THEN
      NEW.plan := OLD.plan;
    END IF;
    IF NEW.comped_pro_until IS DISTINCT FROM OLD.comped_pro_until THEN
      NEW.comped_pro_until := OLD.comped_pro_until;
    END IF;
    IF NEW.is_ambassador IS DISTINCT FROM OLD.is_ambassador THEN
      NEW.is_ambassador := OLD.is_ambassador;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
