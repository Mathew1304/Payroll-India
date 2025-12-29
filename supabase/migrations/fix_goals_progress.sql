-- Add progress column to goals table if it doesn't exist
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;

-- Ensure it has a check constraint for valid percentage if needed, but simple int is fine for now.
-- Ideally we want it between 0 and 100
ALTER TABLE public.goals 
DROP CONSTRAINT IF EXISTS goals_progress_check;

ALTER TABLE public.goals
ADD CONSTRAINT goals_progress_check CHECK (progress >= 0 AND progress <= 100);
