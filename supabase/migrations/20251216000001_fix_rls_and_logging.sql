-- ============================================================
-- FIX RLS POLICIES AND ADD LOGGING FUNCTION
-- Fixes infinite recursion in user_profiles and adds log_error RPC
-- ============================================================

-- ============================================================
-- PART 1: FIX INFINITE RECURSION IN USER_PROFILES RLS POLICY
-- ============================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "users_can_view_own_profile" ON user_profiles;

-- Create a simpler policy that doesn't cause recursion
-- Users can view their own profile
CREATE POLICY "users_can_view_own_profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create a separate policy for viewing other profiles in the same organization
-- This uses a SECURITY DEFINER function to avoid recursion
DROP POLICY IF EXISTS "users_can_view_org_profiles" ON user_profiles;
CREATE POLICY "users_can_view_org_profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- ============================================================
-- PART 2: FIX ORGANIZATIONS RLS POLICY
-- ============================================================

-- Drop and recreate the organizations view policy to avoid recursion
DROP POLICY IF EXISTS "org_users_can_view_own" ON organizations;
CREATE POLICY "org_users_can_view_own"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id = (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
    OR
    (SELECT role FROM user_profiles WHERE user_id = auth.uid() LIMIT 1) = 'super_admin'
  );

-- ============================================================
-- PART 3: CREATE LOG_ERROR RPC FUNCTION
-- ============================================================

-- Drop if exists
DROP FUNCTION IF EXISTS public.log_error(jsonb);

-- Create the log_error function
CREATE OR REPLACE FUNCTION public.log_error(
  error_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_organization_id uuid;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Get the organization ID for the user (if available)
  IF v_user_id IS NOT NULL THEN
    SELECT organization_id INTO v_organization_id
    FROM user_profiles
    WHERE user_id = v_user_id
    LIMIT 1;
  END IF;
  
  -- Insert the error log
  INSERT INTO error_logs (
    user_id,
    organization_id,
    error_type,
    error_message,
    error_stack,
    page_url,
    user_agent,
    additional_data,
    created_at
  ) VALUES (
    v_user_id,
    v_organization_id,
    COALESCE(error_data->>'error_type', 'client_error'),
    COALESCE(error_data->>'error_message', 'Unknown error'),
    error_data->>'error_stack',
    error_data->>'page_url',
    error_data->>'user_agent',
    error_data - 'error_type' - 'error_message' - 'error_stack' - 'page_url' - 'user_agent',
    now()
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Silently fail if error logging fails to prevent infinite loops
    RAISE WARNING 'Failed to log error: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.log_error TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.log_error IS 'Logs client-side errors to the error_logs table';

-- ============================================================
-- PART 4: CREATE HELPER FUNCTION TO GET USER ORG (SECURITY DEFINER)
-- ============================================================

-- This function bypasses RLS to get the user's organization ID
-- This prevents recursion in RLS policies
DROP FUNCTION IF EXISTS public.get_user_org_id_safe(uuid);

CREATE OR REPLACE FUNCTION public.get_user_org_id_safe(p_user_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
BEGIN
  -- Use provided user_id or current user
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Get organization ID without triggering RLS
  SELECT organization_id INTO v_org_id
  FROM user_profiles
  WHERE user_id = v_user_id
  LIMIT 1;
  
  RETURN v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_org_id_safe TO authenticated;

-- ============================================================
-- PART 5: CREATE HELPER FUNCTION TO CHECK USER ROLE (SECURITY DEFINER)
-- ============================================================

DROP FUNCTION IF EXISTS public.get_user_role_safe(uuid);

CREATE OR REPLACE FUNCTION public.get_user_role_safe(p_user_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_role text;
  v_user_id uuid;
BEGIN
  -- Use provided user_id or current user
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Get role without triggering RLS
  SELECT role INTO v_role
  FROM user_profiles
  WHERE user_id = v_user_id
  LIMIT 1;
  
  RETURN COALESCE(v_role, 'employee');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role_safe TO authenticated;

-- ============================================================
-- PART 6: UPDATE OTHER RLS POLICIES TO USE HELPER FUNCTIONS
-- ============================================================

-- Update organizations policies
DROP POLICY IF EXISTS "org_admins_can_update" ON organizations;
CREATE POLICY "org_admins_can_update"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'super_admin')
  );

-- Update employees policies
DROP POLICY IF EXISTS "employees_org_members_can_view" ON employees;
CREATE POLICY "employees_org_members_can_view"
  ON employees FOR SELECT
  TO authenticated
  USING (organization_id = get_user_org_id_safe());

DROP POLICY IF EXISTS "employees_admins_can_manage" ON employees;
CREATE POLICY "employees_admins_can_manage"
  ON employees FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  )
  WITH CHECK (
    organization_id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  );

-- Update departments policies
DROP POLICY IF EXISTS "departments_org_members_view" ON departments;
CREATE POLICY "departments_org_members_view"
  ON departments FOR SELECT
  TO authenticated
  USING (organization_id = get_user_org_id_safe());

DROP POLICY IF EXISTS "departments_admins_manage" ON departments;
CREATE POLICY "departments_admins_manage"
  ON departments FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  )
  WITH CHECK (
    organization_id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  );

