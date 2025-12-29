-- Add submission fields to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_url text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_notes text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
