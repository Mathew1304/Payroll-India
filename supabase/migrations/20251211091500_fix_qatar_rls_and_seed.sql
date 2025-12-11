-- Fix RLS Policies and Re-seed Qatar Salary Components
-- The previous RLS policies relied on the user being an employee, which might not be true for admins.
-- This script updates the policies to use organization_members and re-runs the seed.

-- 1. Update RLS Policies for qatar_salary_components
DROP POLICY IF EXISTS "HR can manage salary components" ON qatar_salary_components;
CREATE POLICY "HR can manage salary components"
  ON qatar_salary_components FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'hr', 'finance', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'hr', 'finance', 'super_admin')
    )
  );

-- 2. Update RLS Policies for qatar_payroll_records
DROP POLICY IF EXISTS "HR can manage payroll records" ON qatar_payroll_records;
CREATE POLICY "HR can manage payroll records"
  ON qatar_payroll_records FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'hr', 'finance', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'hr', 'finance', 'super_admin')
    )
  );

-- 3. Update RLS Policies for qatar_overtime_records
DROP POLICY IF EXISTS "HR can manage OT records" ON qatar_overtime_records;
CREATE POLICY "HR can manage OT records"
  ON qatar_overtime_records FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'hr', 'finance', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'hr', 'finance', 'super_admin')
    )
  );

-- 4. Update RLS Policies for qatar_eos_calculations
DROP POLICY IF EXISTS "HR can manage EOS calculations" ON qatar_eos_calculations;
CREATE POLICY "HR can manage EOS calculations"
  ON qatar_eos_calculations FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'hr', 'finance', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'hr', 'finance', 'super_admin')
    )
  );

-- 5. Update RLS Policies for qatar_wps_sif_files
DROP POLICY IF EXISTS "HR can manage WPS files" ON qatar_wps_sif_files;
CREATE POLICY "HR can manage WPS files"
  ON qatar_wps_sif_files FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'hr', 'finance', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'hr', 'finance', 'super_admin')
    )
  );

-- 6. Re-seed data (Idempotent)
INSERT INTO qatar_salary_components (
  organization_id,
  employee_id,
  basic_salary,
  housing_allowance,
  food_allowance,
  transport_allowance,
  mobile_allowance,
  utility_allowance,
  other_allowances,
  effective_from,
  is_active
)
SELECT 
  e.organization_id,
  e.id as employee_id,
  COALESCE(e.basic_salary, 0) as basic_salary,
  COALESCE(e.accommodation_allowance, 0) as housing_allowance,
  COALESCE(e.food_allowance, 0) as food_allowance,
  COALESCE(e.transportation_allowance, 0) as transport_allowance,
  0 as mobile_allowance,
  0 as utility_allowance,
  0 as other_allowances,
  COALESCE(e.date_of_joining, CURRENT_DATE) as effective_from,
  true as is_active
FROM employees e
WHERE 
  e.is_active = true 
  AND NOT EXISTS (
    SELECT 1 FROM qatar_salary_components qsc 
    WHERE qsc.employee_id = e.id AND qsc.is_active = true
  );
