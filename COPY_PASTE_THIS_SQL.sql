-- ============================================================
-- COPY THIS ENTIRE FILE AND PASTE INTO SUPABASE SQL EDITOR
-- Then click RUN
-- ============================================================

-- Step 1: Create helper function
CREATE OR REPLACE FUNCTION get_auth_user_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Step 2: Drop old policies
DROP POLICY IF EXISTS "users_can_view_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;

-- Step 3: Create new non-recursive policy
CREATE POLICY "users_can_view_own_profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    organization_id = get_auth_user_org_id()
  );

-- Done! You should see "Success. No rows returned"
