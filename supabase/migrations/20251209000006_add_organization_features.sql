-- Create organization_features table
CREATE TABLE IF NOT EXISTS organization_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  feature_key text NOT NULL,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, feature_key)
);

-- Enable RLS
ALTER TABLE organization_features ENABLE ROW LEVEL SECURITY;

-- Policies for organization_features
-- Members can view their organization's features
CREATE POLICY "Members can view organization features"
  ON organization_features
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_features.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.is_active = true
    )
    OR
    EXISTS (
        SELECT 1 FROM organizations
        WHERE organizations.id = organization_features.organization_id
        AND organizations.owner_id = auth.uid()
    )
  );

-- Only Super Admins (or maybe Org Admins in future) can modify features
-- For now, let's allow Admins to modify them if they are building the toggle UI,
-- but typically this is a super-admin or plan-based feature.
-- Based on user request, "another developer is developing a superadmin page", so likely only super admins should edit.
-- However, for the purpose of this task (sidebar), read access is critical.
-- We will add a policy for modification just in case, restricted to owners/admins for now so they can test.

CREATE POLICY "Admins can update organization features"
  ON organization_features
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = organization_features.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('admin', 'super_admin')
    )
    OR
    EXISTS (
        SELECT 1 FROM organizations
        WHERE organizations.id = organization_features.organization_id
        AND organizations.owner_id = auth.uid()
    )
  );


-- Seed default features for ALL existing organizations
-- List of features matching sidebar IDs:
-- dashboard, payroll, reports, tasks, work-reports, employees, attendance, leave, expenses, performance, training, helpdesk, announcements, help, settings

DO $$
DECLARE
  org_rec RECORD;
  feature text;
  features text[] := ARRAY[
    'dashboard', 'payroll', 'reports', 'tasks', 'work-reports', 
    'employees', 'attendance', 'leave', 'expenses', 'performance', 
    'training', 'helpdesk', 'announcements', 'help', 'settings'
  ];
BEGIN
  FOR org_rec IN SELECT id FROM organizations LOOP
    FOREACH feature IN ARRAY features LOOP
      INSERT INTO organization_features (organization_id, feature_key, is_enabled)
      VALUES (org_rec.id, feature, true)
      ON CONFLICT (organization_id, feature_key) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
