-- Diagnostic queries to check work_reports RLS issue

-- 1. Check if current user has employee_id in organization_members
SELECT 
  user_id,
  employee_id,
  organization_id,
  role
FROM organization_members
WHERE user_id = auth.uid();

-- 2. Check if the employee record exists
SELECT 
  id,
  first_name,
  last_name,
  employee_code,
  organization_id
FROM employees
WHERE id IN (
  SELECT employee_id FROM organization_members WHERE user_id = auth.uid()
);

-- 3. Test the INSERT policy directly
SELECT 
  employee_id IN (
    SELECT employee_id FROM organization_members 
    WHERE user_id = auth.uid() AND employee_id IS NOT NULL
  ) as can_insert
FROM (SELECT (SELECT employee_id FROM organization_members WHERE user_id = auth.uid()) as employee_id) t;

-- 4. Check existing work_reports for this user
SELECT 
  id,
  employee_id,
  title,
  status,
  created_at
FROM work_reports
WHERE employee_id IN (
  SELECT employee_id FROM organization_members WHERE user_id = auth.uid()
);
