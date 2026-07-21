-- VERROU FINAL — avis à identité protégée.
-- Couper la lecture directe qui laissait fuiter reviews.actor_id d'autrui côté client.
-- La lecture publique nommée passe désormais UNIQUEMENT par les RPC SECURITY DEFINER
-- (get_event_reviews / get_review_replies / get_network_reviews), qui gatent l'identité.
--
-- Sûr car :
--  - event_scores (vue non security_invoker, propriété postgres) contourne la RLS -> notes
--    moyennes publiques inchangées ;
--  - useMyReview / deleteReview lisent/suppriment SES PROPRES lignes (can_act_as) -> OK ;
--  - le fil Communauté est passé sur get_network_reviews (migration 170000) ;
--  - les RPC (SECURITY DEFINER, propriété postgres) contournent la RLS -> lecture complète.

DROP POLICY IF EXISTS reviews_select_scores ON public.reviews;

-- Lecture directe restreinte à SON PROPRE avis (préremplissage/édition du formulaire).
CREATE POLICY reviews_select_own ON public.reviews
  FOR SELECT TO authenticated
  USING (can_act_as(actor_id));
