-- POURQUOI — la V2 déployée le 23/10/2026 n'appelle plus compter_avis_et_questions : elle part
-- (ordre de .claude/rules/supabase.md : le front d'abord, la base ensuite). Et deux reprises
-- d'apercu_fiche relevées par la relecture finale, depuis sa définition live :
-- - les métiers se regroupent sans tenir compte des majuscules (« Forgeron » et « forgeron » ne
--   font qu'un, au lieu de pousser un vrai métier hors des trois) ;
-- - l'extrait se départage aussi par id : deux avis de même longueur et de même date ne
--   s'échangent plus d'un appel à l'autre.
DROP FUNCTION public.compter_avis_et_questions(uuid);

CREATE OR REPLACE FUNCTION public.apercu_fiche(p_event uuid)
RETURNS TABLE (
  avis integer,
  note numeric,
  extrait text,
  extrait_annee integer,
  questions integer,
  exposants integer,
  metiers jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH fiche AS (
    SELECT id, start_date FROM public.events WHERE id = p_event AND is_private = false
  ),
  presents AS (
    SELECT p.actor_id FROM public.participations p JOIN fiche f ON f.id = p.event_id
    WHERE p.status IN ('inscrit', 'confirme') AND p.visibility = 'public'
  ),
  extrait AS (
    SELECT r.comment FROM public.reviews r JOIN fiche f ON f.id = r.event_id
    WHERE btrim(coalesce(r.comment, '')) <> ''
    ORDER BY length(r.comment) DESC, r.created_at DESC, r.id
    LIMIT 1
  ),
  metiers AS (
    SELECT min(btrim(e.craft_type)) AS metier, count(*)::integer AS n
    FROM presents pr JOIN public.entities e ON e.actor_id = pr.actor_id
    WHERE btrim(coalesce(e.craft_type, '')) <> ''
    GROUP BY lower(btrim(e.craft_type))
    ORDER BY n DESC, metier ASC
    LIMIT 3
  )
  SELECT
    coalesce((SELECT s.review_count FROM public.event_scores s JOIN fiche f ON f.id = s.event_id), 0)::integer,
    (SELECT s.avg_overall FROM public.event_scores s JOIN fiche f ON f.id = s.event_id),
    (SELECT comment FROM extrait),
    (SELECT extract(year FROM f.start_date)::integer FROM fiche f WHERE EXISTS (SELECT 1 FROM extrait)),
    (SELECT count(*) FROM public.event_threads t JOIN fiche f ON f.id = t.event_id
      WHERE t.audience = 'exposant')::integer,
    (SELECT count(*) FROM presents)::integer,
    coalesce((SELECT jsonb_agg(jsonb_build_object('metier', metier, 'n', n) ORDER BY n DESC, metier ASC) FROM metiers), '[]'::jsonb);
$$;

REVOKE ALL ON FUNCTION public.apercu_fiche(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apercu_fiche(uuid) TO anon, authenticated;