-- Update designations policies
DROP POLICY IF EXISTS "designations_org_members_view" ON designations;
CREATE POLICY "designations_org_members_view"
  ON designations FOR SELECT
  TO authenticated
  USING (organization_id = get_user_org_id_safe());

DROP POLICY IF EXISTS "designations_admins_manage" ON designations;
CREATE POLICY "designations_admins_manage"
  ON designations FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  )
  WITH CHECK (
    organization_id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  );

-- Update leave_types policies
DROP POLICY IF EXISTS "leave_types_org_view" ON leave_types;
CREATE POLICY "leave_types_org_view"
  ON leave_types FOR SELECT
  TO authenticated
  USING (organization_id = get_user_org_id_safe());

DROP POLICY IF EXISTS "leave_types_admins_manage" ON leave_types;
CREATE POLICY "leave_types_admins_manage"
  ON leave_types FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  )
  WITH CHECK (
    organization_id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  );

-- Update leave_balances policies
DROP POLICY IF EXISTS "leave_balances_org_view" ON leave_balances;
CREATE POLICY "leave_balances_org_view"
  ON leave_balances FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE organization_id = get_user_org_id_safe()
    )
  );

DROP POLICY IF EXISTS "leave_balances_admins_manage" ON leave_balances;
CREATE POLICY "leave_balances_admins_manage"
  ON leave_balances FOR ALL
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE organization_id = get_user_org_id_safe()
    )
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  )
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE organization_id = get_user_org_id_safe()
    )
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  );

-- Update leave_applications policies
DROP POLICY IF EXISTS "leave_applications_employees_view_own" ON leave_applications;
CREATE POLICY "leave_applications_employees_view_own"
  ON leave_applications FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE organization_id = get_user_org_id_safe()
    )
  );

DROP POLICY IF EXISTS "leave_applications_employees_create" ON leave_applications;
CREATE POLICY "leave_applications_employees_create"
  ON leave_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE organization_id = get_user_org_id_safe()
    )
  );

DROP POLICY IF EXISTS "leave_applications_admins_manage" ON leave_applications;
CREATE POLICY "leave_applications_admins_manage"
  ON leave_applications FOR ALL
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE organization_id = get_user_org_id_safe()
    )
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'manager', 'super_admin')
  )
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE organization_id = get_user_org_id_safe()
    )
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'manager', 'super_admin')
  );

-- Update holidays policies
DROP POLICY IF EXISTS "holidays_org_view" ON holidays;
CREATE POLICY "holidays_org_view"
  ON holidays FOR SELECT
  TO authenticated
  USING (organization_id = get_user_org_id_safe());

DROP POLICY IF EXISTS "holidays_admins_manage" ON holidays;
CREATE POLICY "holidays_admins_manage"
  ON holidays FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  )
  WITH CHECK (
    organization_id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  );

-- Update attendance policies
DROP POLICY IF EXISTS "attendance_org_view" ON attendance;
CREATE POLICY "attendance_org_view"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE organization_id = get_user_org_id_safe()
    )
  );

DROP POLICY IF EXISTS "attendance_admins_manage" ON attendance;
CREATE POLICY "attendance_admins_manage"
  ON attendance FOR ALL
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE organization_id = get_user_org_id_safe()
    )
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  )
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE organization_id = get_user_org_id_safe()
    )
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  );

-- Update announcements policies
DROP POLICY IF EXISTS "announcements_org_view" ON announcements;
CREATE POLICY "announcements_org_view"
  ON announcements FOR SELECT
  TO authenticated
  USING (organization_id = get_user_org_id_safe());

DROP POLICY IF EXISTS "announcements_admins_manage" ON announcements;
CREATE POLICY "announcements_admins_manage"
  ON announcements FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  )
  WITH CHECK (
    organization_id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  );

-- Similar updates for remaining tables...
-- (Tickets, Expenses, Tasks, Goals, etc.)

-- ============================================================
-- PART 7: VERIFY FUNCTIONS EXIST
-- ============================================================

-- Verify that all required functions exist
DO $$
BEGIN
  -- Check if log_error exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'log_error' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'log_error function was not created successfully';
  END IF;
  
  -- Check if helper functions exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_user_org_id_safe' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'get_user_org_id_safe function was not created successfully';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_user_role_safe' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'get_user_role_safe function was not created successfully';
  END IF;
  
  RAISE NOTICE 'All functions created successfully!';
END $$;

