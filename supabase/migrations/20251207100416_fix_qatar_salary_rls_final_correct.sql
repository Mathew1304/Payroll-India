/*
  # Fix Qatar Salary Components RLS - Final Correct Version
  
  ## Problem
  The WITH CHECK clause was not correctly referencing the NEW row values.
  In PostgreSQL RLS, NEW row columns are referenced directly.
  
  ## Solution
  Create proper RLS policy that:
  1. Verifies user belongs to an organization
  2. Verifies the employee being added belongs to the same organization
  3. Uses correct SQL to reference NEW row values in WITH CHECK
*/

-- Drop the incorrect policy
DROP POLICY IF EXISTS "Org members can manage org employee salaries" ON qatar_salary_components;

-- Create correct policy with proper NEW row reference
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
    -- For INSERT/UPDATE: verify user's org matches the organization_id AND employee belongs to that org
    organization_id IN (
      SELECT e.organization_id 
      FROM employees e
      INNER JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
    )
    AND
    -- Verify the employee_id being inserted/updated belongs to the same organization
    employee_id IN (
      SELECT id 
      FROM employees 
      WHERE organization_id = qatar_salary_components.organization_id
    )
  );
