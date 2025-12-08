/*
  # Comprehensive RLS Policies for LogHR HRMS (Corrected)
  
  This migration creates complete Row Level Security (RLS) policies for all existing tables
  to ensure proper data isolation and access control based on user roles.
  
  ## Security Model:
  - admin: Full access to all organization data
  - hr: Can manage employees, leaves, attendance, documents
  - finance: Can manage payroll, salary components, expenses, reimbursements
  - manager: Can view/manage team members and their attendance/leave
  - employee: Can view own data, apply leaves, view payslips
*/

-- ============================================================================
-- USER PROFILES & AUTHENTICATION
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage profiles" ON user_profiles;
CREATE POLICY "Admins can manage profiles"
  ON user_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- DEPARTMENTS
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view departments" ON departments;
CREATE POLICY "Authenticated users can view departments"
  ON departments FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "HR and Admins can manage departments" ON departments;
CREATE POLICY "HR and Admins can manage departments"
  ON departments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

-- ============================================================================
-- DESIGNATIONS
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view designations" ON designations;
CREATE POLICY "Authenticated users can view designations"
  ON designations FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "HR and Admins can manage designations" ON designations;
CREATE POLICY "HR and Admins can manage designations"
  ON designations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

-- ============================================================================
-- BRANCHES
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view branches" ON branches;
CREATE POLICY "Authenticated users can view branches"
  ON branches FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage branches" ON branches;
CREATE POLICY "Admins can manage branches"
  ON branches FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- EMPLOYEES
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view own record" ON employees;
CREATE POLICY "Employees can view own record"
  ON employees FOR SELECT
  TO authenticated
  USING (
    id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Managers can view team members" ON employees;
CREATE POLICY "Managers can view team members"
  ON employees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
        AND up.role = 'manager'
        AND employees.reporting_manager_id = e.id
    )
  );

DROP POLICY IF EXISTS "HR and Admins can view all employees" ON employees;
CREATE POLICY "HR and Admins can view all employees"
  ON employees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

DROP POLICY IF EXISTS "HR and Admins can create employees" ON employees;
CREATE POLICY "HR and Admins can create employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

DROP POLICY IF EXISTS "HR and Admins can update employees" ON employees;
CREATE POLICY "HR and Admins can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

DROP POLICY IF EXISTS "Employees can update own basic info" ON employees;
CREATE POLICY "Employees can update own basic info"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can delete employees" ON employees;
CREATE POLICY "Admins can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- SHIFTS
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view shifts" ON shifts;
CREATE POLICY "Authenticated users can view shifts"
  ON shifts FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "HR and Admins can manage shifts" ON shifts;
CREATE POLICY "HR and Admins can manage shifts"
  ON shifts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

-- ============================================================================
-- ATTENDANCE RECORDS
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view own attendance" ON attendance_records;
CREATE POLICY "Employees can view own attendance"
  ON attendance_records FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Managers can view team attendance" ON attendance_records;
CREATE POLICY "Managers can view team attendance"
  ON attendance_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
        AND up.role = 'manager'
        AND attendance_records.employee_id = e.id
    )
  );

DROP POLICY IF EXISTS "HR and Admins can view all attendance" ON attendance_records;
CREATE POLICY "HR and Admins can view all attendance"
  ON attendance_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'manager')
    )
  );

DROP POLICY IF EXISTS "Employees can create own attendance" ON attendance_records;
CREATE POLICY "Employees can create own attendance"
  ON attendance_records FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "HR and Admins can manage attendance" ON attendance_records;
CREATE POLICY "HR and Admins can manage attendance"
  ON attendance_records FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

-- ============================================================================
-- ATTENDANCE CORRECTIONS
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view own corrections" ON attendance_corrections;
CREATE POLICY "Employees can view own corrections"
  ON attendance_corrections FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "HR and Admins can view all corrections" ON attendance_corrections;
CREATE POLICY "HR and Admins can view all corrections"
  ON attendance_corrections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

