-- Fix Master Data Constraints to be Organization Scoped
-- This migration replaces global unique constraints with composite constraints (organization_id, code/name)

-- 1. Designations
ALTER TABLE designations DROP CONSTRAINT IF EXISTS designations_code_key;
ALTER TABLE designations DROP CONSTRAINT IF EXISTS designations_title_key;

-- Add new constraints scoped to organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_designations_org_code ON designations(organization_id, code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_designations_org_title ON designations(organization_id, title);

-- 2. Departments
ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_code_key;
ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_name_key;

-- Add new constraints scoped to organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_org_code ON departments(organization_id, code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_org_name ON departments(organization_id, name);

-- 3. Branches
ALTER TABLE branches DROP CONSTRAINT IF EXISTS branches_code_key;

-- Add new constraints scoped to organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_branches_org_code ON branches(organization_id, code);
