-- POURQUOI — lot 13 (Uriel, 12/10/2026) : la fiche dit « à 142 km de ton atelier ». Le siège ou
-- l'atelier d'une enseigne sert au calcul des distances et n'est JAMAIS affiché : il vit à part
-- d'`entities`, que tout le monde lit pour les vitrines, et seuls les membres de l'enseigne le lisent.
CREATE TABLE public.entity_bases (
  entity_id uuid PRIMARY KEY REFERENCES public.entities(actor_id) ON DELETE CASCADE,
  address text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.entity_bases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.entity_bases FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entity_bases TO authenticated;
CREATE POLICY entity_bases_members ON public.entity_bases FOR ALL TO authenticated
  USING (can_act_as(entity_id)) WITH CHECK (can_act_as(entity_id));
