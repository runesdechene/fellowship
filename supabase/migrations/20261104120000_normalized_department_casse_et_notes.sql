-- POURQUOI — relecture du 04/11/2026 :
-- 1. normalized_department (20261104100000) rendait en capitales tout ce qui n'est pas un code :
--    « Drôme » saisi à la main devenait « DRÔME », et le trigger l'applique à chaque écriture.
--    Seul un code se met en capitales (« 2a » → « 2A ») ; le reste garde sa casse, espaces retirés.
--    Aucune ligne n'avait encore été touchée (vérifié en prod avant cette migration).
-- 2. event_public_stats recalculait la note depuis `reviews` : elle lit désormais `event_scores`,
--    la source canonique de la note d'une fête (même arrondi, même moyenne des trois critères).

CREATE OR REPLACE FUNCTION normalized_department(raw text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN u ~ '\(([0-9AB]{2,3})\)' THEN substring(u FROM '\(([0-9AB]{2,3})\)')
    WHEN u ~ '^\d{5}$' THEN
      CASE
        WHEN u LIKE '97%' THEN left(u, 3)
        WHEN u LIKE '20%' THEN CASE WHEN u < '20200' THEN '2A' ELSE '2B' END
        ELSE left(u, 2)
      END
    WHEN u ~ '^(\d{2,3}|2A|2B)$' THEN u
    ELSE b
  END
  FROM (SELECT btrim(raw) AS b, upper(btrim(raw)) AS u) s
$$;

CREATE OR REPLACE FUNCTION event_public_stats()
RETURNS TABLE (event_id uuid, interested int, registered int, rating numeric, rating_count int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id,
    (SELECT count(*) FROM participations p
      WHERE p.event_id = e.id AND p.visibility = 'public' AND p.status = 'interesse')::int,
    (SELECT count(*) FROM participations p
      WHERE p.event_id = e.id AND p.visibility = 'public'
        AND p.status IN ('inscrit', 'confirme', 'en_cours'))::int,
    s.avg_overall,
    coalesce(s.review_count, 0)::int
  FROM events e
  LEFT JOIN event_scores s ON s.event_id = e.id
  WHERE NOT e.is_private
  ORDER BY e.id
$$;
