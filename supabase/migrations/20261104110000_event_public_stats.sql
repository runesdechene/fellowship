-- POURQUOI — la sélection Fellowship classe les fêtes par l'intérêt des exposants et leurs avis,
-- mais un visiteur sans compte ne lit ni `participations` (ses lignes privées et « amis ») ni
-- `reviews` (chacun ne lit que les siens). Cette fonction ne rend que des totaux par fête, jamais
-- une identité ni un texte. Elle ne compte que les participations publiques (.claude/rules/
-- supabase.md : une fonction SECURITY DEFINER ne révèle jamais qui va quelque part en privé).
-- Spec : docs/superpowers/specs/2026-11-03-pages-pour-les-ia-design.md.

CREATE FUNCTION event_public_stats()
RETURNS TABLE (event_id uuid, interested int, registered int, rating numeric, rating_count int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id,
    (SELECT count(*) FROM participations p
      WHERE p.event_id = e.id AND p.visibility = 'public' AND p.status = 'interesse')::int,
    (SELECT count(*) FROM participations p
      WHERE p.event_id = e.id AND p.visibility = 'public'
        AND p.status IN ('inscrit', 'confirme', 'en_cours'))::int,
    (SELECT round(avg((r.affluence + r.organisation + r.rentabilite) / 3.0), 1)
      FROM reviews r WHERE r.event_id = e.id),
    (SELECT count(*) FROM reviews r WHERE r.event_id = e.id)::int
  FROM events e
  WHERE NOT e.is_private
  ORDER BY e.id
$$;

REVOKE ALL ON FUNCTION event_public_stats() FROM public;
GRANT EXECUTE ON FUNCTION event_public_stats() TO anon, authenticated;
