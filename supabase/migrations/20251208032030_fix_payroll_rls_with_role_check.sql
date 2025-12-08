/*
  # Fix Payroll RLS Policies - Add Role-Based Access Control

  ## Problem
  The existing payroll RLS policies don't check user roles properly.
  They only verify organization membership but not admin/hr/finance permissions.

  ## Solution
  Drop and recreate policies with proper role checks using organization_members table.

  ## Tables Fixed
  - qatar_payroll_records
  - saudi_payroll_records

  ## Security
  - SELECT: All authenticated organization members can view
  - INSERT/UPDATE/DELETE: Only admin, hr, finance roles
*/

-- =====================================================
-- DROP EXISTING QATAR PAYROLL RECORDS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Employees can view own payroll records" ON qatar_payroll_records;
DROP POLICY IF EXISTS "HR can manage payroll records" ON qatar_payroll_records;

-- =====================================================
-- CREATE NEW QATAR PAYROLL RECORDS POLICIES
-- =====================================================
CREATE POLICY "Users can view payroll in their organization"
  ON qatar_payroll_records FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin/HR/Finance can insert payroll"
  ON qatar_payroll_records FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'hr', 'finance')
    )
  );

CREATE POLICY "Admin/HR/Finance can update payroll"
  ON qatar_payroll_records FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'hr', 'finance')
    )
  );

CREATE POLICY "Admin can delete payroll"
  ON qatar_payroll_records FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- =====================================================
-- DROP EXISTING SAUDI PAYROLL RECORDS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Employees can view own payroll records (Saudi)" ON saudi_payroll_records;
DROP POLICY IF EXISTS "HR can manage payroll records (Saudi)" ON saudi_payroll_records;

-- =====================================================
-- CREATE NEW SAUDI PAYROLL RECORDS POLICIES
-- =====================================================
CREATE POLICY "Users can view Saudi payroll in their organization"
  ON saudi_payroll_records FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin/HR/Finance can insert Saudi payroll"
  ON saudi_payroll_records FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'hr', 'finance')
    )
  );

CREATE POLICY "Admin/HR/Finance can update Saudi payroll"
  ON saudi_payroll_records FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'hr', 'finance')
    )
  );

CREATE POLICY "Admin can delete Saudi payroll"
  ON saudi_payroll_records FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
