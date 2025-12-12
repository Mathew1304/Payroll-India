-- Add RLS policies for attendance_records
-- Employees can view and create their own attendance records
-- HR/Admin can view all attendance records in their organization

-- Enable RLS
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Employees view own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Employees create own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Employees update own attendance" ON attendance_records;
DROP POLICY IF EXISTS "HR view org attendance" ON attendance_records;
DROP POLICY IF EXISTS "Users can view their own attendance records" ON attendance_records;
DROP POLICY IF EXISTS "Users can insert their own attendance records" ON attendance_records;
DROP POLICY IF EXISTS "Employees can view their own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Employees can insert their own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Employees can update their own attendance" ON attendance_records;

-- Employees can view their own attendance records
CREATE POLICY "Employees view own attendance" ON attendance_records FOR SELECT TO authenticated USING (
  employee_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid())
);

-- Employees can create their own attendance records
CREATE POLICY "Employees create own attendance" ON attendance_records FOR INSERT TO authenticated WITH CHECK (
  employee_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid())
);

-- Employees can update their own attendance records (for check-out)
CREATE POLICY "Employees update own attendance" ON attendance_records FOR UPDATE TO authenticated USING (
  employee_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid())
);

-- HR/Admin can view all attendance records in their organization
CREATE POLICY "HR view org attendance" ON attendance_records FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid() 
      AND om.organization_id = attendance_records.organization_id
      AND om.role IN ('hr', 'admin', 'manager')
  )
);
