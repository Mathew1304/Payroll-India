/*
  # Fix Recursive User Profiles RLS Policy

  ## Problem
  The previous policies on `user_profiles` were causing infinite recursion because they queried the `user_profiles` table
  within the policy definition itself to check for admin/hr roles.

  ## Solution
  1. Create a secure function `get_auth_user_role()` to fetch the current user's role.
     - Defined as SECURITY DEFINER to bypass RLS when checking the role.
     - Set search_path to public for security.
  2. Replace existing policies with new ones that use this function, eliminating the recursion.
*/

-- Function to get the current user's role safely
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM user_profiles
  WHERE user_id = auth.uid();
  
  RETURN user_role;
END;
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON user_profiles;

-- Re-create policies using the new helper function

-- 1. View own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

-- 2. Admins can view all profiles
-- Using get_auth_user_role() prevents recursion by bypassing RLS during the role check
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    get_auth_user_role() IN ('admin', 'hr', 'finance')
  );

-- 3. Users can update own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. Admins can manage (insert/update/delete) profiles
CREATE POLICY "Admins can manage profiles"
  ON user_profiles FOR ALL
  TO authenticated
  USING (
    get_auth_user_role() = 'admin'
  );
