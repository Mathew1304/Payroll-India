-- Fix performance_reviews table schema to match UI expectations
ALTER TABLE public.performance_reviews 
    ADD COLUMN IF NOT EXISTS review_cycle TEXT,
    ADD COLUMN IF NOT EXISTS review_period TEXT,
    ADD COLUMN IF NOT EXISTS overall_rating NUMERIC(3,2),
    ADD COLUMN IF NOT EXISTS feedback TEXT,
    ADD COLUMN IF NOT EXISTS areas_for_improvement TEXT,
    ADD COLUMN IF NOT EXISTS goals_met BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS achievements TEXT,
    ADD COLUMN IF NOT EXISTS goals_for_next_period TEXT,
    ADD COLUMN IF NOT EXISTS manager_comments TEXT,
    ADD COLUMN IF NOT EXISTS employee_comments TEXT,
    ADD COLUMN IF NOT EXISTS reviewed_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL;

-- Remove old date-based unique constraint that causes 409 Conflicts
ALTER TABLE public.performance_reviews 
    DROP CONSTRAINT IF EXISTS performance_reviews_employee_id_review_period_start_review_period_key;
dfewfnivbdfiewvn
-- Add new flexible period-based unique constraint
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'performance_reviews_employee_id_review_period_key') THEN
        ALTER TABLE public.performance_reviews 
            ADD CONSTRAINT performance_reviews_employee_id_review_period_key 
            UNIQUE (employee_id, review_period);
    END IF;
END $$;

-- Make old specific date columns optional
ALTER TABLE public.performance_reviews 
    ALTER COLUMN review_period_start DROP NOT NULL,
    ALTER COLUMN review_period_end DROP NOT NULL;

-- Sync naming conventions
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'performance_reviews' AND column_name = 'areas_of_improvement') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'performance_reviews' AND column_name = 'areas_for_improvement') THEN
        ALTER TABLE public.performance_reviews RENAME COLUMN areas_of_improvement TO areas_for_improvement;
    END IF;
END $$;
