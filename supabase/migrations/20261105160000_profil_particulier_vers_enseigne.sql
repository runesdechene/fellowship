-- POURQUOI — le profil particulier ne sert plus qu'à nommer la personne : dès qu'elle a une
-- enseigne, il disparaît du sélecteur de comptes (Uriel, 05/11/2026). Ce qu'il portait encore doit
-- donc passer sur l'enseigne, sinon la personne ne le verrait plus.
-- Relevé du 05/11/2026 : 7 personnes concernées, 23 dates, 5 fiches, 2 abonnements.
-- - Une date déjà présente sur l'enseigne pour le même festival est un doublon périmé (identique,
--   ou une version plus ancienne : « à payer » au lieu de « payé »…) : il est supprimé, l'enseigne
--   garde la sienne (accord d'Uriel, 05/11/2026). Les autres dates passent sur l'enseigne.
-- - Les fiches créées et les abonnements passent sur l'enseigne.
-- - Une personne qui a plusieurs enseignes est réglée à la main : Uriel → Runes de Chêne.
-- Aucun déclencheur ne part : ceux des dates guettent le statut, celui des fiches les champs
-- visibles, celui des abonnements l'insertion.

CREATE TEMP TABLE profil_vers_enseigne ON COMMIT DROP AS
SELECT u.actor_id AS person, m.entity_actor_id AS ent
FROM users u JOIN memberships m ON m.user_actor_id = u.actor_id
WHERE (SELECT count(*) FROM memberships m2 WHERE m2.user_actor_id = u.actor_id) = 1
UNION ALL
SELECT 'a7ad4ea6-5009-44a7-a532-e58ac4e5a995', '558a7cf4-29d3-49ba-bba9-ffb015c97c20';

-- Les dates : le doublon périmé part, le reste suit la personne sur son enseigne.
DELETE FROM participations a USING profil_vers_enseigne p
WHERE a.actor_id = p.person
  AND EXISTS (SELECT 1 FROM participations b WHERE b.actor_id = p.ent AND b.event_id = a.event_id);

UPDATE participations a SET actor_id = p.ent
FROM profil_vers_enseigne p WHERE a.actor_id = p.person;

UPDATE events e SET created_by_actor = p.ent
FROM profil_vers_enseigne p WHERE e.created_by_actor = p.person;

-- Les abonnements, dans les deux sens : chaque bout passe sur l'enseigne. Celui qui deviendrait un
-- doublon (DOMDOM suivait Mélisande, leurs enseignes se suivent déjà) ou un compte qui se suit
-- lui-même part.
CREATE TEMP TABLE follows_vers_enseigne ON COMMIT DROP AS
SELECT f.id,
  coalesce(a.ent, f.follower_actor) AS follower,
  coalesce(b.ent, f.following_actor) AS following
FROM follows f
LEFT JOIN profil_vers_enseigne a ON a.person = f.follower_actor
LEFT JOIN profil_vers_enseigne b ON b.person = f.following_actor
WHERE a.person IS NOT NULL OR b.person IS NOT NULL;

DELETE FROM follows f USING follows_vers_enseigne v
WHERE f.id = v.id
  AND (v.follower = v.following OR EXISTS (
    SELECT 1 FROM follows g WHERE g.follower_actor = v.follower AND g.following_actor = v.following));

UPDATE follows f SET follower_actor = v.follower, following_actor = v.following
FROM follows_vers_enseigne v WHERE f.id = v.id;
