-- Add contact_email and registration_note fields for events without a registration URL
ALTER TABLE events ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_note text;
