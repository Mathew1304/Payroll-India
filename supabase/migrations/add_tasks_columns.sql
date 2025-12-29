-- Add missing columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours numeric DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS github_repo text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS github_issue_number integer;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS github_pr_number integer;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type text DEFAULT 'feature';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';
