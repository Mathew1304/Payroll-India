-- Add missing columns to performance_reviews table for enhanced review system

-- Add goal_id to link reviews to specific goals
ALTER TABLE performance_reviews 
ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES goals(id) ON DELETE SET NULL;

-- Add goals_met boolean flag
ALTER TABLE performance_reviews 
ADD COLUMN IF NOT EXISTS goals_met BOOLEAN DEFAULT false;

-- Add rating column (1-5 stars)
ALTER TABLE performance_reviews 
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);

-- Add feedback column for overall feedback
ALTER TABLE performance_reviews 
ADD COLUMN IF NOT EXISTS feedback TEXT;

-- Add review_period text column (e.g., "Q1 2025")
ALTER TABLE performance_reviews 
ADD COLUMN IF NOT EXISTS review_period TEXT;

-- Add reviewed_at timestamp
ALTER TABLE performance_reviews 
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Add reviewed_by column (can be different from reviewer_id)
ALTER TABLE performance_reviews 
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES employees(id);

-- Create index for goal_id lookups
CREATE INDEX IF NOT EXISTS idx_performance_reviews_goal_id ON performance_reviews(goal_id);

-- Create index for employee_id lookups
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee_id ON performance_reviews(employee_id);
