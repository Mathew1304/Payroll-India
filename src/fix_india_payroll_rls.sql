-- Fix: RLS policies for india_payroll_records table to allow proper INSERT operations
-- This resolves the "new row violates row-level security policy for table india_payroll_records" error

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "india_payroll_employees_view_own" ON india_payroll_records;
DROP POLICY IF EXISTS "india_payroll_admins_manage" ON india_payroll_records;

-- Policy 1: Allow SELECT for employees to view their own records
CREATE POLICY "india_payroll_select_own"
  ON india_payroll_records FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy 2: Allow SELECT for admins to view all records in their organization
CREATE POLICY "india_payroll_select_all"
  ON india_payroll_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND organization_id = india_payroll_records.organization_id
      AND role IN ('admin', 'hr_manager', 'super_admin', 'owner')
    )
  );

-- Policy 3: Allow INSERT for admins and HR managers in their organization
CREATE POLICY "india_payroll_insert_policy"
  ON india_payroll_records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND organization_id = india_payroll_records.organization_id
      AND role IN ('admin', 'hr_manager', 'super_admin', 'owner')
    )
  );

-- Policy 4: Allow UPDATE for admins and HR managers in their organization
CREATE POLICY "india_payroll_update_policy"
  ON india_payroll_records FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND organization_id = india_payroll_records.organization_id
      AND role IN ('admin', 'hr_manager', 'super_admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND organization_id = india_payroll_records.organization_id
      AND role IN ('admin', 'hr_manager', 'super_admin', 'owner')
    )
  );

-- Policy 5: Allow DELETE for admins only in their organization
CREATE POLICY "india_payroll_delete_policy"
  ON india_payroll_records FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND organization_id = india_payroll_records.organization_id
      AND role IN ('admin', 'super_admin', 'owner')
    )
  );

-- Ensure RLS is enabled
ALTER TABLE india_payroll_records ENABLE ROW LEVEL SECURITY;
