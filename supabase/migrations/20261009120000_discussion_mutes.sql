-- POURQUOI : retour client du 08/10/2026 — pouvoir couper les notifications des nouvelles
-- questions d'un festival (« mute la conv »). Une ligne = la discussion de ce festival est en
-- sourdine pour cet acteur. Lot 8a de la V2.
CREATE TABLE public.discussion_mutes (
  actor_id   uuid NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, event_id)
);
ALTER TABLE public.discussion_mutes ENABLE ROW LEVEL SECURITY;
CREATE POLICY discussion_mutes_owner ON public.discussion_mutes
  FOR ALL TO authenticated
  USING (can_act_as(actor_id))
  WITH CHECK (can_act_as(actor_id));
