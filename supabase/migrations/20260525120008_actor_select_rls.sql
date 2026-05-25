-- 20260525120008_actor_select_rls.sql
-- Lecture sociale sur les ACTEURS : un compagnon (follow mutuel) doit voir les actions d'une
-- entité, pas seulement d'une personne. Les anciennes policies filtraient sur are_friends(uid, user_id),
-- or user_id est NULL pour une ligne d'entité. On bascule sur actor_id. can_act_as(actor_id) couvre
-- aussi les lignes legacy (personne : actor_id = auth.uid()).

DROP POLICY IF EXISTS participations_select ON participations;
CREATE POLICY participations_select ON participations FOR SELECT USING (
  can_act_as(actor_id)
  OR status = 'inscrit'
  OR (status = ANY (ARRAY['interesse','en_cours']::participation_status[]) AND are_friends(auth.uid(), actor_id))
  OR visibility = 'public'
  OR (visibility = 'amis' AND are_friends(auth.uid(), actor_id))
);

DROP POLICY IF EXISTS notes_select ON notes;
CREATE POLICY notes_select ON notes FOR SELECT USING (
  can_act_as(actor_id)
  OR (visibility = 'amis' AND (are_friends(auth.uid(), actor_id) OR are_friends_of_friends(auth.uid(), actor_id)))
);
