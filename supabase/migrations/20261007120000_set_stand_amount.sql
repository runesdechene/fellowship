-- POURQUOI : enregistrer le prix de la place (ou le cachet) d'une date faisait 4 allers-retours
-- depuis la V2 — garantir le bilan, chercher la ligne « stepper », l'écrire, relire — sans
-- transaction. Une coupure au milieu laissait un état à moitié écrit (audit V2 du 07/10/2026,
-- point 4). Cette fonction fait tout en une transaction.
--
-- Le sens de la ligne suit l'orientation ENREGISTRÉE de la participation, lue ici plutôt que
-- passée par l'écran : payé pour venir → entrée « cachet », payeur → sortie « emplacement »
-- (même règle que standLine dans apps/web-v2/src/lib/money.ts).
--
-- SECURITY INVOKER : les policies *_write_actor (can_act_as) s'appliquent comme pour une
-- écriture directe. Le contrôle explicite ne sert qu'à rendre une erreur claire.

CREATE FUNCTION public.set_stand_amount(p_actor_id uuid, p_event_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_report_id   uuid;
  v_orientation text;
BEGIN
  IF NOT can_act_as(p_actor_id) THEN
    RAISE EXCEPTION 'set_stand_amount: accès refusé' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'set_stand_amount: montant invalide' USING ERRCODE = '22023';
  END IF;

  -- Zéro n'est pas un montant : c'est l'absence de ligne.
  IF p_amount = 0 THEN
    DELETE FROM event_ledger_entries
    WHERE actor_id = p_actor_id AND event_id = p_event_id AND source = 'stepper';
    RETURN;
  END IF;

  -- Le registre référence un bilan, même si l'exposant n'a pas encore ouvert de formulaire.
  INSERT INTO event_reports (actor_id, event_id)
  VALUES (p_actor_id, p_event_id)
  ON CONFLICT (actor_id, event_id) DO NOTHING;

  SELECT id INTO v_report_id
  FROM event_reports
  WHERE actor_id = p_actor_id AND event_id = p_event_id;

  SELECT payment_orientation INTO v_orientation
  FROM participations
  WHERE actor_id = p_actor_id AND event_id = p_event_id;

  INSERT INTO event_ledger_entries (report_id, actor_id, event_id, amount, direction, category, source)
  VALUES (
    v_report_id, p_actor_id, p_event_id, p_amount,
    CASE WHEN v_orientation = 'paye' THEN 'in' ELSE 'out' END,
    CASE WHEN v_orientation = 'paye' THEN 'cachet' ELSE 'emplacement' END,
    'stepper'
  )
  ON CONFLICT (report_id) WHERE source = 'stepper'
  DO UPDATE SET amount = EXCLUDED.amount, direction = EXCLUDED.direction, category = EXCLUDED.category;
END;
$$;

REVOKE ALL ON FUNCTION public.set_stand_amount(uuid, uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_stand_amount(uuid, uuid, numeric) TO authenticated;
