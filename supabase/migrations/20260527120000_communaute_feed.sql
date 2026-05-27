-- 20260527120000_communaute_feed.sql
-- Communauté (fil du réseau) :
--  (1) Corrige une fuite pré-existante de `participations_select` : un `inscrit` en
--      visibilité `prive` était lisible par tout le monde (le `OR status='inscrit'`
--      écrasait la visibilité). Désormais `prive` gagne TOUJOURS.
--      Décision visibilité (docs/decisions) : confirmé (inscrit) = découvrable par ton
--      réseau (public ET amis), donc on garde l'inscrit visible aux abonnés one-way —
--      sauf `prive`.
--  (2) Deux RPC SECURITY DEFINER pour lire l'activité de follow du 2e degré (segment
--      « Réseau » + carte « Suggestions »). La policy `follows_select` ne laisse lire
--      que les follows dont l'appelant est partie prenante ; lire les follows entre tiers
--      (qui suivent mes abonnements) nécessite un RPC. Chaque RPC est borné au réseau de
--      l'appelant et protégé par `can_act_as(p_actor_id)`.

-- (1) prive gagne toujours
DROP POLICY IF EXISTS participations_select ON participations;
CREATE POLICY participations_select ON participations FOR SELECT USING (
  can_act_as(actor_id)
  OR (status = 'inscrit' AND visibility <> 'prive')
  OR (status = ANY (ARRAY['interesse','en_cours']::participation_status[]) AND visibility <> 'prive' AND are_friends(auth.uid(), actor_id))
  OR visibility = 'public'
  OR (visibility = 'amis' AND are_friends(auth.uid(), actor_id))
);

-- (2a) Activité de follow récente de TON réseau (follows émis par les acteurs que tu suis).
-- Noms de colonnes de sortie distincts des colonnes de `follows` (évite toute ambiguïté).
CREATE OR REPLACE FUNCTION get_network_follow_activity(p_actor_id uuid, p_since timestamptz)
RETURNS TABLE (follow_id uuid, src_actor uuid, dst_actor uuid, occurred_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.id, f.follower_actor, f.following_actor, f.created_at
  FROM follows f
  WHERE can_act_as(p_actor_id)
    AND f.follower_actor IN (
      SELECT following_actor FROM follows
      WHERE follower_actor = p_actor_id AND following_actor IS NOT NULL
    )
    AND f.following_actor IS NOT NULL
    AND f.follower_actor <> p_actor_id
    AND f.created_at >= p_since
  ORDER BY f.created_at DESC
  LIMIT 60;
$$;

-- (2b) Suggestions : acteurs suivis par TES abonnements, que tu ne suis pas encore, + compte.
-- Sélection positionnelle (pas d'alias = pas de collision avec les noms de sortie).
CREATE OR REPLACE FUNCTION get_follow_suggestions(p_actor_id uuid)
RETURNS TABLE (suggested_actor uuid, shared_followers bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.following_actor, count(*)::bigint
  FROM follows f
  WHERE can_act_as(p_actor_id)
    AND f.following_actor IS NOT NULL
    AND f.following_actor <> p_actor_id
    AND f.follower_actor IN (
      SELECT following_actor FROM follows
      WHERE follower_actor = p_actor_id AND following_actor IS NOT NULL
    )
    AND f.following_actor NOT IN (
      SELECT following_actor FROM follows
      WHERE follower_actor = p_actor_id AND following_actor IS NOT NULL
    )
  GROUP BY f.following_actor
  ORDER BY count(*) DESC
  LIMIT 12;
$$;

GRANT EXECUTE ON FUNCTION get_network_follow_activity(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_follow_suggestions(uuid) TO authenticated;
