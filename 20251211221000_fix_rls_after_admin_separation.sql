/*
  # Fix RLS Policies After Admin Separation
  
  ## Problem
  The migration 20251211203000_separate_admin_from_employees.sql set employee_id = NULL 
  for admin/HR users, which broke RLS policies that depend on get_employee_id_from_auth().
  
  ## Solution
  Update RLS policies to explicitly check that employee_id IS NOT NULL, ensuring only
  actual employees (not admins) can access employee-specific features.
  
  ## Changes
  1. Fix attendance_records RLS policies
  2. Fix leave_requests RLS policies  
  3. Fix leave_applications RLS policies (if exists)
  4. Ensure employee_schedules policies are correct
*/

-- ============================================================================
-- FIX ATTENDANCE_RECORDS RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Employees can view their own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Employees can insert their own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Employees can update their own attendance" ON attendance_records;

-- Recreate with explicit NULL checks
CREATE POLICY "Employees can view their own attendance" ON attendance_records
  FOR SELECT 
  USING (
    employee_id = get_employee_id_from_auth()
    AND get_employee_id_from_auth() IS NOT NULL
  );

CREATE POLICY "Employees can insert their own attendance" ON attendance_records
  FOR INSERT 
  WITH CHECK (
    employee_id = get_employee_id_from_auth()
    AND organization_id = get_org_id_from_auth()
    AND get_employee_id_from_auth() IS NOT NULL
  );

CREATE POLICY "Employees can update their own attendance" ON attendance_records
  FOR UPDATE
  USING (
    employee_id = get_employee_id_from_auth()
    AND get_employee_id_from_auth() IS NOT NULL
  )
  WITH CHECK (
    employee_id = get_employee_id_from_auth()
    AND get_employee_id_from_auth() IS NOT NULL
  );

-- Admins and HR can view all attendance in their organization
DROP POLICY IF EXISTS "Admins can view organization attendance" ON attendance_records;
CREATE POLICY "Admins can view organization attendance" ON attendance_records
  FOR SELECT
  USING (
    organization_id = get_org_id_from_auth()
    AND has_any_role(ARRAY['admin', 'hr'])
  );

-- ============================================================================
-- FIX LEAVE_REQUESTS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view their leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Admins can view organization leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Admins can update leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Employees can create leave requests" ON leave_requests;

CREATE POLICY "Employees can view their leave requests" ON leave_requests
  FOR SELECT 
  USING (
    employee_id = get_employee_id_from_auth()
    AND get_employee_id_from_auth() IS NOT NULL
  );

CREATE POLICY "Employees can create leave requests" ON leave_requests
  FOR INSERT 
  WITH CHECK (
    employee_id = get_employee_id_from_auth()
    AND organization_id = get_org_id_from_auth()
    AND get_employee_id_from_auth() IS NOT NULL
  );

-- Admins can view all leave requests in their organization
CREATE POLICY "Admins can view organization leave requests" ON leave_requests
  FOR SELECT
  USING (
    organization_id = get_org_id_from_auth()
    AND has_any_role(ARRAY['admin', 'hr', 'manager'])
  );

-- Admins can update leave requests (for approval/rejection)
CREATE POLICY "Admins can update leave requests" ON leave_requests
  FOR UPDATE
  USING (
    organization_id = get_org_id_from_auth()
    AND has_any_role(ARRAY['admin', 'hr', 'manager'])
  );

-- ============================================================================
-- FIX LEAVE_APPLICATIONS RLS POLICIES (if table exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_applications') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Employees can view their leave applications" ON leave_applications;
    DROP POLICY IF EXISTS "Employees can create leave applications" ON leave_applications;
    
    -- Recreate with NULL checks
    EXECUTE 'CREATE POLICY "Employees can view their leave applications" ON leave_applications
      FOR SELECT 
      USING (
        employee_id = get_employee_id_from_auth()
        AND get_employee_id_from_auth() IS NOT NULL
      )';
    
    EXECUTE 'CREATE POLICY "Employees can create leave applications" ON leave_applications
      FOR INSERT 
      WITH CHECK (
        employee_id = get_employee_id_from_auth()
        AND organization_id = get_org_id_from_auth()
        AND get_employee_id_from_auth() IS NOT NULL
      )';
    
    -- Admins can view all
    EXECUTE 'CREATE POLICY "Admins can view organization leave applications" ON leave_applications
      FOR SELECT
      USING (
        organization_id = get_org_id_from_auth()
        AND has_any_role(ARRAY[''admin'', ''hr'', ''manager''])
      )';
  END IF;
END $$;

-- ============================================================================
-- FIX EMPLOYEE_SCHEDULES RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view their schedules" ON employee_schedules;

CREATE POLICY "Employees can view their schedules" ON employee_schedules
  FOR SELECT 
  USING (
    (employee_id = get_employee_id_from_auth() AND get_employee_id_from_auth() IS NOT NULL)
    OR has_any_role(ARRAY['admin', 'hr', 'manager'])
  );

-- ============================================================================
-- ADD ADMIN POLICIES FOR EMPLOYEE-RELATED TABLES
-- ============================================================================

-- Admins can manage office locations
DROP POLICY IF EXISTS "Admins can manage office locations" ON office_locations;
CREATE POLICY "Admins can manage office locations" ON office_locations
  FOR ALL
  USING (
    organization_id = get_org_id_from_auth()
    AND has_any_role(ARRAY['admin', 'hr'])
  );

-- Admins can manage work schedules
DROP POLICY IF EXISTS "Admins can manage work schedules" ON work_schedules;
CREATE POLICY "Admins can manage work schedules" ON work_schedules
  FOR ALL
  USING (
    organization_id = get_org_id_from_auth()
    AND has_any_role(ARRAY['admin', 'hr'])
  );

-- Admins can manage attendance settings
DROP POLICY IF EXISTS "Admins can manage attendance settings" ON attendance_settings;
CREATE POLICY "Admins can manage attendance settings" ON attendance_settings
  FOR ALL
  USING (
    organization_id = get_org_id_from_auth()
    AND has_any_role(ARRAY['admin', 'hr'])
  );

-- ============================================================================
-- CREATE HELPFUL VIEW FOR DEBUGGING
-- ============================================================================

CREATE OR REPLACE VIEW user_role_info AS
SELECT 
  auth.uid() as user_id,
  om.organization_id,
  om.role,
  om.employee_id,
  om.admin_id,
  CASE 
    WHEN om.employee_id IS NOT NULL THEN 'employee'
    WHEN om.admin_id IS NOT NULL THEN 'admin'
    ELSE 'unknown'
  END as user_type,
  e.first_name as employee_first_name,
  e.last_name as employee_last_name,
  oa.first_name as admin_first_name,
  oa.last_name as admin_last_name
FROM organization_members om
LEFT JOIN employees e ON e.id = om.employee_id
LEFT JOIN organization_admins oa ON oa.id = om.admin_id
WHERE om.user_id = auth.uid()
  AND om.is_active = true;

GRANT SELECT ON user_role_info TO authenticated;

COMMENT ON VIEW user_role_info IS 'Helper view to debug user roles and access levels';
