-- ============================================================
-- CREATE MISSING TABLES
-- Run this in Supabase SQL Editor after the EMERGENCY_FIX.sql
-- ============================================================

-- Table: organization_features
CREATE TABLE IF NOT EXISTS organization_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, feature_key)
);

-- Enable RLS
ALTER TABLE organization_features ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "org_members_can_view_features" ON organization_features;
CREATE POLICY "org_members_can_view_features"
  ON organization_features FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "org_admins_can_manage_features" ON organization_features;
CREATE POLICY "org_admins_can_manage_features"
  ON organization_features FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Table: expense_claims (alias for expenses table)
-- Check if expenses table exists, if not create expense_claims
CREATE TABLE IF NOT EXISTS expense_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  claim_number text,
  category_id uuid REFERENCES expense_categories(id),
  
  expense_date date NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency text DEFAULT 'INR',
  
  description text,
  merchant_name text,
  
  -- Receipt
  receipt_url text,
  
  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'reimbursed')),
  
  -- Approval
  approved_by uuid REFERENCES employees(id),
  approved_at timestamptz,
  rejection_reason text,
  
  -- Reimbursement
  reimbursed_at date,
  reimbursement_reference text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE expense_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "expense_claims_view_own" ON expense_claims;
CREATE POLICY "expense_claims_view_own"
  ON expense_claims FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "expense_claims_employees_create" ON expense_claims;
CREATE POLICY "expense_claims_employees_create"
  ON expense_claims FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "expense_claims_manage" ON expense_claims;
CREATE POLICY "expense_claims_manage"
  ON expense_claims FOR UPDATE
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  );

-- Insert default features for your organization
INSERT INTO organization_features (organization_id, feature_key, is_enabled)
SELECT 'c004bb9d-4d1f-4d8b-9fb8-20ef0b3de7fb'::uuid, feature_key, true
FROM (VALUES 
  ('attendance'),
  ('leave'),
  ('expenses'),
  ('tasks'),
  ('performance'),
  ('training'),
  ('work-reports'),
  ('helpdesk')
) AS features(feature_key)
ON CONFLICT (organization_id, feature_key) DO NOTHING;

SELECT 'Missing tables created successfully!' as message;
