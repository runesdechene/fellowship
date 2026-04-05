-- Add craft_type field for exposant profiles (e.g. "Forgeron", "Marque de vêtement")
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS craft_type text;
