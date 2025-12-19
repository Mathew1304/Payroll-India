-- EMERGENCY FIX: Complete reset of user_profiles RLS
-- This will completely disable and recreate all policies from scratch

-- Step 1: Disable RLS completely
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL policies (including any we might have missed)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_profiles';
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create ONLY simple, non-recursive policies

-- Policy 1: Users can view their own profile (SIMPLE - no subquery)
CREATE POLICY "user_profiles_select_own"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: Users can update their own profile (SIMPLE - no subquery)
CREATE POLICY "user_profiles_update_own"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy 3: Service role has full access (for backend operations)
CREATE POLICY "user_profiles_service_role"
  ON user_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
