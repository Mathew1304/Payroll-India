/*
  # Fix User Profiles Recursion V3 (Comprehensive Cleanup)
  
  ## Problem
  - Infinite recursion (Error 42P17) on `user_profiles`.
  - Lingering "Allow authenticated access" policy from early migrations.
  - "Super admins can view all profiles" policy might exist and needs to be handled safely.
  
  ## Solution
  1. Create `get_user_role_v2()` (SECURITY DEFINER) to safely fetch roles.
  2. AGGRESSIVELY drop all known past policies on `user_profiles` to ensure a clean slate.
  3. Recreate strict, non-recursive policies.
     - "Users can view own profile": Direct `auth.uid()` check (No function call).
     - "Admins and Super Admins can view all": Uses `get_user_role_v2()`.
  
  ## Super Admin Support
  - Since `user_role` enum might not have 'super_admin', we handle it by checking if the role matches 'admin' 
    OR if the text representation matches 'super_admin' (future-proofing).
*/

-- 1. Create a V2 function to ensure clean slate and correct SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_user_role_v2()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- This query runs as the function owner (superuser), bypassing RLS
  SELECT role::text INTO user_role
  FROM user_profiles
  WHERE user_id = auth.uid();
  
  RETURN user_role;
END;
$$;

-- 2. Clean up user_profiles policies (Aggressive Delete)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON user_profiles;

-- Drop legacy broad policies
DROP POLICY IF EXISTS "Allow authenticated access" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- 3. Recreate Policies

-- Base Policy: View own profile (No function dependency to avoid cycles)
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

-- Admin & Super Admin Policy: View all profiles
CREATE POLICY "Admins and Super Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    get_user_role_v2() IN ('admin', 'hr', 'finance', 'super_admin')
  );

-- Update own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin Manage Policy
CREATE POLICY "Admins can manage profiles"
  ON user_profiles FOR ALL
  TO authenticated
  USING (
    get_user_role_v2() IN ('admin', 'super_admin')
  );
