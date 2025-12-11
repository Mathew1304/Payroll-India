-- Fix RLS policy for qatar_salary_components to allow admins to create records
-- This resolves the issue where admins cannot create their own salary components
-- because they don't have an employee record yet.

-- Drop existing policy
DROP POLICY IF EXISTS "HR can manage salary components" ON qatar_salary_components;

-- Create new policy checking organization_members directly
CREATE POLICY "HR can manage salary components"
  ON qatar_salary_components FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = qatar_salary_components.organization_id
      AND user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'hr', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = qatar_salary_components.organization_id
      AND user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'hr', 'manager')
    )
  );
