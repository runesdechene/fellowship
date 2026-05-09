-- Returns mutual-follow friends with the date the friendship became mutual
-- (= MAX of both follow timestamps). Used for sorting friends by recency.
CREATE OR REPLACE FUNCTION get_friends_with_dates(p_user_id UUID)
RETURNS TABLE(friend_id UUID, friended_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f1.following_id AS friend_id,
    GREATEST(f1.created_at, f2.created_at) AS friended_at
  FROM follows f1
  INNER JOIN follows f2
    ON f1.follower_id = f2.following_id
   AND f1.following_id = f2.follower_id
  WHERE f1.follower_id = p_user_id
$$;
