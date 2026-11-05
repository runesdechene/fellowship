-- POURQUOI — Mathéo (matheosatorra44@gmail.com) agit pour Runes de Chêne depuis son propre compte
-- (Uriel, 05/11/2026). L'app n'a pas encore d'écran pour ajouter un membre à une enseigne.
-- Rôle « admin » : il n'est pas le titulaire ; aucun droit ne dépend du rôle (can_act_as).
INSERT INTO memberships (user_actor_id, entity_actor_id, role)
SELECT u.actor_id, '558a7cf4-29d3-49ba-bba9-ffb015c97c20', 'admin'
FROM users u JOIN auth.users au ON au.id = u.auth_id
WHERE au.email = 'matheosatorra44@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_actor_id = u.actor_id AND m.entity_actor_id = '558a7cf4-29d3-49ba-bba9-ffb015c97c20'
  );