DROP POLICY IF EXISTS "Employees can request corrections" ON attendance_corrections;
CREATE POLICY "Employees can request corrections"
  ON attendance_corrections FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "HR and Admins can manage corrections" ON attendance_corrections;
CREATE POLICY "HR and Admins can manage corrections"
  ON attendance_corrections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

-- ============================================================================
-- LEAVE TYPES & POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view leave types" ON leave_types;
CREATE POLICY "Authenticated users can view leave types"
  ON leave_types FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "HR and Admins can manage leave types" ON leave_types;
CREATE POLICY "HR and Admins can manage leave types"
  ON leave_types FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view leave policies" ON leave_policies;
CREATE POLICY "Authenticated users can view leave policies"
  ON leave_policies FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "HR and Admins can manage leave policies" ON leave_policies;
CREATE POLICY "HR and Admins can manage leave policies"
  ON leave_policies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

-- ============================================================================
-- LEAVE BALANCES
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view own leave balance" ON leave_balances;
CREATE POLICY "Employees can view own leave balance"
  ON leave_balances FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Managers can view team leave balance" ON leave_balances;
CREATE POLICY "Managers can view team leave balance"
  ON leave_balances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
        AND up.role = 'manager'
        AND leave_balances.employee_id = e.id
    )
  );

DROP POLICY IF EXISTS "HR and Admins can view all leave balances" ON leave_balances;
CREATE POLICY "HR and Admins can view all leave balances"
  ON leave_balances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

DROP POLICY IF EXISTS "HR and Admins can manage leave balances" ON leave_balances;
CREATE POLICY "HR and Admins can manage leave balances"
  ON leave_balances FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

-- ============================================================================
-- LEAVE APPLICATIONS
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view own applications" ON leave_applications;
CREATE POLICY "Employees can view own applications"
  ON leave_applications FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Managers can view team applications" ON leave_applications;
CREATE POLICY "Managers can view team applications"
  ON leave_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
        AND up.role = 'manager'
        AND leave_applications.employee_id = e.id
    )
  );

DROP POLICY IF EXISTS "HR and Admins can view all applications" ON leave_applications;
CREATE POLICY "HR and Admins can view all applications"
  ON leave_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

DROP POLICY IF EXISTS "Employees can create own applications" ON leave_applications;
CREATE POLICY "Employees can create own applications"
  ON leave_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Employees can cancel own applications" ON leave_applications;
CREATE POLICY "Employees can cancel own applications"
  ON leave_applications FOR UPDATE
  TO authenticated
  USING (
    employee_id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "Managers can approve team applications" ON leave_applications;
CREATE POLICY "Managers can approve team applications"
  ON leave_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
        AND up.role = 'manager'
        AND leave_applications.employee_id = e.id
    )
  );

DROP POLICY IF EXISTS "HR and Admins can manage applications" ON leave_applications;
CREATE POLICY "HR and Admins can manage applications"
  ON leave_applications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

-- ============================================================================
-- HOLIDAYS
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view holidays" ON holidays;
CREATE POLICY "Authenticated users can view holidays"
  ON holidays FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage holidays" ON holidays;
CREATE POLICY "Admins can manage holidays"
  ON holidays FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- SALARY COMPONENTS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view salary components" ON salary_components;
CREATE POLICY "Users can view salary components"
  ON salary_components FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Finance and HR can manage salary components" ON salary_components;
CREATE POLICY "Finance and HR can manage salary components"
  ON salary_components FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

-- ============================================================================
-- SALARY STRUCTURES
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view own salary structure" ON salary_structures;
CREATE POLICY "Employees can view own salary structure"
  ON salary_structures FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Finance and HR can view all structures" ON salary_structures;
CREATE POLICY "Finance and HR can view all structures"
  ON salary_structures FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

DROP POLICY IF EXISTS "Finance and HR can manage structures" ON salary_structures;
CREATE POLICY "Finance and HR can manage structures"
  ON salary_structures FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

-- ============================================================================
-- PAYROLL CYCLES
-- ============================================================================

DROP POLICY IF EXISTS "Finance and HR can view payroll cycles" ON payroll_cycles;
CREATE POLICY "Finance and HR can view payroll cycles"
  ON payroll_cycles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

