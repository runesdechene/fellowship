-- Étendre les cibles de signalement aux threads de discussion et à leurs réponses.
ALTER TABLE public.content_reports DROP CONSTRAINT IF EXISTS content_reports_target_type_check;
ALTER TABLE public.content_reports
  ADD CONSTRAINT content_reports_target_type_check
  CHECK (target_type IN ('event', 'profile', 'event_thread', 'event_thread_reply'));
