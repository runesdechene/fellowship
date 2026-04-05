-- Add banner_url column for profile banner images
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url text;
