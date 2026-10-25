-- POURQUOI — la fiche vue sans compte montre les visages de ceux qui y vont (maquette 2506:233,
-- 25/10/2026) : jusqu'à six avatars, pris comme le reste parmi les inscrits en public seulement
-- (.claude/rules/supabase.md : une SECURITY DEFINER qui lit participations filtre visibility).
-- Le type de retour change : DROP puis CREATE, définition live reprise entière. La colonne metiers
-- reste tant que le front d'avant la lit (docs/v2/purge-back.md).

DROP FUNCTION public.apercu_fiche(uuid);

CREATE FUNCTION public.apercu_fiche(p_event uuid)
 RETURNS TABLE(avis integer, note numeric, extrait text, extrait_annee integer, questions integer, exposants integer, metiers jsonb, visages text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH fiche AS (
    SELECT id, start_date FROM public.events WHERE id = p_event AND is_private = false
  ),
  presents AS (
    SELECT p.actor_id, p.created_at FROM public.participations p JOIN fiche f ON f.id = p.event_id
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
  ),
  visages AS (
    SELECT a.avatar_url, pr.created_at, pr.actor_id FROM presents pr JOIN public.actor_public a ON a.actor_id = pr.actor_id
    WHERE btrim(coalesce(a.avatar_url, '')) <> ''
    ORDER BY pr.created_at, pr.actor_id
    LIMIT 6
  )
  SELECT
    coalesce((SELECT s.review_count FROM public.event_scores s JOIN fiche f ON f.id = s.event_id), 0)::integer,
    (SELECT s.avg_overall FROM public.event_scores s JOIN fiche f ON f.id = s.event_id),
    (SELECT comment FROM extrait),
    (SELECT extract(year FROM f.start_date)::integer FROM fiche f WHERE EXISTS (SELECT 1 FROM extrait)),
    (SELECT count(*) FROM public.event_threads t JOIN fiche f ON f.id = t.event_id
      WHERE t.audience = 'exposant')::integer,
    (SELECT count(*) FROM presents)::integer,
    coalesce((SELECT jsonb_agg(jsonb_build_object('metier', metier, 'n', n) ORDER BY n DESC, metier ASC) FROM metiers), '[]'::jsonb),
    coalesce((SELECT array_agg(avatar_url ORDER BY created_at, actor_id) FROM visages), '{}'::text[]);
$function$;

REVOKE ALL ON FUNCTION public.apercu_fiche(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.apercu_fiche(uuid) TO anon, authenticated, service_role;
