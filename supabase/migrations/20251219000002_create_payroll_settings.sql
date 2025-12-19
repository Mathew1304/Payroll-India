-- Create payroll_settings table for global configuration
CREATE TABLE IF NOT EXISTS public.payroll_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Global Toggles
  pf_enabled boolean DEFAULT true,
  esi_enabled boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id)
);

-- Enable RLS
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "payroll_settings_view_org"
  ON public.payroll_settings FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "payroll_settings_manage_admin"
  ON public.payroll_settings FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_payroll_settings_updated_at ON payroll_settings;
CREATE TRIGGER update_payroll_settings_updated_at 
  BEFORE UPDATE ON payroll_settings 
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
