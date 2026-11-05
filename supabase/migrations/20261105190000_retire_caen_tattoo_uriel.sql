-- POURQUOI — la date du Caen Tattoo Festival (23-25/10/2026) avait été posée par erreur sur le
-- profil particulier d'Uriel le 15/07 ; passée sur Runes de Chêne par 20261105160000, elle a fait
-- demander un bilan pour un festival qu'il n'a jamais fait (Uriel, 05/11/2026 : « supprime-la »).
DELETE FROM participations p
USING events e
WHERE e.id = p.event_id
  AND e.name = 'Caen Tattoo Festival'
  AND p.actor_id = '558a7cf4-29d3-49ba-bba9-ffb015c97c20';

-- Le bilan resté vide depuis le 16/06 (rien d'écrit, aucun chiffre) part avec la date.
DELETE FROM event_reports r
USING events e
WHERE e.id = r.event_id
  AND e.name = 'Caen Tattoo Festival'
  AND r.actor_id = '558a7cf4-29d3-49ba-bba9-ffb015c97c20'
  AND r.note IS NULL AND r.wins = '{}' AND r.improvements = '{}' AND r.media_paths = '{}';
