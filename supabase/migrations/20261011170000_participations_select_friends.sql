-- POURQUOI : règle de lecture des participations, héritée de la V1, trop large ET trop étroite
-- (vu au lot 9a, accord d'Uriel le 11/10/2026) :
--  · trop large : « inscrit et pas privé » se lisait par TOUT compte connecté — une date marquée
--    « amis » était donc visible d'un inconnu (2 mesurées) ;
--  · trop étroite : l'amitié se vérifiait avec la PERSONNE connectée seulement, pas avec ses
--    enseignes. Uriel agit en Runes de Chêne, amie de La pince creative : la fiche du HeroFestival
--    lui cachait sa date (2 amis affichés au lieu de 3).
-- La règle devient : la sienne (ou celle d'une de ses enseignes), une participation publique, ou
-- une participation « amis » d'un ami — de la personne OU d'une de ses enseignes.
-- `anon_read_public_participations` et `participations_write_actor` ne changent pas.

DROP POLICY participations_select ON public.participations;

CREATE POLICY participations_select ON public.participations FOR SELECT USING (
  can_act_as(actor_id)
  OR visibility = 'public'
  OR (
    visibility = 'amis'
    AND (
      are_friends(auth.uid(), actor_id)
      OR EXISTS (
        SELECT 1 FROM memberships m
        WHERE m.user_actor_id = auth.uid() AND are_friends(m.entity_actor_id, actor_id)
      )
    )
  )
);
