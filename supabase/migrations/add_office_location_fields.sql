-- Add requires_gps column to office_locations if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'office_locations' AND column_name = 'requires_gps') THEN
        ALTER TABLE office_locations ADD COLUMN requires_gps BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'office_locations' AND column_name = 'timezone') THEN
        ALTER TABLE office_locations ADD COLUMN timezone TEXT DEFAULT 'UTC';
    END IF;
END $$;
