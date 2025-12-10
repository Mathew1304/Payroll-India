/*
  # Fix Organization Creation RLS Policy
  
  ## Problem
  Users are encountering "new row violates row-level security policy for table 'organizations'" 
  when signing up and trying to create a new organization.
  
  ## Solution
  Ensure that a permissive INSERT policy exists for the `organizations` table 
  that allows authenticated users to create a new organization where they are the owner.
*/

-- Drop potentially conflicting or duplicate policies to be safe
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;

-- Create the specific INSERT policy
CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow insertion if the user is setting themselves as the owner
    owner_id = auth.uid()
  );
