-- Sécurité post /security-review (2026-05-28).
--
-- Vuln 1 (HIGH) : la policy `entities_update_member` permettait à n'importe quel
-- membre d'une entité de UPDATE toute colonne, dont `plan`. Un utilisateur
-- pouvait donc s'auto-promouvoir en Pro depuis la console navigateur :
--   supabase.from('entities').update({ plan: 'pro' }).eq('actor_id', '...')
-- → bypass complet du paywall avant même que Stripe arrive.
-- Fix : trigger BEFORE UPDATE qui réinitialise `plan` à OLD.plan si l'appel
-- vient d'un utilisateur authentifié (auth.uid() IS NOT NULL).
-- service_role (webhook Stripe / admin SQL direct) reste seul habilité à
-- modifier `plan`. Pattern miroir de `protect_entity_verified`.

CREATE OR REPLACE FUNCTION public.protect_entity_plan() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
  AS $$
BEGIN
  IF NEW.plan IS DISTINCT FROM OLD.plan AND auth.uid() IS NOT NULL THEN
    NEW.plan := OLD.plan;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_entity_plan ON public.entities;
CREATE TRIGGER trg_protect_entity_plan
  BEFORE UPDATE ON public.entities
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_entity_plan();

-- Vuln 2 (MEDIUM) : la policy INSERT sur `content_reports` validait
-- `reporter_auth_id = auth.uid()` mais ne contrôlait pas `reporter_actor_id`.
-- Un utilisateur pouvait donc poster un signalement en se faisant passer pour
-- n'importe quel acteur (avatar + label affichés à l'admin = identité usurpée).
-- Fix : ajout du check `can_act_as(reporter_actor_id)`.

DROP POLICY IF EXISTS content_reports_insert_authenticated ON public.content_reports;
CREATE POLICY content_reports_insert_authenticated
  ON public.content_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_auth_id = auth.uid()
    AND public.can_act_as(reporter_actor_id)
  );
