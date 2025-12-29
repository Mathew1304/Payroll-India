-- Update tasks_status_check constraint to include 'in_review'
-- Also ensuring 'pending' is allowed and 'todo' is allowed (for backward compatibility if needed, though we moved to pending)

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE tasks ADD CONSTRAINT tasks_status_check CHECK (
  status = ANY (ARRAY[
    'pending'::text,
    'todo'::text, 
    'in_progress'::text,
    'in_review'::text,
    'completed'::text,
    'cancelled'::text,
    'on_hold'::text
  ])
);
