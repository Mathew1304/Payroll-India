-- CRITICAL SECURITY FIX: Add organization_id to leave_types table
-- This prevents cross-organization data leakage in leave management

-- Step 1: Add organization_id column to leave_types if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leave_types' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE leave_types ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 2: For existing leave types without organization_id, assign them to organizations
-- This handles migration of existing data
UPDATE leave_types
SET organization_id = (SELECT id FROM organizations LIMIT 1)
WHERE organization_id IS NULL;

-- Step 3: Make organization_id NOT NULL after backfilling
ALTER TABLE leave_types ALTER COLUMN organization_id SET NOT NULL;

-- Step 4: Drop the old UNIQUE constraint on name and code
ALTER TABLE leave_types DROP CONSTRAINT IF EXISTS leave_types_name_key;
ALTER TABLE leave_types DROP CONSTRAINT IF EXISTS leave_types_code_key;

-- Step 5: Add new composite UNIQUE constraints scoped to organization
ALTER TABLE leave_types ADD CONSTRAINT leave_types_org_name_key UNIQUE (organization_id, name);
ALTER TABLE leave_types ADD CONSTRAINT leave_types_org_code_key UNIQUE (organization_id, code);

-- Step 6: Update RLS policies for leave_types
DROP POLICY IF EXISTS "Authenticated users can view leave types" ON leave_types;
DROP POLICY IF EXISTS "HR and Admins can manage leave types" ON leave_types;

-- Users can only view leave types from their organization
CREATE POLICY "Users can view org leave types" ON leave_types
  FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
  );

-- Admins can manage leave types in their organization
CREATE POLICY "Admins can manage org leave types" ON leave_types
  FOR ALL
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
    AND EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'hr'))
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
    AND EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'hr'))
  );

-- Step 7: Update RLS policies for leave_applications to ensure organization scoping
DROP POLICY IF EXISTS "Employees view own applications" ON leave_applications;
DROP POLICY IF EXISTS "Admins view org leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Employees create own applications" ON leave_applications;
DROP POLICY IF EXISTS "Admins update org leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Employees update own pending applications" ON leave_applications;
DROP POLICY IF EXISTS "Employees delete own pending applications" ON leave_applications;

-- Employees can view their own applications
CREATE POLICY "Employees view own applications" ON leave_applications
  FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
  );

-- Admins can view all applications in their organization
CREATE POLICY "Admins view org leave applications" ON leave_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM organization_members om
      JOIN employees e ON e.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
        AND om.role IN ('admin', 'super_admin', 'hr', 'manager')
        AND e.id = leave_applications.employee_id
    )
  );

-- Employees can create their own applications (organization check via employee)
CREATE POLICY "Employees create own applications" ON leave_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
  );

-- Admins can update applications in their organization
CREATE POLICY "Admins update org leave applications" ON leave_applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM organization_members om
      JOIN employees e ON e.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
        AND om.role IN ('admin', 'super_admin', 'hr', 'manager')
        AND e.id = leave_applications.employee_id
    )
  );

-- Employees can update their own pending applications
CREATE POLICY "Employees update own pending applications" ON leave_applications
  FOR UPDATE
  TO authenticated
  USING (
    employee_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
    AND status = 'pending'
  );

-- Employees can delete their own pending applications
CREATE POLICY "Employees delete own pending applications" ON leave_applications
  FOR DELETE
  TO authenticated
  USING (
    employee_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
    AND status = 'pending'
  );
