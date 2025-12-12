-- Simple RLS policies that work with the actual schema
-- Drop all existing policies
DROP POLICY IF EXISTS "employee_select_own" ON attendance_records;
DROP POLICY IF EXISTS "employee_insert_own" ON attendance_records;
DROP POLICY IF EXISTS "employee_update_own" ON attendance_records;
DROP POLICY IF EXISTS "admin_select_org" ON attendance_records;
DROP POLICY IF EXISTS "Admins can manage attendance records" ON attendance_records;
DROP POLICY IF EXISTS "Admins can view all attendance records" ON attendance_records;
DROP POLICY IF EXISTS "Admins can view organization attendance" ON attendance_records;
DROP POLICY IF EXISTS "Employees can insert their own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Employees can update their own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Employees can view their own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Employees create own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Employees update own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Employees view own attendance" ON attendance_records;
DROP POLICY IF EXISTS "HR view org attendance" ON attendance_records;
DROP POLICY IF EXISTS "Users can view their own attendance records" ON attendance_records;
DROP POLICY IF EXISTS "Users can insert their own attendance records" ON attendance_records;

-- Create simple policies that allow all authenticated users
-- (We'll add proper organization filtering later)

-- Allow all authenticated users to SELECT their own records
CREATE POLICY "allow_select_own" ON attendance_records
  FOR SELECT TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE id IN (
        SELECT employee_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
    OR
    -- Fallback: if no organization_members record, check employees table directly
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- Allow all authenticated users to INSERT
CREATE POLICY "allow_insert_own" ON attendance_records
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE id IN (
        SELECT employee_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
    OR
    -- Fallback: if no organization_members record, check employees table directly
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- Allow all authenticated users to UPDATE their own
CREATE POLICY "allow_update_own" ON attendance_records
  FOR UPDATE TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE id IN (
        SELECT employee_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
    OR
    -- Fallback: if no organization_members record, check employees table directly
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );
