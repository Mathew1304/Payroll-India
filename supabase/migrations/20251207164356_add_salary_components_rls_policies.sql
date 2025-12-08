/*
  # Add RLS Policies for Salary Components Tables
  
  1. Tables Affected
    - `qatar_salary_components` - Qatar salary component records
    - `saudi_salary_components` - Saudi Arabia salary component records
  
  2. Policies Added
    ### Qatar Salary Components
    - SELECT: Organization members can view salary components for employees in their organization
    - INSERT: Admin/HR/Finance can create salary components
    - UPDATE: Admin/HR/Finance can update salary components
    - DELETE: Admin/HR/Finance can delete salary components
    
    ### Saudi Salary Components
    - SELECT: Organization members can view salary components for employees in their organization
    - INSERT: Admin/HR/Finance can create salary components
    - UPDATE: Admin/HR/Finance can update salary components
    - DELETE: Admin/HR/Finance can delete salary components
  
  3. Security
    - All policies verify organization membership
    - Write operations restricted to Admin, HR, and Finance roles
    - Employees can view their own salary components
*/

-- ============================================
-- QATAR SALARY COMPONENTS POLICIES
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view salary components in their organization" ON qatar_salary_components;
DROP POLICY IF EXISTS "Admin/HR/Finance can insert salary components" ON qatar_salary_components;
DROP POLICY IF EXISTS "Admin/HR/Finance can update salary components" ON qatar_salary_components;
DROP POLICY IF EXISTS "Admin/HR/Finance can delete salary components" ON qatar_salary_components;

-- SELECT: Organization members can view salary components
CREATE POLICY "Users can view salary components in their organization"
  ON qatar_salary_components
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = qatar_salary_components.organization_id
      AND om.user_id = auth.uid()
      AND om.is_active = true
    )
  );

-- INSERT: Admin/HR/Finance can create salary components
CREATE POLICY "Admin/HR/Finance can insert salary components"
  ON qatar_salary_components
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = qatar_salary_components.organization_id
      AND om.user_id = auth.uid()
      AND om.is_active = true
      AND om.role IN ('admin', 'hr', 'finance')
    )
  );

-- UPDATE: Admin/HR/Finance can update salary components
CREATE POLICY "Admin/HR/Finance can update salary components"
  ON qatar_salary_components
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = qatar_salary_components.organization_id
      AND om.user_id = auth.uid()
      AND om.is_active = true
      AND om.role IN ('admin', 'hr', 'finance')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = qatar_salary_components.organization_id
      AND om.user_id = auth.uid()
      AND om.is_active = true
      AND om.role IN ('admin', 'hr', 'finance')
    )
  );

-- DELETE: Admin/HR/Finance can delete salary components
CREATE POLICY "Admin/HR/Finance can delete salary components"
  ON qatar_salary_components
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = qatar_salary_components.organization_id
      AND om.user_id = auth.uid()
      AND om.is_active = true
      AND om.role IN ('admin', 'hr', 'finance')
    )
  );

-- ============================================
-- SAUDI SALARY COMPONENTS POLICIES
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view saudi salary components in their organization" ON saudi_salary_components;
DROP POLICY IF EXISTS "Admin/HR/Finance can insert saudi salary components" ON saudi_salary_components;
DROP POLICY IF EXISTS "Admin/HR/Finance can update saudi salary components" ON saudi_salary_components;
DROP POLICY IF EXISTS "Admin/HR/Finance can delete saudi salary components" ON saudi_salary_components;

-- SELECT: Organization members can view salary components
CREATE POLICY "Users can view saudi salary components in their organization"
  ON saudi_salary_components
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = saudi_salary_components.organization_id
      AND om.user_id = auth.uid()
      AND om.is_active = true
    )
  );

-- INSERT: Admin/HR/Finance can create salary components
CREATE POLICY "Admin/HR/Finance can insert saudi salary components"
  ON saudi_salary_components
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = saudi_salary_components.organization_id
      AND om.user_id = auth.uid()
      AND om.is_active = true
      AND om.role IN ('admin', 'hr', 'finance')
    )
  );

-- UPDATE: Admin/HR/Finance can update salary components
CREATE POLICY "Admin/HR/Finance can update saudi salary components"
  ON saudi_salary_components
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = saudi_salary_components.organization_id
      AND om.user_id = auth.uid()
      AND om.is_active = true
      AND om.role IN ('admin', 'hr', 'finance')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = saudi_salary_components.organization_id
      AND om.user_id = auth.uid()
      AND om.is_active = true
      AND om.role IN ('admin', 'hr', 'finance')
    )
  );

-- DELETE: Admin/HR/Finance can delete salary components
CREATE POLICY "Admin/HR/Finance can delete saudi salary components"
  ON saudi_salary_components
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = saudi_salary_components.organization_id
      AND om.user_id = auth.uid()
      AND om.is_active = true
      AND om.role IN ('admin', 'hr', 'finance')
    )
  );