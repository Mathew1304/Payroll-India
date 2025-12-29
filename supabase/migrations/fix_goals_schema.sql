-- DATA SAFETY: Wrap in transaction
BEGIN;

-- 1. Ensure department_id column exists
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS department_id uuid;

-- 2. Fix 'departments' Foreign Key (The specific error reported)
-- Drop if exists to avoid conflicts, then recreate
ALTER TABLE goals
DROP CONSTRAINT IF EXISTS goals_department_id_fkey;

ALTER TABLE goals
ADD CONSTRAINT goals_department_id_fkey
FOREIGN KEY (department_id)
REFERENCES departments(id)
ON DELETE SET NULL;

-- 3. Fix 'goal_types' Foreign Key (Preventative)
-- Ensure the column exists first
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS goal_type_id uuid;

ALTER TABLE goals
DROP CONSTRAINT IF EXISTS goals_goal_type_id_fkey;

ALTER TABLE goals
ADD CONSTRAINT goals_goal_type_id_fkey
FOREIGN KEY (goal_type_id)
REFERENCES goal_types(id)
ON DELETE SET NULL;

-- 4. Fix 'employees' Foreign Key (Preventative)
ALTER TABLE goals
DROP CONSTRAINT IF EXISTS goals_employee_id_fkey;

ALTER TABLE goals
ADD CONSTRAINT goals_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES employees(id)
ON DELETE CASCADE;

COMMIT;
