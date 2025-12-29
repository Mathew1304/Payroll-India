-- Add completion_date column to goals table if it doesn't exist
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS completion_date TIMESTAMPTZ;

-- Also ensure progress_percentage is there (it should be from original schema, but just in case)
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;

-- Drop 'progress' column if we want to clean up, but maybe keep it to avoid breakage if other things use it.
-- For now, just ensuring completion_date exists to fix the Admin Modal error.
