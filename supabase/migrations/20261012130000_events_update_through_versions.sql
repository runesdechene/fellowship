-- POURQUOI — lot 10c : toute modification d'une fiche passe par modifier_evenement, qui garde sa
-- version (« L'histoire de la fiche »). La mise à jour directe d'events est fermée, sinon une
-- modification échapperait à l'histoire. Appliquée le jour où la V2 devient la version de tous :
-- l'édition en place de la V1 cesse de marcher, c'est assumé (Uriel, 12/10/2026).
DROP POLICY events_update_exposant ON public.events;
DROP POLICY events_write_actor ON public.events;
CREATE POLICY events_insert_actor ON public.events FOR INSERT TO authenticated
  WITH CHECK (can_act_as(created_by_actor));
CREATE POLICY events_delete_actor ON public.events FOR DELETE TO authenticated
  USING (can_act_as(created_by_actor));
