-- 20260525120002_actions_actor_id.sql
-- Refonte des comptes — Fondation (Phase 1, Task 3)
-- Ajoute actor_id (au nom de qui) + acted_by_user_id (qui a fait l'action, audit) sur les
-- tables d'action, backfill, RLS additif via can_act_as. Colonnes legacy conservées (Plan 4 = drop).
--
-- Règle de backfill : si le propriétaire de l'action était un exposant, l'action part sur son
-- entité ; sinon elle reste sur la personne (dont l'actor_id = l'ancien user_id, valeur inchangée).

-- Table d'aide : pour chaque personne-exposant, son entité.
CREATE TEMP TABLE _expo_entity AS
  SELECT m.user_actor_id AS person_id, m.entity_actor_id AS entity_id
  FROM memberships m JOIN entities e ON e.actor_id = m.entity_actor_id AND e.type = 'exposant';

-- PARTICIPATIONS
ALTER TABLE participations ADD COLUMN actor_id UUID REFERENCES actors(id) ON DELETE CASCADE;
UPDATE participations p SET actor_id = COALESCE((SELECT entity_id FROM _expo_entity WHERE person_id = p.user_id), p.user_id);
-- NB (expand/contract) : actor_id reste NULLABLE en Phase 1. Les pages écrivent encore via user_id
-- (anciennes policies actives) ; le SET NOT NULL est posé au Plan 3 (contract), une fois tous les
-- writers recâblés sur actor_id. La contrainte UNIQUE tient déjà (Postgres autorise plusieurs NULL).
ALTER TABLE participations ADD CONSTRAINT uniq_participation_actor UNIQUE (actor_id, event_id);

-- REVIEWS
ALTER TABLE reviews ADD COLUMN actor_id UUID REFERENCES actors(id) ON DELETE CASCADE;
UPDATE reviews r SET actor_id = COALESCE((SELECT entity_id FROM _expo_entity WHERE person_id = r.user_id), r.user_id);

-- EVENT_REPORTS
ALTER TABLE event_reports ADD COLUMN actor_id UUID REFERENCES actors(id) ON DELETE CASCADE;
UPDATE event_reports er SET actor_id = COALESCE((SELECT entity_id FROM _expo_entity WHERE person_id = er.user_id), er.user_id);

-- NOTES
ALTER TABLE notes ADD COLUMN actor_id UUID REFERENCES actors(id) ON DELETE CASCADE;
UPDATE notes n SET actor_id = COALESCE((SELECT entity_id FROM _expo_entity WHERE person_id = n.user_id), n.user_id);

-- EVENTS (créateur)
ALTER TABLE events ADD COLUMN created_by_actor UUID REFERENCES actors(id) ON DELETE SET NULL;
UPDATE events e SET created_by_actor = COALESCE((SELECT entity_id FROM _expo_entity WHERE person_id = e.created_by), e.created_by);

-- NOTIFICATIONS (destinataire)
ALTER TABLE notifications ADD COLUMN actor_id UUID REFERENCES actors(id) ON DELETE CASCADE;
UPDATE notifications nt SET actor_id = COALESCE((SELECT entity_id FROM _expo_entity WHERE person_id = nt.user_id), nt.user_id);

-- FOLLOWS : deux côtés
ALTER TABLE follows ADD COLUMN follower_actor  UUID REFERENCES actors(id) ON DELETE CASCADE;
ALTER TABLE follows ADD COLUMN following_actor UUID REFERENCES actors(id) ON DELETE CASCADE;
UPDATE follows f SET follower_actor  = COALESCE((SELECT entity_id FROM _expo_entity WHERE person_id = f.follower_id),  f.follower_id);
UPDATE follows f SET following_actor = COALESCE((SELECT entity_id FROM _expo_entity WHERE person_id = f.following_id), f.following_id);

-- AUDIT : QUI (humain) a réalisé l'action ? (l'ancien user_id = l'humain = users.actor_id).
-- Permet les logs d'imputabilité : « Mathéo a candidaté pour Rune de Chêne ».
ALTER TABLE participations ADD COLUMN acted_by_user_id UUID REFERENCES users(actor_id) ON DELETE SET NULL;
ALTER TABLE reviews        ADD COLUMN acted_by_user_id UUID REFERENCES users(actor_id) ON DELETE SET NULL;
ALTER TABLE event_reports  ADD COLUMN acted_by_user_id UUID REFERENCES users(actor_id) ON DELETE SET NULL;
ALTER TABLE notes          ADD COLUMN acted_by_user_id UUID REFERENCES users(actor_id) ON DELETE SET NULL;
ALTER TABLE events         ADD COLUMN acted_by_user_id UUID REFERENCES users(actor_id) ON DELETE SET NULL;
UPDATE participations SET acted_by_user_id = user_id;
UPDATE reviews        SET acted_by_user_id = user_id;
UPDATE event_reports  SET acted_by_user_id = user_id;
UPDATE notes          SET acted_by_user_id = user_id;
UPDATE events         SET acted_by_user_id = created_by;
-- (Going forward : l'app renseigne acted_by_user_id = auth.uid() à chaque écriture — câblage Plan 3.)

-- RLS additif via can_act_as (les anciennes policies restent valables pour les personnes)
CREATE POLICY participations_write_actor ON participations FOR ALL TO authenticated
  USING (can_act_as(actor_id)) WITH CHECK (can_act_as(actor_id));
CREATE POLICY reviews_write_actor ON reviews FOR ALL TO authenticated
  USING (can_act_as(actor_id)) WITH CHECK (can_act_as(actor_id));
CREATE POLICY event_reports_write_actor ON event_reports FOR ALL TO authenticated
  USING (can_act_as(actor_id)) WITH CHECK (can_act_as(actor_id));
CREATE POLICY notes_write_actor ON notes FOR ALL TO authenticated
  USING (can_act_as(actor_id)) WITH CHECK (can_act_as(actor_id));
CREATE POLICY follows_write_actor ON follows FOR ALL TO authenticated
  USING (can_act_as(follower_actor)) WITH CHECK (can_act_as(follower_actor));
CREATE POLICY events_write_actor ON events FOR ALL TO authenticated
  USING (can_act_as(created_by_actor)) WITH CHECK (can_act_as(created_by_actor));
