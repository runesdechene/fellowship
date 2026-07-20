-- Fil de réponses (plat) sous un avis de festival. Modèle acteur : l'auteur d'une
-- réponse est un exposant (entité). RLS calquée sur reviews_write_actor (can_act_as).
CREATE TABLE public.review_replies (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id        uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  actor_id         uuid NOT NULL REFERENCES public.actors(id)  ON DELETE CASCADE,
  acted_by_user_id uuid REFERENCES public.users(actor_id)      ON DELETE SET NULL,
  body             text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_review_replies_review ON public.review_replies(review_id, created_at);

ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;

-- SELECT : tout authentifié (cohérent avec reviews_select_scores USING (true)).
CREATE POLICY review_replies_select ON public.review_replies
  FOR SELECT TO authenticated USING (true);

-- INSERT : l'acteur est contrôlé par l'utilisateur ET c'est une ENTITÉ (exposant).
CREATE POLICY review_replies_insert ON public.review_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    can_act_as(actor_id)
    AND EXISTS (SELECT 1 FROM public.entities e WHERE e.actor_id = review_replies.actor_id)
  );

-- UPDATE : édition de sa propre réponse.
CREATE POLICY review_replies_update ON public.review_replies
  FOR UPDATE TO authenticated
  USING (can_act_as(actor_id)) WITH CHECK (can_act_as(actor_id));

-- DELETE : sa propre réponse OU admin (modération).
CREATE POLICY review_replies_delete ON public.review_replies
  FOR DELETE TO authenticated
  USING (can_act_as(actor_id) OR public.is_admin());
