-- Fix: RLS policies for employees table to allow proper INSERT operations
-- This resolves the "new row violates row-level security policy for table employees" error

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "employees_org_view" ON employees;
DROP POLICY IF EXISTS "employees_admins_manage" ON employees;
DROP POLICY IF EXISTS "employees_org_members_can_view" ON employees;
DROP POLICY IF EXISTS "employees_admins_can_manage" ON employees;

-- Policy 1: Allow SELECT for all authenticated users in the same organization
CREATE POLICY "employees_select_policy"
  ON employees FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy 2: Allow INSERT for admins and HR managers
CREATE POLICY "employees_insert_policy"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND organization_id = employees.organization_id
      AND role IN ('admin', 'hr_manager', 'super_admin', 'owner')
    )
  );

-- Policy 3: Allow UPDATE for admins and HR managers
CREATE POLICY "employees_update_policy"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND organization_id = employees.organization_id
      AND role IN ('admin', 'hr_manager', 'super_admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND organization_id = employees.organization_id
      AND role IN ('admin', 'hr_manager', 'super_admin', 'owner')
    )
  );

-- Policy 4: Allow DELETE for admins only
CREATE POLICY "employees_delete_policy"
  ON employees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND organization_id = employees.organization_id
      AND role IN ('admin', 'super_admin', 'owner')
    )
  );

-- Ensure RLS is enabled
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
