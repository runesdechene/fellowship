-- Retire le broadcast event_created (fan-out N×M : 1 notif par utilisateur et par event
-- créé). À ce stade, 1517 / 3272 lignes de la table notifications étaient ce broadcast.
-- La découverte des nouveaux festivals passe désormais par le feed Communauté (item dérivé,
-- plateforme entière, sans notification) et par Explorer — plus aucune notif générée ici.
--
-- event_image_added / event_info_added : valeurs d'enum jamais câblées (aucun trigger) — rien
-- à dropper côté triggers. La purge des lignes event_created déjà accumulées n'est PAS faite
-- ici (destructif) : décision séparée.
DROP TRIGGER IF EXISTS on_event_created ON events;
DROP FUNCTION IF EXISTS notify_event_created();
