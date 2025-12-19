-- Run this in Supabase SQL Editor to fix leave application RLS
-- This allows employees to create leave applications

-- First, enable RLS if not already enabled
ALTER TABLE leave_applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "leave_applications_employees_create" ON leave_applications;
DROP POLICY IF EXISTS "leave_applications_manage" ON leave_applications;
DROP POLICY IF EXISTS "leave_applications_view_own" ON leave_applications;

-- Policy 1: Allow employees to view their own applications and admins to view all
CREATE POLICY "leave_applications_view_own"
  ON leave_applications FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  );

-- Policy 2: Allow employees to create their own leave applications
CREATE POLICY "leave_applications_employees_create"
  ON leave_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    AND
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

-- Policy 3: Allow admins to manage all leave applications
CREATE POLICY "leave_applications_manage"
  ON leave_applications FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );
