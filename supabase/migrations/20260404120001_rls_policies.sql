-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "profiles_select_public" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- EVENTS
CREATE POLICY "events_select_authenticated" ON events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "events_insert_exposant" ON events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND type = 'exposant')
  );

CREATE POLICY "events_update_creator" ON events
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- PARTICIPATIONS
CREATE POLICY "participations_select" ON participations
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR visibility = 'public'
    OR (visibility = 'amis' AND are_friends(auth.uid(), user_id))
  );

CREATE POLICY "participations_insert_own" ON participations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "participations_update_own" ON participations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "participations_delete_own" ON participations
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- NOTES
CREATE POLICY "notes_select" ON notes
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR (visibility = 'amis' AND (are_friends(auth.uid(), user_id) OR are_friends_of_friends(auth.uid(), user_id)))
  );

CREATE POLICY "notes_insert_own" ON notes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notes_update_own" ON notes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notes_delete_own" ON notes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- EVENT REPORTS (100% private)
CREATE POLICY "event_reports_owner_only" ON event_reports
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- REVIEWS
CREATE POLICY "reviews_select_scores" ON reviews
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "reviews_insert_exposant" ON reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND type = 'exposant')
  );

CREATE POLICY "reviews_update_own" ON reviews
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- FOLLOWS
CREATE POLICY "follows_select" ON follows
  FOR SELECT TO authenticated USING (
    follower_id = auth.uid() OR following_id = auth.uid()
  );

CREATE POLICY "follows_insert_own" ON follows
  FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "follows_delete_own" ON follows
  FOR DELETE TO authenticated
  USING (follower_id = auth.uid());

-- NOTIFICATIONS
CREATE POLICY "notifications_owner_only" ON notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- PUSH SUBSCRIPTIONS
CREATE POLICY "push_subscriptions_owner_only" ON push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