DROP POLICY IF EXISTS "Finance and HR can manage payroll cycles" ON payroll_cycles;
CREATE POLICY "Finance and HR can manage payroll cycles"
  ON payroll_cycles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

-- ============================================================================
-- PAYSLIPS
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view own payslips" ON payslips;
CREATE POLICY "Employees can view own payslips"
  ON payslips FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Finance and HR can view all payslips" ON payslips;
CREATE POLICY "Finance and HR can view all payslips"
  ON payslips FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

DROP POLICY IF EXISTS "Finance and HR can manage payslips" ON payslips;
CREATE POLICY "Finance and HR can manage payslips"
  ON payslips FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

-- ============================================================================
-- SALARY REVISIONS
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view own revisions" ON salary_revisions;
CREATE POLICY "Employees can view own revisions"
  ON salary_revisions FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Finance and HR can view all revisions" ON salary_revisions;
CREATE POLICY "Finance and HR can view all revisions"
  ON salary_revisions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

DROP POLICY IF EXISTS "Finance and HR can manage revisions" ON salary_revisions;
CREATE POLICY "Finance and HR can manage revisions"
  ON salary_revisions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

-- ============================================================================
-- ADVANCES & LOANS
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view own advances" ON advances_loans;
CREATE POLICY "Employees can view own advances"
  ON advances_loans FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Employees can request advances" ON advances_loans;
CREATE POLICY "Employees can request advances"
  ON advances_loans FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Finance and HR can view all advances" ON advances_loans;
CREATE POLICY "Finance and HR can view all advances"
  ON advances_loans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

DROP POLICY IF EXISTS "Finance and HR can manage advances" ON advances_loans;
CREATE POLICY "Finance and HR can manage advances"
  ON advances_loans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

-- ============================================================================
-- REIMBURSEMENTS
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view own reimbursements" ON reimbursements;
CREATE POLICY "Employees can view own reimbursements"
  ON reimbursements FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Employees can request reimbursements" ON reimbursements;
CREATE POLICY "Employees can request reimbursements"
  ON reimbursements FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Finance and HR can view all reimbursements" ON reimbursements;
CREATE POLICY "Finance and HR can view all reimbursements"
  ON reimbursements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

DROP POLICY IF EXISTS "Finance and HR can manage reimbursements" ON reimbursements;
CREATE POLICY "Finance and HR can manage reimbursements"
  ON reimbursements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

-- ============================================================================
-- STATUTORY COMPLIANCE (PF, ESI, TDS, PT)
-- ============================================================================

DROP POLICY IF EXISTS "Finance and HR can view PF records" ON pf_records;
CREATE POLICY "Finance and HR can view PF records"
  ON pf_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

DROP POLICY IF EXISTS "Finance and HR can manage PF records" ON pf_records;
CREATE POLICY "Finance and HR can manage PF records"
  ON pf_records FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

DROP POLICY IF EXISTS "Finance and HR can view ESI records" ON esi_records;
CREATE POLICY "Finance and HR can view ESI records"
  ON esi_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

DROP POLICY IF EXISTS "Finance and HR can manage ESI records" ON esi_records;
CREATE POLICY "Finance and HR can manage ESI records"
  ON esi_records FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

DROP POLICY IF EXISTS "Finance and HR can view TDS records" ON tds_records;
CREATE POLICY "Finance and HR can view TDS records"
  ON tds_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

DROP POLICY IF EXISTS "Finance and HR can manage TDS records" ON tds_records;
CREATE POLICY "Finance and HR can manage TDS records"
  ON tds_records FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

DROP POLICY IF EXISTS "Finance and HR can view PT records" ON professional_tax;
CREATE POLICY "Finance and HR can view PT records"
  ON professional_tax FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

DROP POLICY IF EXISTS "Finance and HR can manage PT records" ON professional_tax;
CREATE POLICY "Finance and HR can manage PT records"
  ON professional_tax FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

