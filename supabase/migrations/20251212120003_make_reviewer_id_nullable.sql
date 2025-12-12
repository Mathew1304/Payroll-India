-- Make reviewer_id nullable to allow admin users without employee_id to create reviews

ALTER TABLE performance_reviews 
ALTER COLUMN reviewer_id DROP NOT NULL;
