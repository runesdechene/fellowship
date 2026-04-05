-- Add new notification types for full platform activity monitoring
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'event_created';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'event_updated';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'event_image_added';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'event_info_added';
