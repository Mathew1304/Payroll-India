-- Fixed leave_applications RLS policies (no recursion)
-- Run this AFTER fixing user_profiles recursion

-- Enable RLS
ALTER TABLE leave_applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "leave_applications_employees_create" ON leave_applications;
DROP POLICY IF EXISTS "leave_applications_manage" ON leave_applications;
DROP POLICY IF EXISTS "leave_applications_view_own" ON leave_applications;

-- Policy 1: View own applications or if admin/manager
CREATE POLICY "leave_applications_view_own"
  ON leave_applications FOR SELECT
  TO authenticated
  USING (
    -- User can see their own applications
    employee_id IN (
      SELECT id FROM employees WHERE id IN (
        SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
    OR
    -- OR user is admin/manager in the same org
    organization_id IN (
      SELECT up.organization_id FROM user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  );

-- Policy 2: Employees can create their own applications
CREATE POLICY "leave_applications_employees_create"
  ON leave_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Employee ID must match the user's employee_id
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
    AND
    -- Organization ID must match the user's organization
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy 3: Admins can update/delete applications
CREATE POLICY "leave_applications_manage"
  ON leave_applications FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

-- Policy 4: Admins can delete applications
CREATE POLICY "leave_applications_delete"
  ON leave_applications FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );
