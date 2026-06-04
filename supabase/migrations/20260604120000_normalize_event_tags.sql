-- Normalise events.tags : certains events legacy (créés avant le système de slugs)
-- stockent des NOMS d'affichage ("Médiéval", "Marché"…) au lieu des slugs ("fete-medievale",
-- "marche"…). Ces tags échappent au filtre par catégorie de l'Explorer (qui compare des slugs).
--
-- On remplace chaque nom par son slug (jointure sur tags.name), on déduplique, et on PRÉSERVE
-- L'ORDRE (le 1er tag = catégorie principale). Idempotent : une 2e exécution ne change rien
-- (tous slugs valides → aucune correspondance par nom → tableau identique → pas d'update).
UPDATE events e
SET tags = sub.new_tags
FROM (
  SELECT e2.id,
    (SELECT array_agg(slug_val ORDER BY ord)
     FROM (
       SELECT min(ord) AS ord, mapped AS slug_val
       FROM (
         SELECT ord,
           coalesce((SELECT t.slug FROM tags t WHERE t.name = elem), elem) AS mapped
         FROM unnest(e2.tags) WITH ORDINALITY AS u(elem, ord)
       ) m
       GROUP BY mapped
     ) d
    ) AS new_tags
  FROM events e2
) sub
WHERE e.id = sub.id AND e.tags IS DISTINCT FROM sub.new_tags;
