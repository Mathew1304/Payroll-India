/*
  # Fix Qatar Salary Components RLS - With Proper Aliases
  
  ## Problem
  Column references were ambiguous in the previous policy.
  
  ## Solution
  Use proper table aliases to avoid ambiguity.
*/

-- Drop the current policy
DROP POLICY IF EXISTS "Org members can manage org employee salaries" ON qatar_salary_components;

-- Create policy with proper aliases
CREATE POLICY "Org members can manage org employee salaries"
  ON qatar_salary_components
  FOR ALL
  TO authenticated
  USING (
    -- For SELECT/UPDATE/DELETE: user must be in the same organization
    EXISTS (
      SELECT 1
      FROM employees e
      INNER JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
        AND e.organization_id = qatar_salary_components.organization_id
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
        AND user_emp.organization_id = qatar_salary_components.organization_id
        AND target_emp.id = qatar_salary_components.employee_id
    )
  );
