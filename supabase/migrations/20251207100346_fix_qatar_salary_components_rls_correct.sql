/*
  # Fix Qatar Salary Components RLS - Correct Version
  
  ## Problem
  Previous fix had incorrect WITH CHECK clause syntax.
  
  ## Solution
  Create proper RLS policies that validate:
  1. User belongs to organization
  2. Target employee belongs to same organization
  3. Use correct SQL for WITH CHECK clause
*/

-- Drop the incorrect policy
DROP POLICY IF EXISTS "Org members can manage org employee salaries" ON qatar_salary_components;

-- Create correct policy for INSERT/UPDATE/DELETE
CREATE POLICY "Org members can manage org employee salaries"
  ON qatar_salary_components
  FOR ALL
  TO authenticated
  USING (
    -- For SELECT/UPDATE/DELETE: check existing row's organization
    organization_id IN (
      SELECT e.organization_id 
      FROM employees e
      INNER JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- For INSERT/UPDATE: verify both organization and employee match
    EXISTS (
      SELECT 1
      FROM employees e
      INNER JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
        AND e.organization_id = organization_id
        AND EXISTS (
          SELECT 1 
          FROM employees target_emp 
          WHERE target_emp.id = employee_id 
            AND target_emp.organization_id = organization_id
        )
    )
  );
