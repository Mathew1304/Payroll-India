-- CRITICAL SECURITY FIX: Prevent cross-organization data leakage in leave_applications
-- The existing RLS policies allow users to see leave applications from other organizations
-- This fix ensures users can ONLY see leave applications from their own organization

-- Drop all existing leave_applications policies
DROP POLICY IF EXISTS "admin_view_leave_apps" ON leave_applications;
DROP POLICY IF EXISTS "admin_update_leave_apps" ON leave_applications;
DROP POLICY IF EXISTS "Employees view own applications" ON leave_applications;
DROP POLICY IF EXISTS "Employees create own applications" ON leave_applications;

-- CREATE FIXED POLICIES WITH ORGANIZATION SCOPING

-- 1. Employees can view their own leave applications (own organization only)
CREATE POLICY "Employees view own applications"
  ON leave_applications FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
  );

-- 2. Admins/HR/Managers can view ALL leave applications ONLY in their organization
CREATE POLICY "Admins view org leave applications"
  ON leave_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM organization_members om
      JOIN employees e ON e.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
        AND om.role IN ('admin', 'super_admin', 'hr', 'manager')
        AND e.id = leave_applications.employee_id
        AND e.organization_id = om.organization_id  -- CRITICAL: This ensures same organization
    )
  );

-- 3. Employees can create their own leave applications
CREATE POLICY "Employees create own applications"
  ON leave_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
    AND EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_id
      AND e.organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
    )
  );

-- 4. Admins/HR can update leave applications in their organization
CREATE POLICY "Admins update org leave applications"
  ON leave_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM organization_members om
      JOIN employees e ON e.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
        AND om.role IN ('admin', 'super_admin', 'hr', 'manager')
        AND e.id = leave_applications.employee_id
        AND e.organization_id = om.organization_id  -- CRITICAL: This ensures same organization
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM organization_members om
      JOIN employees e ON e.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
        AND om.role IN ('admin', 'super_admin', 'hr', 'manager')
        AND e.id = leave_applications.employee_id
        AND e.organization_id = om.organization_id  -- CRITICAL: This ensures same organization
    )
  );

-- 5. Employees can update their own pending leave applications
CREATE POLICY "Employees update own pending applications"
  ON leave_applications FOR UPDATE
  TO authenticated
  USING (
    employee_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
    AND status = 'pending'
  )
  WITH CHECK (
    employee_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
    AND status = 'pending'
  );

-- 6. Employees can delete their own pending leave applications
CREATE POLICY "Employees delete own pending applications"
  ON leave_applications FOR DELETE
  TO authenticated
  USING (
    employee_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
    AND status = 'pending'
  );
