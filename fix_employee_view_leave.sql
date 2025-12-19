-- Fix: Add missing SELECT policy for employees to view their own leave applications
-- The current policy might be too restrictive

DROP POLICY IF EXISTS "leave_applications_view_own" ON leave_applications;

-- New policy: Employees can view their own applications
CREATE POLICY "leave_applications_view_own"
  ON leave_applications FOR SELECT
  TO authenticated
  USING (
    -- Match by employee_id directly from user_profiles
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
    OR
    -- OR if user is admin/manager in the same organization
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  );
