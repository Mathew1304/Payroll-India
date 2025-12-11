-- Migration: Create payroll file generation history
-- Description: Track WPS/SIF file generations with download capability

-- Create payroll_file_generations table
CREATE TABLE IF NOT EXISTS payroll_file_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  payroll_run_id uuid REFERENCES payroll_runs(id) ON DELETE SET NULL,
  
  -- File Information
  file_type text NOT NULL, -- 'WPS_SIF', 'WPS_TXT', 'WPS_CSV', 'SIF'
  file_format text NOT NULL, -- 'sif', 'txt', 'csv'
  file_name text NOT NULL,
  file_path text NOT NULL, -- Supabase Storage path
  file_size integer, -- in bytes
  
  -- Payroll Details
  pay_period_month integer NOT NULL CHECK (pay_period_month >= 1 AND pay_period_month <= 12),
  pay_period_year integer NOT NULL CHECK (pay_period_year >= 2020 AND pay_period_year <= 2100),
  pay_period_start date NOT NULL,
  pay_period_end date NOT NULL,
  
  -- WPS/Employer Details
  employer_id text, -- Qatar ID or establishment ID
  employer_name text,
  
  -- Statistics
  total_employees integer NOT NULL CHECK (total_employees > 0),
  total_amount numeric(15,2) NOT NULL CHECK (total_amount >= 0),
  currency text DEFAULT 'QAR',
  
  -- Validation
  validation_status text DEFAULT 'pending' CHECK (validation_status IN ('pending', 'passed', 'failed', 'warning')),
  validation_errors jsonb DEFAULT '[]',
  validation_warnings jsonb DEFAULT '[]',
  validated_at timestamptz,
  
  -- Metadata
  generated_by uuid NOT NULL,
  generated_at timestamptz DEFAULT now(),
  downloaded_count integer DEFAULT 0,
  last_downloaded_at timestamptz,
  
  -- Status
  is_submitted boolean DEFAULT false,
  submitted_at timestamptz,
  submitted_by uuid,
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_payroll_file_generations_org ON payroll_file_generations(organization_id);
CREATE INDEX idx_payroll_file_generations_period ON payroll_file_generations(pay_period_year, pay_period_month);
CREATE INDEX idx_payroll_file_generations_type ON payroll_file_generations(file_type);
CREATE INDEX idx_payroll_file_generations_status ON payroll_file_generations(validation_status);
CREATE INDEX idx_payroll_file_generations_generated_at ON payroll_file_generations(generated_at DESC);

-- Create updated_at trigger
CREATE TRIGGER update_payroll_file_generations_updated_at
  BEFORE UPDATE ON payroll_file_generations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE payroll_file_generations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Organization members can view their files
CREATE POLICY "Members can view organization files"
  ON payroll_file_generations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = payroll_file_generations.organization_id
        AND user_id = auth.uid()
        AND is_active = true
    )
  );

-- Admins/HR/Finance can create files
CREATE POLICY "Admins can create files"
  ON payroll_file_generations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = payroll_file_generations.organization_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'hr', 'finance')
        AND is_active = true
    )
  );

-- Admins/HR/Finance can update file status
CREATE POLICY "Admins can update files"
  ON payroll_file_generations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = payroll_file_generations.organization_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'hr', 'finance')
        AND is_active = true
    )
  );

-- Admins can delete files
CREATE POLICY "Admins can delete files"
  ON payroll_file_generations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = payroll_file_generations.organization_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'hr')
        AND is_active = true
    )
  );

-- Create storage bucket for payroll files (run this in Supabase Dashboard SQL Editor)
-- Note: Storage bucket creation needs to be done via Dashboard or API
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'payroll-files',
--   'payroll-files',
--   false,
--   10485760, -- 10MB limit per file
--   ARRAY['text/plain', 'text/csv', 'application/octet-stream']
-- );

-- Storage RLS Policies (run after bucket creation)
-- CREATE POLICY "Organization members can view their payroll files"
--   ON storage.objects FOR SELECT
--   TO authenticated
--   USING (
--     bucket_id = 'payroll-files' AND
--     (storage.foldername(name))[1] IN (
--       SELECT organization_id::text FROM organization_members
--       WHERE user_id = auth.uid() AND is_active = true
--     )
--   );

-- CREATE POLICY "Admins can upload payroll files"
--   ON storage.objects FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     bucket_id = 'payroll-files' AND
--     (storage.foldername(name))[1] IN (
--       SELECT organization_id::text FROM organization_members
--       WHERE user_id = auth.uid() 
--         AND role IN ('admin', 'hr', 'finance')
--         AND is_active = true
--     )
--   );

-- CREATE POLICY "Admins can delete payroll files"
--   ON storage.objects FOR DELETE
--   TO authenticated
--   USING (
--     bucket_id = 'payroll-files' AND
--     (storage.foldername(name))[1] IN (
--       SELECT organization_id::text FROM organization_members
--       WHERE user_id = auth.uid() 
--         AND role IN ('admin', 'hr')
--         AND is_active = true
--     )
--   );

-- Add comment
COMMENT ON TABLE payroll_file_generations IS 'Tracks WPS/SIF file generations with download capability and validation status';
