/*
  # Fix Saudi Salary Components RLS - Consistent with Qatar
  
  ## Problem
  Saudi salary components table has duplicate policies and may have the same
  issue as Qatar had.
  
  ## Solution
  Clean up and apply the same simplified, correct policy as Qatar.
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Employees can view own salary components (Saudi)" ON saudi_salary_components;
DROP POLICY IF EXISTS "Employees can view own saudi salary" ON saudi_salary_components;
DROP POLICY IF EXISTS "HR can manage salary components (Saudi)" ON saudi_salary_components;
DROP POLICY IF EXISTS "Organization members can manage salary components" ON saudi_salary_components;

-- Create the same policy structure as Qatar for consistency
CREATE POLICY "Org members can manage org employee salaries"
  ON saudi_salary_components
  FOR ALL
  TO authenticated
  USING (
    -- For SELECT/UPDATE/DELETE: user must be in the same organization
    EXISTS (
      SELECT 1
      FROM employees e
      INNER JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
        AND e.organization_id = saudi_salary_components.organization_id
    )
  )
  WITH CHECK (
    -- For INSERT/UPDATE: verify user and employee are in same org
    EXISTS (
      SELECT 1
      FROM employees user_emp
      INNER JOIN user_profiles up ON up.employee_id = user_emp.id
      INNER JOIN employees target_emp ON target_emp.organization_id = user_emp.organization_id
      WHERE up.user_id = auth.uid()
        AND user_emp.organization_id = saudi_salary_components.organization_id
        AND target_emp.id = saudi_salary_components.employee_id
    )
  );

CREATE POLICY "Employees can view own saudi salary"
  ON saudi_salary_components
  FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );
