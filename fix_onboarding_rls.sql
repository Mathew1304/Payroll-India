-- Fix RLS policies for employee_invitations to allow onboarding access by token
-- This allows unauthenticated users to access their invitation via onboarding_token

-- Drop the incomplete public verify policy
DROP POLICY IF EXISTS "employee_invitations_public_verify" ON employee_invitations;

-- Create a policy that allows anonymous users to read invitations by onboarding_token
CREATE POLICY "employee_invitations_public_read_by_token"
  ON employee_invitations FOR SELECT
  TO anon, authenticated
  USING (onboarding_token IS NOT NULL);

-- Also allow authenticated users to read invitations in their organization
-- (This complements the existing org_manage policy)
CREATE POLICY "employee_invitations_read_by_org"
  ON employee_invitations FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Ensure employees table allows reading by employee_id for onboarding
-- This is needed for the nested select employee:employees(*)
-- Check if a policy exists that allows reading employee data for onboarding
DO $$
BEGIN
  -- Check if policy exists, if not create one
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'employees' 
    AND policyname = 'employees_read_for_onboarding'
  ) THEN
    -- Allow reading employee data if there's a valid invitation
    CREATE POLICY "employees_read_for_onboarding"
      ON employees FOR SELECT
      TO anon, authenticated
      USING (
        EXISTS (
          SELECT 1 FROM employee_invitations 
          WHERE employee_invitations.employee_id = employees.id 
          AND employee_invitations.onboarding_token IS NOT NULL
        )
      );
  END IF;
END $$;

