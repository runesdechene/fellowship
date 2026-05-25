-- 20260525120006_social_views_actor.sql
-- Bascule des vues/RPC sociales sur les ACTEURS (*_actor). Les colonnes de sortie de la vue
-- `friends` gardent leurs noms (user_id/friend_id) — elles portent désormais des actor_id —,
-- donc get_friend_ids() et are_friends_of_friends() (qui s'appuient sur `friends`) restent valides.
-- event_scores ne référence aucun user_id → inchangé (non touché ici).

-- friends : compagnons = follow mutuel entre acteurs.
CREATE OR REPLACE VIEW friends AS
  SELECT f1.follower_actor AS user_id, f1.following_actor AS friend_id
  FROM follows f1
  INNER JOIN follows f2
    ON f1.follower_actor = f2.following_actor
   AND f1.following_actor = f2.follower_actor;

-- are_friends : sur *_actor.
CREATE OR REPLACE FUNCTION are_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM follows f1
    INNER JOIN follows f2 ON f1.follower_actor = f2.following_actor AND f1.following_actor = f2.follower_actor
    WHERE f1.follower_actor = user_a AND f1.following_actor = user_b
  );
$$;

-- get_friends_with_dates : sur *_actor (param = actor courant).
CREATE OR REPLACE FUNCTION get_friends_with_dates(p_user_id UUID)
RETURNS TABLE(friend_id UUID, friended_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f1.following_actor AS friend_id,
         GREATEST(f1.created_at, f2.created_at) AS friended_at
  FROM follows f1
  INNER JOIN follows f2
    ON f1.follower_actor = f2.following_actor
   AND f1.following_actor = f2.follower_actor
  WHERE f1.follower_actor = p_user_id;
$$;

-- actor_public : lecture unifiée users+entities pour les affichages « qui » (kind-agnostique).
CREATE OR REPLACE VIEW actor_public AS
  SELECT actor_id, 'person'::actor_kind AS kind, display_name AS label, avatar_url,
         NULL::entity_type AS entity_type, NULL::text AS public_slug
  FROM users
  UNION ALL
  SELECT actor_id, 'entity'::actor_kind AS kind, brand_name AS label, avatar_url,
         type AS entity_type, public_slug
  FROM entities;
