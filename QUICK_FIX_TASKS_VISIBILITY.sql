-- QUICK FIX: Run this in Supabase SQL Editor to immediately fix tasks visibility
-- This script fixes the issue where employees can't see tasks assigned to them

-- 1. First, let's check the current state
SELECT 
  'DIAGNOSIS: User Profile Check' as info,
  e.id as employee_id,
  e.employee_code,
  e.first_name,
  e.last_name,
  e.organization_id as employee_org_id,
  e.user_id,
  up.organization_id as profile_org_id,
  up.role,
  CASE 
    WHEN up.organization_id IS NULL THEN '❌ NULL - NEEDS FIX'
    WHEN e.organization_id = up.organization_id THEN '✅ MATCH'
    ELSE '⚠️ MISMATCH - NEEDS FIX'
  END as status
FROM employees e
LEFT JOIN user_profiles up ON up.employee_id = e.id
WHERE e.is_active = true
  AND e.user_id IS NOT NULL
ORDER BY e.first_name;

-- 2. Fix all user_profiles that have missing or incorrect organization_id
UPDATE user_profiles up
SET organization_id = e.organization_id,
    updated_at = now()
FROM employees e
WHERE up.employee_id = e.id
  AND (up.organization_id IS NULL OR up.organization_id != e.organization_id);

-- 3. Verify the fix
SELECT 
  'AFTER FIX: User Profile Check' as info,
  e.id as employee_id,
  e.employee_code,
  e.first_name,
  e.last_name,
  e.organization_id as employee_org_id,
  up.organization_id as profile_org_id,
  CASE 
    WHEN e.organization_id = up.organization_id THEN '✅ FIXED'
    ELSE '❌ STILL BROKEN'
  END as status
FROM employees e
LEFT JOIN user_profiles up ON up.employee_id = e.id
WHERE e.is_active = true
  AND e.user_id IS NOT NULL
ORDER BY e.first_name;

-- 4. Check tasks for the specific employee from the logs
SELECT 
  'Tasks for Employee: dea84837-2d36-432c-a226-ad050dfe38c9' as info,
  t.id,
  t.title,
  t.status,
  t.priority,
  t.due_date,
  t.organization_id,
  t.assigned_to,
  e.first_name || ' ' || e.last_name as assigned_to_name
FROM tasks t
LEFT JOIN employees e ON e.id = t.assigned_to
WHERE t.assigned_to = 'dea84837-2d36-432c-a226-ad050dfe38c9';

-- 5. Test the RLS policy manually
-- This simulates what happens when the employee queries tasks
SELECT 
  'RLS Test: Can employee see their tasks?' as info,
  t.id,
  t.title,
  t.organization_id as task_org,
  up.organization_id as user_org,
  CASE 
    WHEN t.organization_id = up.organization_id THEN '✅ VISIBLE'
    ELSE '❌ HIDDEN BY RLS'
  END as rls_status
FROM tasks t
CROSS JOIN user_profiles up
WHERE t.assigned_to = 'dea84837-2d36-432c-a226-ad050dfe38c9'
  AND up.employee_id = 'dea84837-2d36-432c-a226-ad050dfe38c9';

-- 6. Summary report
SELECT 
  '=== SUMMARY REPORT ===' as report,
  (SELECT COUNT(*) FROM user_profiles WHERE organization_id IS NULL) as profiles_with_null_org,
  (SELECT COUNT(*) 
   FROM employees e 
   LEFT JOIN user_profiles up ON up.employee_id = e.id 
   WHERE e.organization_id != up.organization_id 
     AND e.user_id IS NOT NULL) as profiles_with_wrong_org,
  (SELECT COUNT(*) FROM tasks WHERE assigned_to = 'dea84837-2d36-432c-a226-ad050dfe38c9') as tasks_assigned_to_employee;

