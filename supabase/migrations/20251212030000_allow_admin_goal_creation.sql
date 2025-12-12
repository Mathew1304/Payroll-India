-- Make created_by nullable in goals table to allow admins to create goals
-- Admins who are not employees can now create goals for employees

ALTER TABLE goals 
ALTER COLUMN created_by DROP NOT NULL;

-- Make reviewer_id nullable in performance_reviews table to allow admins to create reviews
ALTER TABLE performance_reviews
ALTER COLUMN reviewer_id DROP NOT NULL;

-- Make user_id nullable in goal_comments table to allow admins to comment
ALTER TABLE goal_comments
ALTER COLUMN user_id DROP NOT NULL;

-- Update the comments to reflect these changes
COMMENT ON COLUMN goals.created_by IS 'Employee ID of the person who created the goal. Can be NULL if created by an admin who is not an employee.';
COMMENT ON COLUMN performance_reviews.reviewer_id IS 'Employee ID of the reviewer. Can be NULL if created by an admin who is not an employee.';
COMMENT ON COLUMN goal_comments.user_id IS 'Employee ID of the commenter. Can be NULL if comment is from an admin who is not an employee.';
