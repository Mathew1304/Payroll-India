/*
  # Fix Super Admin RLS for Employees and Payroll
  
  ## Overview
  This migration explicitly grants 'super_admin' access to:
  1. Employees (Full Access)
  2. Attendance Records (View All)
  3. Tasks (Manage All)
  4. Leave Applications (Manage All)
  5. Payroll Tables (Full Access) - covering Core, Qatar, and Saudi payroll systems.
*/

-- Helper function to check if user is super admin
-- We reuse get_auth_user_role() which is already defined and safe.

-- ============================================================================
-- 1. EMPLOYEES
-- ============================================================================
-- Allow Super Admins to view ALL employees regardless of organization
CREATE POLICY "Super admins can view all employees"
  ON employees FOR SELECT
  TO authenticated
  USING (
    get_auth_user_role() = 'super_admin'
  );

CREATE POLICY "Super admins can manage all employees"
  ON employees FOR ALL
  TO authenticated
  USING (
    get_auth_user_role() = 'super_admin'
  )
  WITH CHECK (
    get_auth_user_role() = 'super_admin'
  );

-- ============================================================================
-- 2. ATTENDANCE
-- ============================================================================
CREATE POLICY "Super admins can view all attendance"
  ON attendance_records FOR SELECT
  TO authenticated
  USING (
    get_auth_user_role() = 'super_admin'
  );

CREATE POLICY "Super admins can manage all attendance"
  ON attendance_records FOR ALL
  TO authenticated
  USING (
    get_auth_user_role() = 'super_admin'
  )
  WITH CHECK (
    get_auth_user_role() = 'super_admin'
  );

-- ============================================================================
-- 3. TASKS
-- ============================================================================
CREATE POLICY "Super admins can manage all tasks"
  ON tasks FOR ALL
  TO authenticated
  USING (
    get_auth_user_role() = 'super_admin'
  )
  WITH CHECK (
    get_auth_user_role() = 'super_admin'
  );

-- ============================================================================
-- 4. LEAVE APPLICATIONS
-- ============================================================================
CREATE POLICY "Super admins can manage all leave apps"
  ON leave_applications FOR ALL
  TO authenticated
  USING (
    get_auth_user_role() = 'super_admin'
  )
  WITH CHECK (
    get_auth_user_role() = 'super_admin'
  );

-- ============================================================================
-- 5. PAYROLL (New Features Tables)
-- ============================================================================
-- List of tables: 
-- payroll_validations, payroll_adjustments, employee_loans, 
-- advance_salary_requests, eosb_accruals, off_cycle_payroll, 
-- off_cycle_payroll_details, payroll_snapshots, payroll_audit_logs,
-- gl_export_batches, gl_export_entries

DO $$
DECLARE
  pkg_tables text[] := ARRAY[
    'payroll_validations', 
    'payroll_adjustments', 
    'employee_loans', 
    'advance_salary_requests', 
    'eosb_accruals', 
    'off_cycle_payroll', 
    'off_cycle_payroll_details', 
    'payroll_snapshots', 
    'payroll_audit_logs', 
    'gl_export_batches', 
    'gl_export_entries'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY pkg_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t) THEN
      EXECUTE format('
        DROP POLICY IF EXISTS "Super admins manage %I" ON %I;
        CREATE POLICY "Super admins manage %I"
          ON %I FOR ALL
          TO authenticated
          USING (get_auth_user_role() = ''super_admin'')
          WITH CHECK (get_auth_user_role() = ''super_admin'');
      ', t, t, t, t);
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 6. QATAR PAYROLL
-- ============================================================================
DO $$
DECLARE
  q_tables text[] := ARRAY[
    'qatar_salary_components',
    'qatar_payroll_records',
    'qatar_overtime_records',
    'qatar_eos_calculations',
    'qatar_wps_sif_files'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY q_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t) THEN
      EXECUTE format('
        DROP POLICY IF EXISTS "Super admins manage %I" ON %I;
        CREATE POLICY "Super admins manage %I"
          ON %I FOR ALL
          TO authenticated
          USING (get_auth_user_role() = ''super_admin'')
          WITH CHECK (get_auth_user_role() = ''super_admin'');
      ', t, t, t, t);
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 7. SAUDI PAYROLL (If exists)
-- ============================================================================
DO $$
DECLARE
  s_tables text[] := ARRAY[
    'saudi_salary_components',
    'saudi_payroll_records',
    'saudi_overtime_records',
    'saudi_eos_calculations'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY s_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t) THEN
      EXECUTE format('
        DROP POLICY IF EXISTS "Super admins manage %I" ON %I;
        CREATE POLICY "Super admins manage %I"
          ON %I FOR ALL
          TO authenticated
          USING (get_auth_user_role() = ''super_admin'')
          WITH CHECK (get_auth_user_role() = ''super_admin'');
      ', t, t, t, t);
    END IF;
  END LOOP;
END $$;
