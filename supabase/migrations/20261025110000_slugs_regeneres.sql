-- POURQUOI — les fiches passent à l'adresse lisible « nom-année » (20261025100000 a posé la règle,
-- l'historique et slug_actuel). Cette migration régénère les slugs existants : elle part avec le
-- déploiement du front qui résout les anciens slugs par slug_actuel, pas avant — le front d'avant
-- lit events.slug en direct, et les liens /e/<ancien-slug> casseraient en attendant.

-- Régénération : les slugs actuels partent dans l'historique, puis chaque fiche reçoit le sien,
-- de la plus ancienne à la plus récente. Changer le seul slug ne notifie personne
-- (notify_event_updated l'ignore) et ne relance pas le trigger (UPDATE OF start_date).
INSERT INTO event_slug_history (slug, event_id)
  SELECT slug, id FROM events WHERE slug IS NOT NULL;
UPDATE events SET slug = NULL;
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, name, city, start_date FROM events ORDER BY created_at, id LOOP
    UPDATE events SET slug = events_free_slug(r.id, r.name, r.city, extract(year FROM r.start_date)::int)
      WHERE id = r.id;
  END LOOP;
END $$;
ALTER TABLE events ALTER COLUMN slug SET NOT NULL;

