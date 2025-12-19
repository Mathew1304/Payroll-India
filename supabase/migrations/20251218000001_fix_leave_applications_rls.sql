-- Fix RLS policy for leave_applications to allow employees to create their own applications
-- The issue: employees need to provide organization_id, but the policy should auto-populate it

DROP POLICY IF EXISTS "leave_applications_employees_create" ON leave_applications;

CREATE POLICY "leave_applications_employees_create"
  ON leave_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if the employee_id matches the user's employee_id
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    AND
    -- AND the organization_id matches the user's organization
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

-- Also ensure admins can still create applications
DROP POLICY IF EXISTS "leave_applications_manage" ON leave_applications;

CREATE POLICY "leave_applications_manage"
  ON leave_applications FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );
