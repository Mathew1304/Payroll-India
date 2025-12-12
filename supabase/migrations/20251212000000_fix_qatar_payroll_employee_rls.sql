/*
  # Fix Qatar Payroll Records RLS for Employee Visibility
  
  ## Problem
  Employees cannot view their payslips in the employee portal because the RLS policy
  for `qatar_payroll_records` uses `user_profiles.employee_id` which was cleared
  during the admin separation migration.
  
  ## Solution
  Update the "Employees can view own payroll records" policy to use the 
  `get_auth_employee_id()` helper function which correctly retrieves employee_id
  from `organization_members` table.
*/

-- Drop and recreate the employee view policy for qatar_payroll_records
DROP POLICY IF EXISTS "Employees can view own payroll records" ON qatar_payroll_records;

CREATE POLICY "Employees can view own payroll records"
  ON qatar_payroll_records FOR SELECT
  TO authenticated
  USING (
    employee_id = get_auth_employee_id()
  );

-- Also update other Qatar payroll table policies to use the helper function

-- Qatar Salary Components
DROP POLICY IF EXISTS "Employees can view own salary components" ON qatar_salary_components;

CREATE POLICY "Employees can view own salary components"
  ON qatar_salary_components FOR SELECT
  TO authenticated
  USING (
    employee_id = get_auth_employee_id()
  );

-- Qatar Overtime Records  
DROP POLICY IF EXISTS "Employees can view own OT records" ON qatar_overtime_records;

CREATE POLICY "Employees can view own OT records"
  ON qatar_overtime_records FOR SELECT
  TO authenticated
  USING (
    employee_id = get_auth_employee_id()
  );

DROP POLICY IF EXISTS "Employees can create OT records" ON qatar_overtime_records;

CREATE POLICY "Employees can create OT records"
  ON qatar_overtime_records FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = get_auth_employee_id()
  );

-- Qatar EOS Calculations
DROP POLICY IF EXISTS "Employees can view own EOS" ON qatar_eos_calculations;

CREATE POLICY "Employees can view own EOS"
  ON qatar_eos_calculations FOR SELECT
  TO authenticated
  USING (
    employee_id = get_auth_employee_id()
  );

-- Qatar Monthly Attendance
DROP POLICY IF EXISTS "Employees can view own attendance" ON qatar_monthly_attendance;

CREATE POLICY "Employees can view own attendance"
  ON qatar_monthly_attendance FOR SELECT
  TO authenticated
  USING (
    employee_id = get_auth_employee_id()
  );

-- Qatar Employee Loans
DROP POLICY IF EXISTS "Employees can view own loans" ON qatar_employee_loans;

CREATE POLICY "Employees can view own loans"
  ON qatar_employee_loans FOR SELECT
  TO authenticated
  USING (
    employee_id = get_auth_employee_id()
  );

-- Qatar Employee Advances
DROP POLICY IF EXISTS "Employees can view own advances" ON qatar_employee_advances;

CREATE POLICY "Employees can view own advances"
  ON qatar_employee_advances FOR SELECT
  TO authenticated
  USING (
    employee_id = get_auth_employee_id()
  );

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Qatar payroll RLS policies updated successfully. Employees can now view their payslips.';
END $$;
