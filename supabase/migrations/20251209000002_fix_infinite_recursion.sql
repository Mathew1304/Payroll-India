-- Fix Infinite Recursion on user_profiles
-- The previous error (42P17) indicates a policy on user_profiles is querying user_profiles directly, causing a loop.
-- We must use a SECURITY DEFINER function to break the loop for role checks.

-- 1. Ensure the safe role checking function exists and is robust
CREATE OR REPLACE FUNCTION public.get_user_role_v2()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- bypassing RLS to fetching role safely
  SELECT role::text INTO user_role
  FROM user_profiles
  WHERE user_id = auth.uid();
  
  RETURN user_role;
END;
$$;

-- 2. Drop the problematic recursive policies identified
-- These are the ones likely causing the crash
DROP POLICY IF EXISTS "Super admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can view all subscriptions" ON organization_subscriptions;

-- 3. Re-implement user_profiles policies Safely

-- enable RLS just in case
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- A. Users can ALWAYS view their own profile (simple row check, NO subqueries)
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- B. Super Admins/Admins can view ALL profiles (using SECURITY DEFINER function)
DROP POLICY IF EXISTS "Admins and Super Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins and Super Admins can view all profiles"
ON user_profiles FOR SELECT
TO authenticated
USING (
  get_user_role_v2() IN ('admin', 'super_admin', 'hr', 'finance')
);

-- 4. Fix Organization Policies (using the function)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all organizations"
ON organizations FOR SELECT TO authenticated
USING (
  get_user_role_v2() = 'super_admin'
);

-- 5. Fix Subscription Policies
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all subscriptions"
ON organization_subscriptions FOR SELECT TO authenticated
USING (
  get_user_role_v2() = 'super_admin'
);
