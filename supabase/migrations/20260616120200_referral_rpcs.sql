-- Parrainage v1 — RPC. Toutes en SECURITY DEFINER, bornées par can_act_as() sur l'entité
-- appelante, search_path verrouillé. Le client passe une base déjà normalisée (accents retirés
-- côté TS) ; la RPC re-sécurise (regex) et gère collision + insertion atomique.

-- 1) Récupère (ou crée) le code de parrainage de l'entité. Idempotent.
CREATE OR REPLACE FUNCTION public.ensure_referral_code(p_entity_id uuid, p_base_code text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_existing  text;
  v_base      text;
  v_candidate text;
  v_n         int := 1;
BEGIN
  IF NOT can_act_as(p_entity_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT code INTO v_existing FROM referral_codes WHERE owner_entity_id = p_entity_id;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- Re-sécurise la base (MAJ alphanumérique). Fallback si trop courte.
  v_base := regexp_replace(upper(coalesce(p_base_code, '')), '[^A-Z0-9]', '', 'g');
  IF length(v_base) < 3 THEN
    v_base := 'FLWSH';
  END IF;
  v_base := left(v_base, 20);

  -- Boucle de collision : RUNEDECHENE, RUNEDECHENE2, RUNEDECHENE3…
  v_candidate := v_base;
  LOOP
    BEGIN
      INSERT INTO referral_codes (code, owner_entity_id) VALUES (v_candidate, p_entity_id);
      RETURN v_candidate;
    EXCEPTION
      WHEN unique_violation THEN
        -- soit le code est pris (collision), soit l'entité a reçu un code en concurrence.
        SELECT code INTO v_existing FROM referral_codes WHERE owner_entity_id = p_entity_id;
        IF v_existing IS NOT NULL THEN
          RETURN v_existing;
        END IF;
        v_n := v_n + 1;
        v_candidate := v_base || v_n::text;
    END;
  END LOOP;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_referral_code(uuid, text) TO authenticated;

-- 2) Stats de parrainage de l'entité (pour la page Abonnement).
CREATE OR REPLACE FUNCTION public.get_referral_overview(p_entity_id uuid)
RETURNS TABLE(code text, rewarded_count int, pending_count int, is_ambassador boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT can_act_as(p_entity_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  RETURN QUERY
  SELECT
    (SELECT rc.code FROM referral_codes rc WHERE rc.owner_entity_id = p_entity_id),
    (SELECT count(*)::int FROM referrals r WHERE r.parrain_entity_id = p_entity_id AND r.status = 'rewarded'),
    (SELECT count(*)::int FROM referrals r WHERE r.parrain_entity_id = p_entity_id AND r.status = 'attributed'),
    (SELECT e.is_ambassador FROM entities e WHERE e.actor_id = p_entity_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_referral_overview(uuid) TO authenticated;

-- 3) Attribution : rattache le filleul à son parrain. Retourne un code de résultat.
CREATE OR REPLACE FUNCTION public.attribute_referral(p_code text, p_filleul_entity_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_owner  uuid;
  v_norm   text;
  v_status text;
BEGIN
  IF NOT can_act_as(p_filleul_entity_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  v_norm := regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g');
  SELECT owner_entity_id INTO v_owner FROM referral_codes WHERE code = v_norm;
  IF v_owner IS NULL THEN
    RETURN 'invalid_code';
  END IF;
  IF v_owner = p_filleul_entity_id THEN
    RETURN 'self_referral';
  END IF;
  IF EXISTS (SELECT 1 FROM referrals WHERE filleul_entity_id = p_filleul_entity_id) THEN
    RETURN 'already_attributed';
  END IF;
  -- Filleul déjà abonné (à un moment) → pas éligible au cadeau filleul.
  SELECT subscription_status INTO v_status FROM entities WHERE actor_id = p_filleul_entity_id;
  IF v_status IS NOT NULL AND v_status IN ('active', 'trialing', 'past_due') THEN
    RETURN 'not_eligible';
  END IF;

  INSERT INTO referrals (parrain_entity_id, filleul_entity_id, status)
    VALUES (v_owner, p_filleul_entity_id, 'attributed');
  RETURN 'ok';
EXCEPTION
  WHEN unique_violation THEN
    -- course : un autre appel a inséré le même filleul entre-temps.
    RETURN 'already_attributed';
END;
$$;
GRANT EXECUTE ON FUNCTION public.attribute_referral(text, uuid) TO authenticated;
