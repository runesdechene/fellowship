-- POURQUOI — lot 11b (spec docs/superpowers/specs/2026-10-15-v2-annuaire-public-11b-design.md) :
-- sur la fiche vue sans compte, un aperçu flouté annonce « 4 avis · 7 questions » pour donner
-- envie de créer un compte. Les avis (reviews) et les fils (event_threads) restent fermés à anon :
-- cette fonction ne rend QUE deux nombres, et seulement pour une fiche publique. Jamais un
-- contenu, jamais un auteur. Une fiche privée ou inconnue rend 0, 0.
-- Les avis : tous, comme get_event_reviews (aucun filtre en live le 15/10/2026). Les questions :
-- celles du canal « exposant » seulement — la landing parle aux exposants, et un compte exposant
-- ne lit que ce canal (lib/threads.ts, visibleChannels) : l'aperçu n'annonce jamais plus que ce
-- qu'il lira.
CREATE FUNCTION public.compter_avis_et_questions(p_event uuid)
RETURNS TABLE (avis integer, questions integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH fiche AS (
    SELECT id FROM public.events WHERE id = p_event AND is_private = false
  )
  SELECT
    (SELECT count(*) FROM public.reviews r JOIN fiche f ON f.id = r.event_id)::integer,
    (SELECT count(*) FROM public.event_threads t JOIN fiche f ON f.id = t.event_id
      WHERE t.audience = 'exposant')::integer;
$$;

REVOKE ALL ON FUNCTION public.compter_avis_et_questions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compter_avis_et_questions(uuid) TO anon, authenticated;
