/*
  # Fix get_auth_employee_id Function
  
  ## Problem
  The `get_auth_employee_id()` function currently relies solely on `user_profiles.employee_id`.
  However, in many flows (like "Add Employee" or "Invite"), the `employee_id` is linked in `organization_members` 
  but might not be synced to `user_profiles` (or `user_profiles` might be null/outdated).
  
  This causes RLS policies on `employees` table (which use this function) to fail (return null), 
  preventing employees from viewing their own profiles even if they are correctly linked in `organization_members`.
  
  ## Solution
  Update `get_auth_employee_id()` to:
  1. Get `current_organization_id` from `user_profiles`.
  2. Fetch `employee_id` from `organization_members` for that organization.
  3. Fallback to `user_profiles.employee_id` if needed.
*/

CREATE OR REPLACE FUNCTION public.get_auth_employee_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp_id uuid;
  current_org_id uuid;
BEGIN
  -- Get current organization from user_profiles
  SELECT current_organization_id INTO current_org_id 
  FROM user_profiles 
  WHERE user_id = auth.uid();
  
  IF current_org_id IS NOT NULL THEN
    -- Get employee_id for this organization
    SELECT employee_id INTO emp_id 
    FROM organization_members 
    WHERE user_id = auth.uid() AND organization_id = current_org_id;
  END IF;
  
  -- Fallback if no current org or no member record (legacy/global)
  IF emp_id IS NULL THEN
    SELECT employee_id INTO emp_id FROM user_profiles WHERE user_id = auth.uid();
  END IF;
  
  RETURN emp_id;
END;
$$;
