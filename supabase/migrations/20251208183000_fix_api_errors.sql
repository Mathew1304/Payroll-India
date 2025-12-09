/*
  # Fix API Errors and RLS (Revised V3)

  ## Problem
  1. `attendance_records` etc. missing `organization_id`.
  2. Recursive RLS on `employees` (specifically "Managers can view team members" querying `employees` table).
  3. `expense_claims` table vs view conflict.

  ## Solution
  1. Safe helper function `get_auth_employee_id()` to avoid `user_profiles` joins.
  2. Rewrite `employees` policies to be non-recursive.
  3. Add missing `organization_id` columns.
*/

-- 1. Helper Function: Get Current User's Employee ID
CREATE OR REPLACE FUNCTION public.get_auth_employee_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp_id uuid;
BEGIN
  SELECT employee_id INTO emp_id
  FROM user_profiles
  WHERE user_id = auth.uid();
  RETURN emp_id;
END;
$$;

-- 2. Add missing organization_id columns
DO $$
BEGIN
  -- Attendance Records
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'organization_id') THEN
    ALTER TABLE attendance_records ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Leave Applications
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_applications' AND column_name = 'organization_id') THEN
    ALTER TABLE leave_applications ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Reimbursements
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reimbursements' AND column_name = 'organization_id') THEN
    ALTER TABLE reimbursements ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Expense Claims (if table)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expense_claims') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_claims' AND column_name = 'organization_id') THEN
        ALTER TABLE expense_claims ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- Payslips
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payslips' AND column_name = 'organization_id') THEN
    ALTER TABLE payslips ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  
  -- Documents
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'organization_id') THEN
    ALTER TABLE documents ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Backfill Organization ID
DO $$
BEGIN
  UPDATE attendance_records ar SET organization_id = e.organization_id FROM employees e WHERE ar.employee_id = e.id AND ar.organization_id IS NULL;
  UPDATE leave_applications la SET organization_id = e.organization_id FROM employees e WHERE la.employee_id = e.id AND la.organization_id IS NULL;
  UPDATE reimbursements r SET organization_id = e.organization_id FROM employees e WHERE r.employee_id = e.id AND r.organization_id IS NULL;
  UPDATE payslips p SET organization_id = e.organization_id FROM employees e WHERE p.employee_id = e.id AND p.organization_id IS NULL;
  UPDATE documents d SET organization_id = e.organization_id FROM employees e WHERE d.employee_id = e.id AND d.organization_id IS NULL;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expense_claims') THEN
    EXECUTE 'UPDATE expense_claims ec SET organization_id = e.organization_id FROM employees e WHERE ec.employee_id = e.id AND ec.organization_id IS NULL';
  END IF;
END $$;

-- 4. Fix Employees RLS (Non-recursive)
-- We drop and recreate ALL policies to ensure no old recursive ones remain.

DROP POLICY IF EXISTS "Employees can view own record" ON employees;
CREATE POLICY "Employees can view own record"
  ON employees FOR SELECT
  TO authenticated
  USING (
    id = get_auth_employee_id()
  );

DROP POLICY IF EXISTS "Managers can view team members" ON employees;
CREATE POLICY "Managers can view team members"
  ON employees FOR SELECT
  TO authenticated
  USING (
    -- Direct check using helper function, avoiding recursive join on employees table
    get_auth_user_role() = 'manager' AND
    reporting_manager_id = get_auth_employee_id()
  );

DROP POLICY IF EXISTS "HR and Admins can view all employees" ON employees;
CREATE POLICY "HR and Admins can view all employees"
  ON employees FOR SELECT
  TO authenticated
  USING (
    get_auth_user_role() IN ('admin', 'hr', 'finance')
  );

DROP POLICY IF EXISTS "HR and Admins can create employees" ON employees;
CREATE POLICY "HR and Admins can create employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    get_auth_user_role() IN ('admin', 'hr')
  );

DROP POLICY IF EXISTS "HR and Admins can update employees" ON employees;
CREATE POLICY "HR and Admins can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    get_auth_user_role() IN ('admin', 'hr')
  );

DROP POLICY IF EXISTS "Employees can update own basic info" ON employees;
CREATE POLICY "Employees can update own basic info"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    id = get_auth_employee_id()
  );

DROP POLICY IF EXISTS "Admins can delete employees" ON employees;
CREATE POLICY "Admins can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (
    get_auth_user_role() = 'admin'
  );

-- 5. Fix Attendance Records RLS (that might also rely on recursive employees)

DROP POLICY IF EXISTS "Managers can view team attendance" ON attendance_records;
CREATE POLICY "Managers can view team attendance"
  ON attendance_records FOR SELECT
  TO authenticated
  USING (
    get_auth_user_role() = 'manager' AND
    EXISTS (
       -- This query on employees is safe IF employees RLS is safe.
       -- But to be safer, we can match reporting_manager directly if we joined.
       -- Ideally we trust employees RLS now.
       SELECT 1 FROM employees e 
       WHERE e.id = attendance_records.employee_id 
       AND e.reporting_manager_id = get_auth_employee_id()
    )
  );


