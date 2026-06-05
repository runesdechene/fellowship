-- 20260605130000_get_following_with_dates.sql
-- Onglet « Abonnements » de la vitrine : exposer qui un acteur SUIT.
--
-- Symétrique de get_followers_with_dates (20260605120000). Même motif : la RLS
-- follows_select ne laisse un tiers lire que les follows dont il est partie prenante,
-- donc lire « qui suit tel acteur » exige une RPC SECURITY DEFINER bornée.
-- Décision produit : modale réseau = 2 onglets façon Instagram (Abonnés / Abonnements),
-- preuve sociale publique → GRANT anon + authenticated.

CREATE OR REPLACE FUNCTION get_following_with_dates(p_actor_id UUID)
RETURNS TABLE(following_id UUID, followed_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.following_actor AS following_id,
         f.created_at       AS followed_at
  FROM follows f
  WHERE f.follower_actor = p_actor_id
  ORDER BY f.created_at DESC
$$;

GRANT EXECUTE ON FUNCTION get_following_with_dates(UUID) TO anon, authenticated;
