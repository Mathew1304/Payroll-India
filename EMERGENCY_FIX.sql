-- ============================================================
-- EMERGENCY FIX - RUN THIS IN SUPABASE SQL EDITOR
-- This will fix the RLS recursion AND set your role to admin
-- ============================================================

-- Step 1: Temporarily disable RLS on user_profiles
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Update your profile to admin (using your email)
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'pixelfactory13@gmail.com';

-- Step 3: Create the helper function
CREATE OR REPLACE FUNCTION get_auth_user_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Step 4: Drop ALL policies on user_profiles
DROP POLICY IF EXISTS "users_can_view_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "users_can_view_org_profiles" ON user_profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON user_profiles;

-- Step 5: Create simple, non-recursive policies
CREATE POLICY "users_can_view_own_profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    organization_id = get_auth_user_org_id()
  );

CREATE POLICY "users_can_update_own_profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users_can_insert_own_profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Step 6: Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Done! You should see "Success"
SELECT 'RLS Fixed! Reload your app now.' as message;
