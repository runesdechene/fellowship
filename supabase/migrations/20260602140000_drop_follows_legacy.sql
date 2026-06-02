-- Plan 4 / Phase 3 : follows -> drop follower_id / following_id (legacy -> profiles).
--
-- App deja 100% sur follower_actor/following_actor. Triggers rebranches en ph.2.
-- Vues/RPC sociales (friends, are_friends, get_friends_with_dates) deja sur acteurs (120006).
-- Restent les policies RLS legacy + les colonnes + leurs FK -> profiles.

-- RLS legacy (sur follower_id/following_id) -> remplacees par des policies acteur.
DROP POLICY IF EXISTS follows_select ON follows;
DROP POLICY IF EXISTS follows_insert_own ON follows;
DROP POLICY IF EXISTS follows_delete_own ON follows;

-- SELECT : voir les follows ou je suis l'une OU l'autre extremite (replique le legacy
-- follower_id=auth.uid() OR following_id=auth.uid(), sur acteurs). Couvre useMyFollowers
-- (following_actor=moi), useFollowingSet (follower_actor=moi) et le badge reciproque.
-- (Les writes insert/delete sont deja couverts par follows_write_actor, FOR ALL, 120002.)
CREATE POLICY follows_select ON follows FOR SELECT TO authenticated
  USING (can_act_as(follower_actor) OR can_act_as(following_actor));

-- Backfill defensif + NOT NULL (l'app ecrit toujours les deux).
UPDATE follows SET follower_actor  = follower_id  WHERE follower_actor  IS NULL AND follower_id  IS NOT NULL;
UPDATE follows SET following_actor = following_id WHERE following_actor IS NULL AND following_id IS NOT NULL;
DELETE FROM follows WHERE follower_actor IS NULL OR following_actor IS NULL;
ALTER TABLE follows ALTER COLUMN follower_actor  SET NOT NULL;
ALTER TABLE follows ALTER COLUMN following_actor SET NOT NULL;

-- Drop des colonnes legacy (les FK -> profiles et index legacy partent avec).
ALTER TABLE follows DROP COLUMN follower_id;
ALTER TABLE follows DROP COLUMN following_id;
