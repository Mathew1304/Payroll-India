/*
  # Fix Leave Types Organization ID
  
  ## Problem
  `leave_types` and related tables are missing `organization_id`, causing 400 errors when filtered by organization in the frontend.
  `salary_components` and `salary_structures` also need `organization_id` for multi-tenancy.
  
  ## Solution
  1. Add `organization_id` column to:
     - `leave_types`
     - `leave_policies`
     - `leave_balances`
     - `salary_components`
     - `salary_structures`
  2. Backfill `organization_id` based on existing relations or default to the first organization.
*/

-- 1. Add columns
DO $$
BEGIN
  -- Leave Types
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_types' AND column_name = 'organization_id') THEN
    ALTER TABLE leave_types ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Leave Policies
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_policies' AND column_name = 'organization_id') THEN
    ALTER TABLE leave_policies ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Leave Balances
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_balances' AND column_name = 'organization_id') THEN
    ALTER TABLE leave_balances ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  
  -- Salary Components
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salary_components' AND column_name = 'organization_id') THEN
    ALTER TABLE salary_components ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Salary Structures
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salary_structures' AND column_name = 'organization_id') THEN
    ALTER TABLE salary_structures ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Backfill Data

DO $$
DECLARE
  default_org_id uuid;
BEGIN
  -- Get a default organization (the first one found) to assign orphaned types to
  SELECT id INTO default_org_id FROM organizations LIMIT 1;

  -- Backfill Leave Balances (Infer from Employee)
  UPDATE leave_balances lb
  SET organization_id = e.organization_id
  FROM employees e
  WHERE lb.employee_id = e.id
  AND lb.organization_id IS NULL;

  -- Backfill Salary Structures (Infer from Employee)
  UPDATE salary_structures ss
  SET organization_id = e.organization_id
  FROM employees e
  WHERE ss.employee_id = e.id
  AND ss.organization_id IS NULL;

  -- Backfill Leave Types (Assign to default org if NULL)
  -- Ideally, specific types belong to specific orgs, but without a link, we assign to default.
  IF default_org_id IS NOT NULL THEN
    UPDATE leave_types SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE leave_policies SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE salary_components SET organization_id = default_org_id WHERE organization_id IS NULL;
  END IF;
END $$;

-- 3. Update RLS Policies to use organization_id

-- Leave Types
DROP POLICY IF EXISTS "Authenticated users can view leave types" ON leave_types;
CREATE POLICY "Authenticated users can view leave types"
  ON leave_types FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM employees WHERE id = get_auth_employee_id())
    AND is_active = true
  );

-- Leave Policies
DROP POLICY IF EXISTS "Authenticated users can view leave policies" ON leave_policies;
CREATE POLICY "Authenticated users can view leave policies"
  ON leave_policies FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM employees WHERE id = get_auth_employee_id())
    AND is_active = true
  );

-- Salary Components
DROP POLICY IF EXISTS "Users can view salary components" ON salary_components;
CREATE POLICY "Users can view salary components"
  ON salary_components FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM employees WHERE id = get_auth_employee_id())
    AND is_active = true
  );
