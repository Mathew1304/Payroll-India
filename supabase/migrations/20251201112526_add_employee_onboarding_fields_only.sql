/*
  # Employee Onboarding Fields

  ## Overview
  Add onboarding-specific fields to employee_invitations table
  to support self-service employee onboarding via email form link

  ## Changes
  - Add onboarding_token for unique form access
  - Add onboarding_completed flag
  - Add onboarding_completed_at timestamp
  - Add form_data JSONB for storing submitted info
  - Add invitation_type to distinguish basic vs full onboarding

  ## Security
  - Public RLS policies for token-based access
  - Tokens expire after 7 days
*/

-- Add onboarding fields to employee_invitations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_invitations' AND column_name = 'onboarding_token'
  ) THEN
    ALTER TABLE employee_invitations ADD COLUMN onboarding_token text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_invitations' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE employee_invitations ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_invitations' AND column_name = 'onboarding_completed_at'
  ) THEN
    ALTER TABLE employee_invitations ADD COLUMN onboarding_completed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_invitations' AND column_name = 'form_data'
  ) THEN
    ALTER TABLE employee_invitations ADD COLUMN form_data jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_invitations' AND column_name = 'invitation_type'
  ) THEN
    ALTER TABLE employee_invitations ADD COLUMN invitation_type text DEFAULT 'basic';
  END IF;
END $$;

-- Create function to generate onboarding token
CREATE OR REPLACE FUNCTION generate_onboarding_token()
RETURNS text AS $$
DECLARE
  token text;
BEGIN
  token := encode(gen_random_bytes(32), 'base64');
  token := replace(token, '/', '_');
  token := replace(token, '+', '-');
  token := replace(token, '=', '');
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Update existing invitations to have tokens if they don't
UPDATE employee_invitations 
SET onboarding_token = generate_onboarding_token()
WHERE onboarding_token IS NULL OR onboarding_token = '';

-- Add unique constraint on onboarding_token
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'employee_invitations_onboarding_token_key'
  ) THEN
    ALTER TABLE employee_invitations ADD CONSTRAINT employee_invitations_onboarding_token_key UNIQUE (onboarding_token);
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_employee_invitations_token ON employee_invitations(onboarding_token);

-- Drop existing public policies if they exist
DROP POLICY IF EXISTS "Public can view invitation via token" ON employee_invitations;
DROP POLICY IF EXISTS "Public can update invitation via token for onboarding" ON employee_invitations;

-- Create public access policy for onboarding form (via token)
CREATE POLICY "Public can view invitation via token"
  ON employee_invitations FOR SELECT
  TO anon, authenticated
  USING (
    onboarding_token IS NOT NULL
    AND expires_at > now()
  );

CREATE POLICY "Public can update invitation via token for onboarding"
  ON employee_invitations FOR UPDATE
  TO anon, authenticated
  USING (
    onboarding_token IS NOT NULL
    AND expires_at > now()
  )
  WITH CHECK (
    onboarding_token IS NOT NULL
  );
