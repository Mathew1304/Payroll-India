-- Clean up all attendance RLS policies and create fresh ones
-- Drop ALL existing policies
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

-- Create simple, working policies
-- Employees can SELECT their own records
CREATE POLICY "employee_select_own" ON attendance_records
  FOR SELECT TO authenticated
  USING (
    employee_id = (
      SELECT employee_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      LIMIT 1
    )
  );

-- Employees can INSERT their own records
CREATE POLICY "employee_insert_own" ON attendance_records
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = (
      SELECT employee_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      LIMIT 1
    )
  );

-- Employees can UPDATE their own records (for check-out)
CREATE POLICY "employee_update_own" ON attendance_records
  FOR UPDATE TO authenticated
  USING (
    employee_id = (
      SELECT employee_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      LIMIT 1
    )
  );

-- HR/Admin can SELECT all records in their org
CREATE POLICY "admin_select_org" ON attendance_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_id = attendance_records.organization_id
        AND om.role IN ('hr', 'admin', 'manager')
    )
  );
