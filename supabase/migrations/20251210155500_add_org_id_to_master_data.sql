-- Add organization_id to departments
ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Add organization_id to designations
ALTER TABLE designations 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Add organization_id to branches
ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Enable RLS if not already enabled (good practice)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- Create policies to ensure organization isolation
-- Departments
CREATE POLICY "Users can view departments of their organization" ON departments
  FOR SELECT USING (organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Admins can manage departments of their organization" ON departments
  FOR ALL USING (organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'hr') LIMIT 1));

-- Designations
CREATE POLICY "Users can view designations of their organization" ON designations
  FOR SELECT USING (organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Admins can manage designations of their organization" ON designations
  FOR ALL USING (organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'hr') LIMIT 1));

-- Branches
CREATE POLICY "Users can view branches of their organization" ON branches
  FOR SELECT USING (organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Admins can manage branches of their organization" ON branches
  FOR ALL USING (organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'hr') LIMIT 1));
