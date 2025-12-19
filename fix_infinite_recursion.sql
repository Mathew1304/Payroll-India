-- URGENT FIX: Remove infinite recursion in user_profiles RLS policies
-- Run this IMMEDIATELY in Supabase SQL Editor

-- First, disable RLS on user_profiles to stop the recursion
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON user_profiles;
DROP POLICY IF EXISTS "Service role full access" ON user_profiles;

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
-- Policy 1: Users can view their own profile (no recursion - direct auth.uid() check)
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy 3: Service role can do everything (for admin operations)
CREATE POLICY "Service role full access"
  ON user_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
