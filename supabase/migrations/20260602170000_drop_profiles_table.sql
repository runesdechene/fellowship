-- Plan 4 / Phase 5b : DROP TABLE profiles. Etape finale et irreversible.
-- Prerequis (5a) faits : signup, role admin, gating exposant, notif new_exposant, et toutes
-- les lectures applicatives sont rebranchees sur users/entities/memberships. Plus aucune FK
-- vers profiles sauf push_subscriptions.user_id -> on la repointe vers users.

-- push_subscriptions.user_id = un actor_id de personne = users.actor_id. Repointage de la FK.
DELETE FROM push_subscriptions WHERE user_id NOT IN (SELECT actor_id FROM users);
ALTER TABLE push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_fkey;
ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(actor_id) ON DELETE CASCADE;

-- La table legacy n'est plus referencee par rien. On la retire (ses policies partent avec).
DROP TABLE profiles;
