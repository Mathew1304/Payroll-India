-- ============================================================
-- COMPREHENSIVE RLS FIX FOR EMPLOYEES AND PAYROLL TABLES
-- This script fixes Row-Level Security policies to allow proper
-- INSERT, UPDATE, and DELETE operations for admins
-- ============================================================

-- ============================================================
-- PART 1: FIX EMPLOYEES TABLE RLS POLICIES
-- ============================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "employees_org_view" ON employees;
DROP POLICY IF EXISTS "employees_admins_manage" ON employees;
DROP POLICY IF EXISTS "employees_org_members_can_view" ON employees;
DROP POLICY IF EXISTS "employees_admins_can_manage" ON employees;
DROP POLICY IF EXISTS "employees_select_policy" ON employees;
DROP POLICY IF EXISTS "employees_insert_policy" ON employees;
DROP POLICY IF EXISTS "employees_update_policy" ON employees;
DROP POLICY IF EXISTS "employees_delete_policy" ON employees;

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

-- ============================================================
-- PART 2: FIX INDIA_PAYROLL_RECORDS TABLE RLS POLICIES
-- ============================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "india_payroll_employees_view_own" ON india_payroll_records;
DROP POLICY IF EXISTS "india_payroll_admins_manage" ON india_payroll_records;
DROP POLICY IF EXISTS "india_payroll_select_own" ON india_payroll_records;
DROP POLICY IF EXISTS "india_payroll_select_all" ON india_payroll_records;
DROP POLICY IF EXISTS "india_payroll_insert_policy" ON india_payroll_records;
DROP POLICY IF EXISTS "india_payroll_update_policy" ON india_payroll_records;
DROP POLICY IF EXISTS "india_payroll_delete_policy" ON india_payroll_records;

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

-- ============================================================
-- VERIFICATION QUERIES (Run these after applying the fix)
-- ============================================================

-- Check current policies on employees table
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'employees';

-- Check current policies on india_payroll_records table
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'india_payroll_records';
