/*
  # Fix Employee RLS Policies for Organization Isolation
  
  ## Problem
  Employees from different organizations are visible across organization boundaries
  due to conflicting RLS policies from multiple migrations.
  
  ## Solution
  Drop all existing conflicting policies and create organization-scoped policies
  that properly enforce tenant isolation.
*/

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get current user's organization ID(s)
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid AS $$
  SELECT organization_id FROM organization_members
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Update existing helper to filter by organization
CREATE OR REPLACE FUNCTION get_auth_employee_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  emp_id uuid;
BEGIN
  -- Get employee_id from organization_members (not user_profiles)
  -- Only return if employee belongs to an organization the user is a member of
  SELECT employee_id INTO emp_id 
  FROM organization_members 
  WHERE user_id = auth.uid() 
    AND employee_id IS NOT NULL
    AND is_active = true
  LIMIT 1;
  
  RETURN emp_id;
END;
$$;

-- Check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid() 
      AND role = 'super_admin'
      AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- DROP ALL EXISTING CONFLICTING POLICIES ON EMPLOYEES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view own record" ON employees;
DROP POLICY IF EXISTS "Managers can view team members" ON employees;
DROP POLICY IF EXISTS "HR and Admins can view all employees" ON employees;
DROP POLICY IF EXISTS "HR and Admin can view all employees" ON employees;
DROP POLICY IF EXISTS "HR and Admins can create employees" ON employees;
DROP POLICY IF EXISTS "HR and Admin can create employees" ON employees;
DROP POLICY IF EXISTS "HR and Admins can update employees" ON employees;
DROP POLICY IF EXISTS "HR and Admin can update employees" ON employees;
DROP POLICY IF EXISTS "Employees can update own basic info" ON employees;
DROP POLICY IF EXISTS "Admins can delete employees" ON employees;
DROP POLICY IF EXISTS "Admin can delete employees" ON employees;
DROP POLICY IF EXISTS "Users can view organization employees" ON employees;
DROP POLICY IF EXISTS "HR and Admin can manage organization employees" ON employees;
DROP POLICY IF EXISTS "Super admins can view all employees" ON employees;

-- ============================================================================
-- CREATE NEW ORGANIZATION-SCOPED POLICIES
-- ============================================================================

-- Policy 1: Users can view employees in their organization(s)
CREATE POLICY "org_scoped_users_view_employees"
  ON employees FOR SELECT
  TO authenticated
  USING (
    -- User can see employees in organizations they are a member of
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Policy 2: Super admins can view all employees across all organizations
CREATE POLICY "org_scoped_super_admin_view_all"
  ON employees FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Policy 3: Employees can view their own record
CREATE POLICY "org_scoped_employee_view_own"
  ON employees FOR SELECT
  TO authenticated
  USING (
    id = get_auth_employee_id()
  );

-- Policy 4: HR and Admins can create employees in their organization
CREATE POLICY "org_scoped_hr_admin_create"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = employees.organization_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'hr')
        AND is_active = true
    )
  );

-- Policy 5: HR and Admins can update employees in their organization
CREATE POLICY "org_scoped_hr_admin_update"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = employees.organization_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'hr')
        AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = employees.organization_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'hr')
        AND is_active = true
    )
  );

-- Policy 6: Employees can update their own basic info
CREATE POLICY "org_scoped_employee_update_own"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    id = get_auth_employee_id()
  )
  WITH CHECK (
    id = get_auth_employee_id()
  );

-- Policy 7: Admins can delete employees in their organization
CREATE POLICY "org_scoped_admin_delete"
  ON employees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = employees.organization_id
        AND user_id = auth.uid()
        AND role = 'admin'
        AND is_active = true
    )
  );

-- Policy 8: Super admins can manage all employees
CREATE POLICY "org_scoped_super_admin_manage_all"
  ON employees FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================================================
-- VERIFY POLICIES
-- ============================================================================

-- Add comment for documentation
COMMENT ON TABLE employees IS 'Employee records with organization-scoped RLS policies. Users can only view/manage employees within their organization(s).';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Employee RLS policies updated successfully. Organization isolation is now enforced.';
END $$;
