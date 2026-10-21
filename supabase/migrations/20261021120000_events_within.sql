-- POURQUOI : l'Explorer cherche « à N km autour d'une ville » (Uriel, 21/10/2026). Les filtres de
-- PostgREST ne savent pas calculer une distance : cette fonction rend les fiches du cercle, et la
-- requête de l'app y enchaîne ses filtres habituels (fenêtre, catégories, mots, tri, compte).
-- SECURITY INVOKER (par défaut) : la RLS de `events` s'applique comme sur la table.
CREATE FUNCTION public.events_within(p_lat float8, p_lng float8, p_km float8)
RETURNS SETOF public.events LANGUAGE sql STABLE AS $$
  SELECT e.* FROM public.events e
  WHERE e.latitude IS NOT NULL AND e.longitude IS NOT NULL
    AND public.km_between(p_lat, p_lng, e.latitude, e.longitude) <= p_km
$$;

GRANT EXECUTE ON FUNCTION public.events_within(float8, float8, float8) TO anon, authenticated;
