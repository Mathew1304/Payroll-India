/*
  # Final Recursive RLS Fix (Absolute)
  
  ## Problem
  The previous attempts to fix RLS recursion on `employees` were likely ignored because 
  they were made to an already-applied migration file (`20251208183000`). 
  Supabase CLI does not re-run modified migrations.
  
  ## Solution
  This new migration explicitly drops and recreates ALL policies for `employees` and 
  other affected tables (`tasks`, `attendance_records`, `leave_applications`, etc.) 
  to ensure the non-recursive logic is safely applied.
*/

-- 1. Ensure Safe Helper Functions Exist (Security Definer)
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM user_profiles WHERE user_id = auth.uid();
  RETURN user_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_employee_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp_id uuid;
BEGIN
  SELECT employee_id INTO emp_id FROM user_profiles WHERE user_id = auth.uid();
  RETURN emp_id;
END;
$$;

-- ============================================================================
-- EMPLOYEES RLS (The Core Issue)
-- ============================================================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Drop ALL known potential policies to clear the slate
DROP POLICY IF EXISTS "Employees can view own record" ON employees;
DROP POLICY IF EXISTS "Managers can view team members" ON employees;
DROP POLICY IF EXISTS "HR and Admins can view all employees" ON employees;
DROP POLICY IF EXISTS "HR and Admins can create employees" ON employees;
DROP POLICY IF EXISTS "HR and Admins can update employees" ON employees;
DROP POLICY IF EXISTS "Employees can update own basic info" ON employees;
DROP POLICY IF EXISTS "Admins can delete employees" ON employees;
-- Drop potential legacy policies from other migrations
DROP POLICY IF EXISTS "Users can view organization employees" ON employees; 
DROP POLICY IF EXISTS "HR and Admin can view all employees" ON employees;

-- Recreate Safe Policies
CREATE POLICY "Employees can view own record"
  ON employees FOR SELECT
  TO authenticated
  USING (
    id = get_auth_employee_id()
  );

CREATE POLICY "Managers can view team members"
  ON employees FOR SELECT
  TO authenticated
  USING (
    -- Non-recursive check using helper function
    get_auth_user_role() = 'manager' AND
    reporting_manager_id = get_auth_employee_id()
  );

CREATE POLICY "HR and Admins can view all employees"
  ON employees FOR SELECT
  TO authenticated
  USING (
    get_auth_user_role() IN ('admin', 'hr', 'finance')
  );

CREATE POLICY "HR and Admins can create employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    get_auth_user_role() IN ('admin', 'hr')
  );

CREATE POLICY "HR and Admins can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    get_auth_user_role() IN ('admin', 'hr')
  );

CREATE POLICY "Employees can update own basic info"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    id = get_auth_employee_id()
  );

CREATE POLICY "Admins can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (
    get_auth_user_role() = 'admin'
  );


-- ============================================================================
-- ATTENDANCE RECORDS RLS
-- ============================================================================
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers can view team attendance" ON attendance_records;
DROP POLICY IF EXISTS "Employees can view own attendance" ON attendance_records;
DROP POLICY IF EXISTS "HR and Admins can view all attendance" ON attendance_records;

CREATE POLICY "Employees can view own attendance"
  ON attendance_records FOR SELECT
  TO authenticated
  USING (
    employee_id = get_auth_employee_id()
  );

CREATE POLICY "Managers can view team attendance"
  ON attendance_records FOR SELECT
  TO authenticated
  USING (
    get_auth_user_role() IN ('manager') AND
    EXISTS (
       SELECT 1 FROM employees e 
       WHERE e.id = attendance_records.employee_id 
       AND e.reporting_manager_id = get_auth_employee_id()
    )
  );

CREATE POLICY "HR and Admins can view all attendance"
  ON attendance_records FOR SELECT
  TO authenticated
  USING (
    get_auth_user_role() IN ('admin', 'hr', 'finance')
  );


-- ============================================================================
-- TASKS RLS
-- ============================================================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all tasks" ON tasks;
DROP POLICY IF EXISTS "Employees can view their assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Employees can update their assigned tasks" ON tasks;

CREATE POLICY "Admins can manage all tasks"
  ON tasks FOR ALL
  TO authenticated
  USING (
    get_auth_user_role() IN ('admin', 'hr', 'manager')
  );

CREATE POLICY "Employees can view their assigned tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    assigned_to = get_auth_employee_id() OR created_by = auth.uid()
  );

CREATE POLICY "Employees can update their assigned tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    assigned_to = get_auth_employee_id()
  )
  WITH CHECK (
    assigned_to = get_auth_employee_id()
  );


-- ============================================================================
-- LEAVE APPLICATIONS RLS
-- ============================================================================
ALTER TABLE leave_applications ENABLE ROW LEVEL SECURITY;
-- Drop commonly used policies
DROP POLICY IF EXISTS "Managers can view team applications" ON leave_applications;
DROP POLICY IF EXISTS "HR and Admins can view all applications" ON leave_applications;

CREATE POLICY "Managers can view team applications"
  ON leave_applications FOR SELECT
  TO authenticated
  USING (
    get_auth_user_role() IN ('manager') AND
    EXISTS (
       SELECT 1 FROM employees e 
       WHERE e.id = leave_applications.employee_id 
       AND e.reporting_manager_id = get_auth_employee_id()
    )
  );

CREATE POLICY "HR and Admins can view all applications"
  ON leave_applications FOR SELECT
  TO authenticated
  USING (
    get_auth_user_role() IN ('admin', 'hr', 'finance')
  );


-- ============================================================================
-- REIMBURSEMENTS & EXPENSE CLAIMS RLS
-- ============================================================================
ALTER TABLE reimbursements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Finance and HR can view all reimbursements" ON reimbursements;

CREATE POLICY "Finance and HR can view all reimbursements"
  ON reimbursements FOR SELECT
  TO authenticated
  USING (
    get_auth_user_role() IN ('admin', 'hr', 'finance')
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expense_claims') THEN
    EXECUTE 'ALTER TABLE expense_claims ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Admins view expense_claims" ON expense_claims';
    EXECUTE 'CREATE POLICY "Admins view expense_claims" ON expense_claims FOR SELECT TO authenticated USING (get_auth_user_role() IN (''admin'', ''hr'', ''finance''))';
  END IF;
END $$;
