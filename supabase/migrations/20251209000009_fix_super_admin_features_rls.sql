/*
  # Fix Super Admin RLS for Organization Features
  
  ## Problem
  The existing RLS policy for `organization_features` prevents global Super Admins from updating features 
  unless they are also members of that specific organization.
  
  ## Solution
  Add a specific policy allowing users with 'super_admin' role (via `get_auth_user_role()`) 
  to view and manage ALL organization features.
*/

-- Drop existing restricted policy if it conflicts (optional, but adding a new permissive one is safer)
-- We will just add a new policy. Multiple permissive policies are OR-ed together.

CREATE POLICY "Super admins can manage all organization features"
  ON organization_features
  FOR ALL
  TO authenticated
  USING (
    get_auth_user_role() = 'super_admin'
  )
  WITH CHECK (
    get_auth_user_role() = 'super_admin'
  );
