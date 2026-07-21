-- Discussion du festival — onglet Questions. Q&R multi-publics sur l'event de
-- l'année en cours. Modèle acteur, RLS calquée sur review_replies (can_act_as).
-- audience = canal du thread, dérivé du type de l'acteur qui poste.

CREATE TYPE public.thread_audience AS ENUM ('festivalier', 'exposant', 'organisateur');

-- La QUESTION
CREATE TABLE public.event_threads (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         uuid NOT NULL REFERENCES public.events(id)  ON DELETE CASCADE,
  actor_id         uuid NOT NULL REFERENCES public.actors(id)  ON DELETE CASCADE,
  acted_by_user_id uuid REFERENCES public.users(actor_id)      ON DELETE SET NULL,
  audience         public.thread_audience NOT NULL,
  title            text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 140),
  body             text CHECK (body IS NULL OR char_length(body) <= 2000),
  best_reply_id    uuid,   -- FK ajoutée après event_thread_replies (cycle)
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_event_threads_event ON public.event_threads(event_id, created_at DESC);

-- La RÉPONSE (fil plat)
CREATE TABLE public.event_thread_replies (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id        uuid NOT NULL REFERENCES public.event_threads(id) ON DELETE CASCADE,
  actor_id         uuid NOT NULL REFERENCES public.actors(id)        ON DELETE CASCADE,
  acted_by_user_id uuid REFERENCES public.users(actor_id)            ON DELETE SET NULL,
  body             text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_event_thread_replies_thread ON public.event_thread_replies(thread_id, created_at);

-- Lien « meilleure réponse » (SET NULL si la réponse élue est supprimée)
ALTER TABLE public.event_threads
  ADD CONSTRAINT fk_best_reply
  FOREIGN KEY (best_reply_id) REFERENCES public.event_thread_replies(id) ON DELETE SET NULL;

-- Intégrité : la réponse élue doit appartenir AU MÊME thread.
CREATE OR REPLACE FUNCTION public.enforce_best_reply_thread()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.best_reply_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.event_thread_replies r
      WHERE r.id = NEW.best_reply_id AND r.thread_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'best_reply_id % does not belong to thread %', NEW.best_reply_id, NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enforce_best_reply ON public.event_threads;
CREATE TRIGGER trg_enforce_best_reply
  BEFORE INSERT OR UPDATE OF best_reply_id ON public.event_threads
  FOR EACH ROW EXECUTE FUNCTION public.enforce_best_reply_thread();

-- ---------- RLS ----------
ALTER TABLE public.event_threads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_thread_replies ENABLE ROW LEVEL SECURITY;

-- SELECT ouvert (cohérent avec reviews / review_replies).
CREATE POLICY event_threads_select ON public.event_threads
  FOR SELECT TO authenticated USING (true);
CREATE POLICY event_thread_replies_select ON public.event_thread_replies
  FOR SELECT TO authenticated USING (true);

-- INSERT thread : acteur contrôlé ET (audience concorde avec le type d'acteur).
CREATE POLICY event_threads_insert ON public.event_threads
  FOR INSERT TO authenticated
  WITH CHECK (
    can_act_as(actor_id) AND (
      (audience = 'festivalier'  AND EXISTS (SELECT 1 FROM public.users u    WHERE u.actor_id = event_threads.actor_id)) OR
      (audience = 'exposant'     AND EXISTS (SELECT 1 FROM public.entities e WHERE e.actor_id = event_threads.actor_id AND e.type = 'exposant')) OR
      (audience = 'organisateur' AND EXISTS (SELECT 1 FROM public.entities e WHERE e.actor_id = event_threads.actor_id AND e.type = 'festival'))
    )
  );

-- UPDATE thread : l'auteur (édition titre/corps + élection best_reply_id).
CREATE POLICY event_threads_update ON public.event_threads
  FOR UPDATE TO authenticated
  USING (can_act_as(actor_id)) WITH CHECK (can_act_as(actor_id));

-- DELETE thread : auteur OU admin.
CREATE POLICY event_threads_delete ON public.event_threads
  FOR DELETE TO authenticated
  USING (can_act_as(actor_id) OR public.is_admin());

-- INSERT réponse : acteur contrôlé (participation cross-canal autorisée, aucune contrainte d'audience).
CREATE POLICY event_thread_replies_insert ON public.event_thread_replies
  FOR INSERT TO authenticated
  WITH CHECK (can_act_as(actor_id));

-- UPDATE réponse : l'auteur.
CREATE POLICY event_thread_replies_update ON public.event_thread_replies
  FOR UPDATE TO authenticated
  USING (can_act_as(actor_id)) WITH CHECK (can_act_as(actor_id));

-- DELETE réponse : auteur OU admin.
CREATE POLICY event_thread_replies_delete ON public.event_thread_replies
  FOR DELETE TO authenticated
  USING (can_act_as(actor_id) OR public.is_admin());
