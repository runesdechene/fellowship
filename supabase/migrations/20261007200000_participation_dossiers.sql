-- POURQUOI : la fiche « 2027 » a un bloc « Mon dossier — visible par toi seul » (acompte versé,
-- échéance du solde, ce que j'ai envoyé) et un « objectif de chiffre d'affaires » par date
-- (maquette validée le 07/10/2026, docs/v2/maquettes-2027.md). Aucune colonne ne les porte :
-- `participations.payments` et `total_cost` sont vides partout.
--
-- Une TABLE À PART plutôt que des colonnes sur `participations` : la policy
-- `participations_select` laisse d'autres comptes lire une participation « inscrit » non privée,
-- toutes colonnes comprises. Un acompte ou un objectif posé là deviendrait public. Ici, seul
-- celui qui agit pour l'acteur lit et écrit (can_act_as), comme pour ses bilans.
--
-- Purement additif : une table neuve, que le code déployé (V1 et V2) ne lit pas.

CREATE TABLE public.participation_dossiers (
  actor_id            uuid NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  event_id            uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  revenue_goal        numeric CHECK (revenue_goal IS NULL OR revenue_goal >= 0),
  deposit_amount      numeric CHECK (deposit_amount IS NULL OR deposit_amount >= 0),
  balance_due_on      date,
  application_sent_on date,
  application_note    text CHECK (application_note IS NULL OR char_length(application_note) <= 500),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, event_id)
);

COMMENT ON TABLE public.participation_dossiers IS
  'Le dossier privé d''un exposant sur une date : objectif de CA, acompte, échéance du solde, ce qu''il a envoyé. Lu et écrit par lui seul.';

ALTER TABLE public.participation_dossiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY participation_dossiers_own ON public.participation_dossiers
  FOR ALL TO authenticated
  USING (can_act_as(actor_id))
  WITH CHECK (can_act_as(actor_id));
