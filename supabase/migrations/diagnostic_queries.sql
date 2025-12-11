-- Diagnostic Queries to Debug 406 Errors
-- Run these queries in Supabase SQL Editor while logged in as the user experiencing the issue

-- Query 1: Check your current user role and IDs
SELECT * FROM user_role_info;

-- Query 2: Check if get_employee_id_from_auth() returns a value
SELECT get_employee_id_from_auth() as my_employee_id;

-- Query 3: Check if get_org_id_from_auth() returns a value  
SELECT get_org_id_from_auth() as my_org_id;

-- Query 4: Check your organization_members record
SELECT 
  id,
  user_id,
  organization_id,
  role,
  employee_id,
  admin_id,
  is_active
FROM organization_members
WHERE user_id = auth.uid();

-- Query 5: Try to select from attendance_records directly
SELECT * FROM attendance_records
WHERE employee_id = get_employee_id_from_auth()
  AND date = CURRENT_DATE;

-- Query 6: Check if the RLS policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'attendance_records'
ORDER BY policyname;
