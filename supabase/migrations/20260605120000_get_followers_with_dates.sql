-- 20260605120000_get_followers_with_dates.sql
-- Preuve sociale publique : exposer les ABONNÉS d'une vitrine à tout visiteur.
--
-- Bug : la liste « Abonnés » de la vitrine lisait `follows` EN DIRECT
-- (use-vitrine.ts fetchNetwork), donc soumise à la RLS `follows_select` :
--   USING (can_act_as(follower_actor) OR can_act_as(following_actor))
-- → un visiteur tiers ne voyait que les lignes où il est lui-même partie prenante.
-- Résultat : le compteur « N abonnés » et les avatars d'une vitrine étaient faux
-- (quasi toujours 0/1) pour tout le monde sauf le propriétaire/membre de l'entité.
--
-- Le feed Communauté, les Suggestions et les Compagnons passaient déjà par des RPC
-- SECURITY DEFINER et étaient corrects. On aligne les abonnés sur le même rail :
-- RPC SECURITY DEFINER bornée à « les abonnés de tel acteur » (pas tout le graphe),
-- callable par anon + authenticated (les prospects déconnectés sur flw.sh voient la
-- preuve sociale aussi). Décision produit : abonnés = preuve sociale publique.
-- Miroir exact de get_friends_with_dates (déjà SECURITY DEFINER, déjà sans garde).

CREATE OR REPLACE FUNCTION get_followers_with_dates(p_actor_id UUID)
RETURNS TABLE(follower_id UUID, followed_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.follower_actor AS follower_id,
         f.created_at      AS followed_at
  FROM follows f
  WHERE f.following_actor = p_actor_id
  ORDER BY f.created_at DESC
$$;

GRANT EXECUTE ON FUNCTION get_followers_with_dates(UUID) TO anon, authenticated;
