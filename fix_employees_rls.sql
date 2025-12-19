-- Fix: Add RLS policy for employees table to allow admins to view employees in their org
-- This is critical for the leave applications admin view which joins with employees

-- Enable RLS on employees if not already enabled
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "employees_org_view" ON employees;
DROP POLICY IF EXISTS "employees_admins_manage" ON employees;

-- Policy 1: Admins can view all employees in their organization
CREATE POLICY "employees_org_view"
  ON employees FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy 2: Admins can manage employees in their organization
CREATE POLICY "employees_admins_manage"
  ON employees FOR ALL
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
