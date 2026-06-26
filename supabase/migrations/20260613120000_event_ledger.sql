-- Registre financier par bilan : lignes dans les deux sens (in/out).
-- Table fille d'event_reports. Privée à l'acteur (aucun accès admin, comme event_reports).

CREATE TABLE IF NOT EXISTS public.event_ledger_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   uuid NOT NULL REFERENCES public.event_reports(id) ON DELETE CASCADE,
  actor_id    uuid NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  label       text,
  amount      numeric NOT NULL CHECK (amount >= 0),
  direction   text NOT NULL CHECK (direction IN ('in','out')),
  category    text NOT NULL CHECK (category IN
                ('emplacement','cachet','essence','peage','hebergement','repas','remboursement','ventes','autre')),
  source      text NOT NULL DEFAULT 'manual' CHECK (source IN ('stepper','manual')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Une seule ligne issue du stepper par bilan (capture idempotente du prix de la place/cachet).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ledger_stepper_per_report
  ON public.event_ledger_entries (report_id) WHERE source = 'stepper';

CREATE INDEX IF NOT EXISTS idx_ledger_event_actor
  ON public.event_ledger_entries (actor_id, event_id);

ALTER TABLE public.event_ledger_entries ENABLE ROW LEVEL SECURITY;

-- Owner-only via can_act_as (modèle acteur, calqué sur event_reports_write_actor).
CREATE POLICY event_ledger_write_actor ON public.event_ledger_entries
  FOR ALL TO authenticated
  USING (can_act_as(actor_id))
  WITH CHECK (can_act_as(actor_id));

-- Orientation du festival : l'exposant paie sa place, ou on le paie pour venir.
ALTER TABLE public.participations
  ADD COLUMN IF NOT EXISTS payment_orientation text NOT NULL DEFAULT 'payeur'
  CHECK (payment_orientation IN ('payeur','paye'));

-- Migration des bilans existants : les 3 colonnes deviennent des lignes.
-- (Colonnes booth_cost/charges/revenue laissées dormantes — pas de DROP.)
INSERT INTO public.event_ledger_entries (report_id, actor_id, event_id, label, amount, direction, category, source)
SELECT er.id, er.actor_id, er.event_id, NULL, er.booth_cost, 'out', 'emplacement', 'manual'
FROM public.event_reports er WHERE er.booth_cost IS NOT NULL AND er.booth_cost > 0;

INSERT INTO public.event_ledger_entries (report_id, actor_id, event_id, label, amount, direction, category, source)
SELECT er.id, er.actor_id, er.event_id, 'Charges', er.charges, 'out', 'autre', 'manual'
FROM public.event_reports er WHERE er.charges IS NOT NULL AND er.charges > 0;

INSERT INTO public.event_ledger_entries (report_id, actor_id, event_id, label, amount, direction, category, source)
SELECT er.id, er.actor_id, er.event_id, NULL, er.revenue, 'in', 'ventes', 'manual'
FROM public.event_reports er WHERE er.revenue IS NOT NULL AND er.revenue > 0;
