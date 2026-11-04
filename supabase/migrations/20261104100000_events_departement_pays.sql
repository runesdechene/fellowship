-- POURQUOI — les pages lues par les IA rangent les fêtes par région, et la région se déduit du
-- département (`regions.ts`). Or la colonne était sale : codes postaux (« 04100 »), noms
-- (« Allier », « Drôme  »), « Creuse (23) », et des fiches suisses (« 1700 (CH) », « Fribourg »).
-- On ramène chaque fiche française à son code, on donne un pays à chaque fiche, et un trigger
-- garde la colonne propre pour la suite (le formulaire écrit déjà un code, mais pas la saisie à
-- la main). Spec : docs/superpowers/specs/2026-11-03-pages-pour-les-ia-design.md.

ALTER TABLE events ADD COLUMN country text NOT NULL DEFAULT 'FR';

-- Le code d'un département dans ce que la saisie produit : « 63 », « Puy-de-Dôme (63) », un code
-- postal (outre-mer sur trois chiffres, Corse 200-201 → 2A). Même règle que `departmentCode()`
-- de apps/web-v2/src/lib/regions.ts ; ce qui ne se lit pas est rendu tel quel, nettoyé.
-- (Pas `department_code`, qui existe déjà : deux chiffres ou rien, pour les suggestions.)
CREATE FUNCTION normalized_department(raw text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN t ~ '\(([0-9AB]{2,3})\)' THEN substring(t FROM '\(([0-9AB]{2,3})\)')
    WHEN t !~ '^\d{5}$' THEN t
    WHEN t LIKE '97%' THEN left(t, 3)
    WHEN t LIKE '20%' THEN CASE WHEN t < '20200' THEN '2A' ELSE '2B' END
    ELSE left(t, 2)
  END
  FROM (SELECT upper(btrim(raw)) AS t) s
$$;

-- Le nettoyage ne doit prévenir personne : notify_event_updated écrit une notification
-- « fiche modifiée » à chaque participant dès que le département change.
ALTER TABLE events DISABLE TRIGGER on_event_updated;

UPDATE events SET country = 'CH'
WHERE department IN ('1700 (CH)', 'Fribourg', 'Vaud');
UPDATE events SET department = 'Fribourg' WHERE department = '1700 (CH)';

-- Ville et département inversés à la saisie.
UPDATE events SET city = 'Chalmazel', department = '42' WHERE btrim(department) = 'chalmazel';

UPDATE events SET department = CASE btrim(department)
    WHEN 'Allier' THEN '03'
    WHEN 'Drôme' THEN '26'
    WHEN 'Gironde' THEN '33'
    WHEN 'Puy-de-Dôme' THEN '63'
  END
WHERE btrim(department) IN ('Allier', 'Drôme', 'Gironde', 'Puy-de-Dôme');

UPDATE events SET department = normalized_department(department)
WHERE country = 'FR' AND department IS DISTINCT FROM normalized_department(department);

ALTER TABLE events ENABLE TRIGGER on_event_updated;

CREATE FUNCTION events_normalize_department() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.country = 'FR' AND NEW.department IS NOT NULL THEN
    NEW.department := normalized_department(NEW.department);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_events_department
BEFORE INSERT OR UPDATE OF department, country ON events
FOR EACH ROW EXECUTE FUNCTION events_normalize_department();
