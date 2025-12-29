-- Add department_id column if it doesn't exist
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS department_id uuid;

-- Add foreign key relationship between goals and departments
ALTER TABLE goals
DROP CONSTRAINT IF EXISTS goals_department_id_fkey;

ALTER TABLE goals
ADD CONSTRAINT goals_department_id_fkey
FOREIGN KEY (department_id)
REFERENCES departments(id)
ON DELETE SET NULL;
