/*
  # Add country field to organizations

  1. Updates
    - Add country field to organizations table
    - Default to 'India' for existing organizations
    
  2. Notes
    - This enables country-specific workflows
    - Qatar workflow will be triggered when country = 'Qatar'
*/

-- Add country field to organizations
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'country'
  ) THEN
    ALTER TABLE organizations ADD COLUMN country text DEFAULT 'India';
  END IF;
END $$;
