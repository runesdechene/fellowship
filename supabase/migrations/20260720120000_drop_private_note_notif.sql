-- Bug : les « notes privées » d'un événement déclenchaient une notification
-- `friend_note` à TOUS les abonnés de l'auteur (trigger on_new_note →
-- notify_friend_note). Or les notes sont strictement privées (visible
-- uniquement par l'auteur : use-notes.ts ne lit que .eq('actor_id', moi)).
-- Le destinataire recevait « X a laissé une note sur <event> » sans jamais
-- pouvoir la lire → spam pur. Le partage viendra via la future Discussion,
-- pas via la table notes.
--
-- Fix : retirer le trigger + la fonction (seul ce trigger l'appelait) et
-- purger les notifs friend_note déjà émises. Rétro-compatible : aucun
-- frontend ne dépend de l'émission de friend_note.

DROP TRIGGER IF EXISTS on_new_note ON notes;
DROP FUNCTION IF EXISTS notify_friend_note();

DELETE FROM notifications WHERE type = 'friend_note';
