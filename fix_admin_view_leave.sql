-- Fix: Ensure admin can see all leave applications in their organization
-- This creates a more permissive policy for admins

-- Drop and recreate the view policy
DROP POLICY IF EXISTS "leave_applications_view_own" ON leave_applications;

CREATE POLICY "leave_applications_view_own"
  ON leave_applications FOR SELECT
  TO authenticated
  USING (
    -- Employees can see their own applications
    (
      employee_id IN (
        SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
    OR
    -- Admins/HR/Managers can see all applications in their org
    (
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
        AND organization_id = leave_applications.organization_id
      )
    )
  );
