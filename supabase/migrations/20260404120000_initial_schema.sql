-- Fellowship V1 Schema

-- Enums
CREATE TYPE user_type AS ENUM ('exposant', 'public');
CREATE TYPE user_sex AS ENUM ('homme', 'femme', 'indefini');
CREATE TYPE user_plan AS ENUM ('free', 'pro');
CREATE TYPE participation_status AS ENUM ('interesse', 'inscrit', 'confirme');
CREATE TYPE participation_visibility AS ENUM ('prive', 'amis', 'public');
CREATE TYPE note_visibility AS ENUM ('prive', 'amis');
CREATE TYPE notification_type AS ENUM ('deadline_reminder', 'friend_going', 'new_follower', 'friend_note');

-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  type user_type NOT NULL DEFAULT 'public',
  email TEXT NOT NULL,
  display_name TEXT,
  brand_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  website TEXT,
  city TEXT,
  department TEXT,
  postal_code TEXT,
  sex user_sex DEFAULT 'indefini',
  public_slug TEXT UNIQUE,
  plan user_plan NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_type ON profiles(type);
CREATE INDEX idx_profiles_slug ON profiles(public_slug) WHERE public_slug IS NOT NULL;
CREATE INDEX idx_profiles_department ON profiles(department) WHERE department IS NOT NULL;

-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  city TEXT NOT NULL,
  department TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  registration_deadline DATE,
  registration_url TEXT,
  external_url TEXT,
  primary_tag TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_dates ON events(start_date, end_date);
CREATE INDEX idx_events_department ON events(department);
CREATE INDEX idx_events_primary_tag ON events(primary_tag);

-- Enable trigram extension for fuzzy search (deduplication)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_events_name_trgm ON events USING gin(name gin_trgm_ops);

-- Participations
CREATE TABLE participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status participation_status NOT NULL DEFAULT 'interesse',
  visibility participation_visibility NOT NULL DEFAULT 'amis',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX idx_participations_user ON participations(user_id);
CREATE INDEX idx_participations_event ON participations(event_id);

-- Notes
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  visibility note_visibility NOT NULL DEFAULT 'prive',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notes_event ON notes(event_id);
CREATE INDEX idx_notes_user ON notes(user_id);

-- Event Reports (private financial bilan)
CREATE TABLE event_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  booth_cost DECIMAL,
  charges DECIMAL,
  revenue DECIMAL,
  wins TEXT[] DEFAULT '{}',
  improvements TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  affluence SMALLINT NOT NULL CHECK (affluence BETWEEN 1 AND 5),
  organisation SMALLINT NOT NULL CHECK (organisation BETWEEN 1 AND 5),
  rentabilite SMALLINT NOT NULL CHECK (rentabilite BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX idx_reviews_event ON reviews(event_id);

-- Follows
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE read = false;

-- Push Subscriptions
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

-- Helper view: mutual follows (friends)
CREATE VIEW friends AS
  SELECT f1.follower_id AS user_id, f1.following_id AS friend_id
  FROM follows f1
  INNER JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id;

-- Helper function: check if two users are friends
CREATE OR REPLACE FUNCTION are_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM follows f1
    INNER JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
    WHERE f1.follower_id = user_a AND f1.following_id = user_b
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function: check if two users are friends-of-friends
CREATE OR REPLACE FUNCTION are_friends_of_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM friends f1
    INNER JOIN friends f2 ON f1.friend_id = f2.user_id
    WHERE f1.user_id = user_a AND f2.friend_id = user_b
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function: get friend IDs for a user
CREATE OR REPLACE FUNCTION get_friend_ids(p_user_id UUID)
RETURNS SETOF UUID AS $$
  SELECT friend_id FROM friends WHERE user_id = p_user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'public')::user_type
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Aggregated review scores (public view)
CREATE VIEW event_scores AS
  SELECT
    event_id,
    COUNT(*) AS review_count,
    ROUND(AVG(affluence)::numeric, 1) AS avg_affluence,
    ROUND(AVG(organisation)::numeric, 1) AS avg_organisation,
    ROUND(AVG(rentabilite)::numeric, 1) AS avg_rentabilite,
    ROUND(((AVG(affluence) + AVG(organisation) + AVG(rentabilite)) / 3)::numeric, 1) AS avg_overall
  FROM reviews
  GROUP BY event_id;
