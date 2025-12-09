/*
  # Fix All Missing Columns and Policies (Final Consolidation)
  
  ## Problem
  1. `organization_id` might be missing from `leave_applications`, `attendance_records`, etc. if previous migrations were skipped.
  2. "Employees can view own..." policies were missed in the previous RLS fix and still rely on `user_profiles` subqueries, which creates risk and inconsistency.
  
  ## Solution
  1. Idempotently add `organization_id` to all relevant tables.
  2. Backfill `organization_id`.
  3. Replace ALL "Employees can view own X" policies with `get_auth_employee_id()`.
*/

-- 1. Ensure organization_id exists (Idempotent)
DO $$
BEGIN
  -- Leave Applications
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_applications' AND column_name = 'organization_id') THEN
    ALTER TABLE leave_applications ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Attendance Records
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'organization_id') THEN
    ALTER TABLE attendance_records ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  
  -- Reimbursements
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reimbursements' AND column_name = 'organization_id') THEN
    ALTER TABLE reimbursements ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
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

-- 2. Backfill organization_id
DO $$
BEGIN
  UPDATE leave_applications la SET organization_id = e.organization_id FROM employees e WHERE la.employee_id = e.id AND la.organization_id IS NULL;
  UPDATE attendance_records ar SET organization_id = e.organization_id FROM employees e WHERE ar.employee_id = e.id AND ar.organization_id IS NULL;
  UPDATE reimbursements r SET organization_id = e.organization_id FROM employees e WHERE r.employee_id = e.id AND r.organization_id IS NULL;
  UPDATE payslips p SET organization_id = e.organization_id FROM employees e WHERE p.employee_id = e.id AND p.organization_id IS NULL;
  UPDATE documents d SET organization_id = e.organization_id FROM employees e WHERE d.employee_id = e.id AND d.organization_id IS NULL;
END $$;

-- 3. Standardize "Employees can view own..." policies
-- Use get_auth_employee_id() everywhere to remove dependency on user_profiles join/subquery

-- Leave Applications
DROP POLICY IF EXISTS "Employees can view own applications" ON leave_applications;
CREATE POLICY "Employees can view own applications"
  ON leave_applications FOR SELECT
  TO authenticated
  USING (
    employee_id = get_auth_employee_id()
  );

DROP POLICY IF EXISTS "Employees can create own applications" ON leave_applications;
CREATE POLICY "Employees can create own applications"
  ON leave_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = get_auth_employee_id()
  );

-- Leave Balances
DROP POLICY IF EXISTS "Employees can view own leave balance" ON leave_balances;
CREATE POLICY "Employees can view own leave balance"
  ON leave_balances FOR SELECT
  TO authenticated
  USING (
    employee_id = get_auth_employee_id()
  );

-- Attendance Records (Already done in 200000, but ensuring no legacy policy remains)
DROP POLICY IF EXISTS "Employees can view own attendance" ON attendance_records;
CREATE POLICY "Employees can view own attendance"
  ON attendance_records FOR SELECT
  TO authenticated
  USING (
    employee_id = get_auth_employee_id()
  );

-- Reimbursements
DROP POLICY IF EXISTS "Employees can view own reimbursements" ON reimbursements;
CREATE POLICY "Employees can view own reimbursements"
  ON reimbursements FOR SELECT
  TO authenticated
  USING (
    employee_id = get_auth_employee_id()
  );

DROP POLICY IF EXISTS "Employees can request reimbursements" ON reimbursements;
CREATE POLICY "Employees can request reimbursements"
  ON reimbursements FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = get_auth_employee_id()
  );

-- Payslips
DROP POLICY IF EXISTS "Employees can view own payslips" ON payslips;
CREATE POLICY "Employees can view own payslips"
  ON payslips FOR SELECT
  TO authenticated
  USING (
    employee_id = get_auth_employee_id()
  );

-- Documents
DROP POLICY IF EXISTS "Employees can view own documents" ON documents;
CREATE POLICY "Employees can view own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    employee_id = get_auth_employee_id()
  );

DROP POLICY IF EXISTS "Employees can upload own documents" ON documents;
CREATE POLICY "Employees can upload own documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = get_auth_employee_id()
  );
