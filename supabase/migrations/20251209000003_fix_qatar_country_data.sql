-- Force update all organizations to Country = 'Qatar'
-- This is a data fix for the current development environment where data might be stale or defaulted to India.

UPDATE organizations
SET country = 'Qatar';

-- Optional: Ensure new organizations default to Qatar if needed, though the code should handle it.
-- For now, just fixing the data is enough.
