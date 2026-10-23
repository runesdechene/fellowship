-- POURQUOI — décision du 23/10/2026 (maquette 2482:878, après le Concile) : la fiche vue sans
-- compte montre en clair la note, le nombre d'avis, UN avis entier, le nombre d'exposants qui y
-- vont et leurs métiers. Les avis, les fils et les participations restent fermés à anon : cette
-- fonction ne rend que ces agrégats et un seul texte d'avis, jamais un auteur, et seulement pour
-- une fiche publique (une fiche privée ou inconnue rend des zéros).
-- L'extrait : le commentaire le plus long (le plus riche), départagé par le plus récent.
-- « Y vont » : inscrit ou confirmé, visibilité « public » seulement — SECURITY DEFINER passe outre
-- participations_select : « prive » et « amis » ne se révèlent jamais, même en nombre (.claude/rules/supabase.md).
-- Elle remplace compter_avis_et_questions, supprimée APRÈS le déploiement du front qui ne
-- l'appelle plus (le code déployé l'appelle encore : .claude/rules/supabase.md).
CREATE FUNCTION public.apercu_fiche(p_event uuid)
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
    ORDER BY length(r.comment) DESC, r.created_at DESC
    LIMIT 1
  ),
  metiers AS (
    SELECT btrim(e.craft_type) AS metier, count(*)::integer AS n
    FROM presents pr JOIN public.entities e ON e.actor_id = pr.actor_id
    WHERE btrim(coalesce(e.craft_type, '')) <> ''
    GROUP BY btrim(e.craft_type)
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