-- ============================================================================
-- AUDIT LOGS & ANNOUNCEMENTS
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "All authenticated can view announcements" ON announcements;
CREATE POLICY "All authenticated can view announcements"
  ON announcements FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "HR and Admins can manage announcements" ON announcements;
CREATE POLICY "HR and Admins can manage announcements"
  ON announcements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

-- ============================================================================
-- DOCUMENTS
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view own documents" ON documents;
CREATE POLICY "Employees can view own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "HR and Admins can view all documents" ON documents;
CREATE POLICY "HR and Admins can view all documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

DROP POLICY IF EXISTS "Employees can upload own documents" ON documents;
CREATE POLICY "Employees can upload own documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "HR and Admins can manage documents" ON documents;
CREATE POLICY "HR and Admins can manage documents"
  ON documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

-- ============================================================================
-- COUNTRY-SPECIFIC PAYROLL TABLES (QATAR & SAUDI)
-- ============================================================================

DROP POLICY IF EXISTS "Finance and HR can view Qatar payroll" ON qatar_payroll_records;
CREATE POLICY "Finance and HR can view Qatar payroll"
  ON qatar_payroll_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

DROP POLICY IF EXISTS "Finance and HR can manage Qatar payroll" ON qatar_payroll_records;
CREATE POLICY "Finance and HR can manage Qatar payroll"
  ON qatar_payroll_records FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

DROP POLICY IF EXISTS "Finance and HR can view Saudi payroll" ON saudi_payroll_records;
CREATE POLICY "Finance and HR can view Saudi payroll"
  ON saudi_payroll_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

DROP POLICY IF EXISTS "Finance and HR can manage Saudi payroll" ON saudi_payroll_records;
CREATE POLICY "Finance and HR can manage Saudi payroll"
  ON saudi_payroll_records FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

DROP POLICY IF EXISTS "Finance and HR can view Qatar salary components" ON qatar_salary_components;
CREATE POLICY "Finance and HR can view Qatar salary components"
  ON qatar_salary_components FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

DROP POLICY IF EXISTS "Finance and HR can manage Qatar salary components" ON qatar_salary_components;
CREATE POLICY "Finance and HR can manage Qatar salary components"
  ON qatar_salary_components FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

DROP POLICY IF EXISTS "Finance and HR can view Saudi salary components" ON saudi_salary_components;
CREATE POLICY "Finance and HR can view Saudi salary components"
  ON saudi_salary_components FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

DROP POLICY IF EXISTS "Finance and HR can manage Saudi salary components" ON saudi_salary_components;
CREATE POLICY "Finance and HR can manage Saudi salary components"
  ON saudi_salary_components FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

-- ============================================================================
-- EMPLOYEE INVITATIONS
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view own invitations" ON employee_invitations;
CREATE POLICY "Employees can view own invitations"
  ON employee_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
        AND employee_invitations.employee_id = e.id
    )
  );

DROP POLICY IF EXISTS "HR can view all invitations" ON employee_invitations;
CREATE POLICY "HR can view all invitations"
  ON employee_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

DROP POLICY IF EXISTS "HR can create invitations" ON employee_invitations;
CREATE POLICY "HR can create invitations"
  ON employee_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

DROP POLICY IF EXISTS "HR can manage invitations" ON employee_invitations;
CREATE POLICY "HR can manage invitations"
  ON employee_invitations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

-- ============================================================================
-- EMPLOYEE PROFILE REQUESTS
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view own profile requests" ON employee_profile_requests;
CREATE POLICY "Employees can view own profile requests"
  ON employee_profile_requests FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "HR can view all profile requests" ON employee_profile_requests;
CREATE POLICY "HR can view all profile requests"
  ON employee_profile_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

DROP POLICY IF EXISTS "Employees can update own requests" ON employee_profile_requests;
CREATE POLICY "Employees can update own requests"
  ON employee_profile_requests FOR UPDATE
  TO authenticated
  USING (
    employee_id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "HR can manage profile requests" ON employee_profile_requests;
CREATE POLICY "HR can manage profile requests"
  ON employee_profile_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);
