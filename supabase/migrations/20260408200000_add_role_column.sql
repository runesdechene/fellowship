-- Add role column for system permissions (admin vs regular user)
-- Distinct from user_type (exposant/public) which is the business type
ALTER TABLE profiles ADD COLUMN role text NOT NULL DEFAULT 'user';

-- Index for RLS policy lookups
CREATE INDEX idx_profiles_role ON profiles (role);
