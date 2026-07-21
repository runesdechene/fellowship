-- Avis à identité protégée — partie 1 (additive, non cassante).
-- 1) opt-in "anonyme total" par avis. 2) écriture gatée sur une participation inscrit.

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS anonymous boolean NOT NULL DEFAULT false;

-- Remplacer la policy d'écriture "ALL" par des policies explicites avec gate participation.
-- (SELECT reste porté par reviews_select_scores USING(true) — verrouillé plus tard.)
DROP POLICY IF EXISTS reviews_write_actor ON public.reviews;

-- INSERT : acteur contrôlé ET présence acquise (inscrit) sur cet event.
CREATE POLICY reviews_insert_verified ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    can_act_as(actor_id)
    AND EXISTS (
      SELECT 1 FROM public.participations p
      WHERE p.actor_id = reviews.actor_id
        AND p.event_id = reviews.event_id
        AND p.status = 'inscrit'
    )
  );

-- UPDATE : idem (éditer son avis suppose toujours la participation).
CREATE POLICY reviews_update_verified ON public.reviews
  FOR UPDATE TO authenticated
  USING (can_act_as(actor_id))
  WITH CHECK (
    can_act_as(actor_id)
    AND EXISTS (
      SELECT 1 FROM public.participations p
      WHERE p.actor_id = reviews.actor_id
        AND p.event_id = reviews.event_id
        AND p.status = 'inscrit'
    )
  );

-- DELETE : son propre avis OU admin (modération).
CREATE POLICY reviews_delete_own ON public.reviews
  FOR DELETE TO authenticated
  USING (can_act_as(actor_id) OR public.is_admin());
